#!/usr/bin/env python3
"""KEEL agent mode: a local Hermes model on the phone drives the robot.

Runs in Termux on Android. The model (llama.cpp's llama-server) picks tools;
this script turns each tool into a short, capped "v r" stream to the ESP32
on ws://<esp32>:81, the same link the laptop uses. The ESP32 still enforces
its own speed cap, slew limit, 250 ms dead-man, bump hold and e-stop.

Standard library only, so nothing to pip install.
"""
from __future__ import annotations

import argparse
import base64
import json
import math
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import threading
import time
import urllib.request

STRAIGHT = 32768        # Open Interface "drive straight" radius
V_MOVE = 120            # mm/s, below the 180 mm/s VCAP on the Stability tab
V_SPIN = 60             # mm/s wheel speed when turning in place
HALF_TRACK = 115.0      # mm, half of GEO.wheelTrackMm
MAX_MOVE_MM = 1000
MAX_TURN_DEG = 180
TICK = 0.05             # 20 Hz, well inside the ESP32's 250 ms dead-man
MAX_TOOL_ROUNDS = 8

SYSTEM = """You are KEEL, a small telepresence robot: a Roomba base with a phone on a short mast.
You act only through tools. Every move is short and slow, and the robot has no map.
- move(distance_mm): positive is forward, negative is backward, at most 1000 mm per call.
- turn(degrees): positive turns left, negative turns right, at most 180 per call.
- look(question): take a photo with the forward camera and describe what is there.
- say(text): speak out loud.
- stop(): stop at once.
Look before you move forward more than 300 mm. If something is in the way, or you are unsure, stop and ask.
Keep spoken replies to one or two short sentences."""

TOOLS = [
    {"type": "function", "function": {
        "name": "move", "description": "Drive straight. Positive is forward, negative is backward.",
        "parameters": {"type": "object", "properties": {
            "distance_mm": {"type": "integer", "description": "-1000 to 1000"}}, "required": ["distance_mm"]}}},
    {"type": "function", "function": {
        "name": "turn", "description": "Turn in place. Positive is left (counter-clockwise).",
        "parameters": {"type": "object", "properties": {
            "degrees": {"type": "integer", "description": "-180 to 180"}}, "required": ["degrees"]}}},
    {"type": "function", "function": {
        "name": "look", "description": "Photograph what is in front of the robot and describe it.",
        "parameters": {"type": "object", "properties": {
            "question": {"type": "string", "description": "What to look for"}}, "required": ["question"]}}},
    {"type": "function", "function": {
        "name": "say", "description": "Speak a short sentence out loud.",
        "parameters": {"type": "object", "properties": {"text": {"type": "string"}}, "required": ["text"]}}},
    {"type": "function", "function": {
        "name": "stop", "description": "Stop moving now.", "parameters": {"type": "object", "properties": {}}}},
]


class WebSocket:
    """Just enough RFC 6455 client to send short text frames to the ESP32."""

    def __init__(self, host: str, port: int = 81):
        self.sock = socket.create_connection((host, port), timeout=3)
        key = base64.b64encode(os.urandom(16)).decode()
        self.sock.sendall(
            (f"GET / HTTP/1.1\r\nHost: {host}:{port}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n"
             f"Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n").encode())
        head = b""
        while b"\r\n\r\n" not in head:
            chunk = self.sock.recv(1024)
            if not chunk:
                raise ConnectionError("ESP32 closed the connection during the handshake")
            head += chunk
        status = head.split(b"\r\n", 1)[0]
        if b" 101 " not in status:
            raise ConnectionError(f"ESP32 refused the WebSocket upgrade: {status!r}")
        self.lock = threading.Lock()

    def send(self, text: str, opcode: int = 0x1) -> None:
        data = text.encode()
        mask = os.urandom(4)
        frame = bytes([0x80 | opcode, 0x80 | len(data)]) + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(data))
        with self.lock:
            self.sock.sendall(frame)

    def close(self) -> None:
        try:
            self.send("", opcode=0x8)
        finally:
            self.sock.close()


class Printer:
    """Stands in for the ESP32 with --dry-run."""

    def __init__(self):
        self.last = None

    def send(self, text: str) -> None:
        if text != self.last:
            print(f"  [esp32] {text}", flush=True)
            self.last = text

    def close(self) -> None:
        pass


class Driver:
    """Streams the current command at 20 Hz. When a move's time is up it streams stop."""

    def __init__(self, link):
        self.link = link
        self.cmd = (0, STRAIGHT)
        self.until = 0.0
        self.alive = threading.Event()
        self.alive.set()
        self.thread = threading.Thread(target=self._loop, daemon=True)
        self.thread.start()

    def _loop(self) -> None:
        while self.alive.is_set():
            v, r = self.cmd if time.monotonic() < self.until else (0, STRAIGHT)
            try:
                self.link.send(f"{v} {r}")
            except OSError as e:
                print(f"Lost the ESP32 link ({e}). The ESP32 dead-man has stopped the robot.", file=sys.stderr)
                self.alive.clear()
                return
            time.sleep(TICK)

    def run(self, v: int, r: int, seconds: float) -> None:
        if not self.alive.is_set():
            raise RuntimeError("no link to the ESP32")
        self.cmd = (v, r)
        self.until = time.monotonic() + seconds
        time.sleep(seconds + 0.4)  # the firmware's slew brings it to rest

    def stop(self) -> None:
        self.until = 0.0

    def close(self) -> None:
        self.stop()
        time.sleep(3 * TICK)
        self.alive.clear()
        self.thread.join(timeout=1)
        self.link.close()


def chat(url: str, messages: list, tools: list | None = None, timeout: float = 120) -> dict:
    body = {"messages": messages, "temperature": 0.2}
    if tools:
        body["tools"] = tools
    req = urllib.request.Request(url, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return json.load(resp)["choices"][0]["message"]


class Agent:
    def __init__(self, driver: Driver, llm_url: str, vlm_url: str | None, camera: str, speak: bool):
        self.driver = driver
        self.llm_url = llm_url
        self.vlm_url = vlm_url
        self.camera = camera
        self.speak = speak
        self.messages: list = [{"role": "system", "content": SYSTEM}]

    # ---- tools -------------------------------------------------------------
    def move(self, distance_mm: int) -> str:
        d = max(-MAX_MOVE_MM, min(MAX_MOVE_MM, int(distance_mm)))
        if d == 0:
            return "Did not move."
        self.driver.run(V_MOVE if d > 0 else -V_MOVE, STRAIGHT, abs(d) / V_MOVE)
        note = "" if d == int(distance_mm) else f" (capped from {distance_mm})"
        return f"Moved {d} mm{note}. Open loop: a bump stops the robot early without telling me."

    def turn(self, degrees: int) -> str:
        a = max(-MAX_TURN_DEG, min(MAX_TURN_DEG, int(degrees)))
        if a == 0:
            return "Did not turn."
        seconds = math.radians(abs(a)) * HALF_TRACK / V_SPIN
        self.driver.run(V_SPIN, 1 if a > 0 else -1, seconds)
        return f"Turned {'left' if a > 0 else 'right'} {abs(a)} degrees."

    def stop(self) -> str:
        self.driver.stop()
        return "Stopped."

    def say(self, text: str) -> str:
        print(f"KEEL: {text}", flush=True)
        if self.speak and shutil.which("termux-tts-speak"):
            subprocess.run(["termux-tts-speak", text], check=False)
        return "Said it."

    def look(self, question: str) -> str:
        if not self.vlm_url:
            return "No vision model is running, so I cannot see. Start the second llama-server to enable look."
        if not shutil.which("termux-camera-photo"):
            return "termux-camera-photo is missing. Install the Termux:API app and the termux-api package."
        path = os.path.join(tempfile.gettempdir(), "keel_look.jpg")
        subprocess.run(["termux-camera-photo", "-c", self.camera, path], check=True, timeout=20)
        with open(path, "rb") as f:
            img = base64.b64encode(f.read()).decode()
        msg = chat(self.vlm_url, [{"role": "user", "content": [
            {"type": "text", "text": f"You are the eyes of a small floor robot. {question} Answer in two sentences. "
                                     "Say how far away obstacles look, in metres."},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img}"}}]}])
        return msg.get("content") or "I could not make out anything."

    # ---- loop --------------------------------------------------------------
    def handle(self, user_text: str) -> None:
        self.messages.append({"role": "user", "content": user_text})
        for _ in range(MAX_TOOL_ROUNDS):
            msg = chat(self.llm_url, self.messages, TOOLS)
            calls = msg.get("tool_calls") or []
            self.messages.append({k: v for k, v in msg.items() if k in ("role", "content", "tool_calls")})
            if not calls:
                if msg.get("content"):
                    self.say(msg["content"].strip())
                return
            for call in calls:
                name = call["function"]["name"]
                try:
                    args = json.loads(call["function"].get("arguments") or "{}")
                    fn = {"move": self.move, "turn": self.turn, "look": self.look, "say": self.say, "stop": self.stop}.get(name)
                    if fn is None:
                        raise ValueError(f"there is no tool called {name}")
                    print(f"  -> {name}({json.dumps(args)})", flush=True)
                    result = fn(**args)
                except Exception as e:  # a bad tool call is reported back, never crashes the robot loop
                    self.driver.stop()
                    result = f"Error: {e}"
                self.messages.append({"role": "tool", "tool_call_id": call.get("id", name), "content": result})
        self.driver.stop()
        self.say("I stopped after eight steps. Tell me what to do next.")


def listen(voice: bool) -> str | None:
    if voice and shutil.which("termux-speech-to-text"):
        print("Listening…", flush=True)
        out = subprocess.run(["termux-speech-to-text"], capture_output=True, text=True, check=False).stdout.strip()
        print(f"you: {out}")
        return out
    try:
        return input("you: ").strip()
    except EOFError:
        return None


def main() -> None:
    p = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    p.add_argument("--esp32", default=os.environ.get("KEEL_ESP32"), help="ESP32 IP address, optionally ip:port (or set KEEL_ESP32)")
    p.add_argument("--llm", default="http://127.0.0.1:8080/v1/chat/completions")
    p.add_argument("--vlm", default=None, help="vision server, e.g. http://127.0.0.1:8081/v1/chat/completions")
    p.add_argument("--camera", default="1", help="termux-camera-photo id of the camera facing the bumper")
    p.add_argument("--voice", action="store_true", help="listen with termux-speech-to-text and speak replies")
    p.add_argument("--dry-run", action="store_true", help="print the drive frames instead of sending them")
    a = p.parse_args()
    if not a.dry_run and not a.esp32:
        p.error("give --esp32 <ip>, set KEEL_ESP32, or use --dry-run")

    if a.dry_run:
        link = Printer()
    else:
        host, _, port = a.esp32.partition(":")
        link = WebSocket(host, int(port or 81))
    driver = Driver(link)
    agent = Agent(driver, a.llm, a.vlm, a.camera, a.voice)
    print("KEEL agent ready. Ctrl-C stops the robot and exits.")
    try:
        while True:
            text = listen(a.voice)
            if text is None:
                break
            if text:
                agent.handle(text)
    except KeyboardInterrupt:
        pass
    finally:
        driver.close()
        print("\nStopped.")


if __name__ == "__main__":
    main()
