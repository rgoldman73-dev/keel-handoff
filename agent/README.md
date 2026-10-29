# KEEL agent mode

A local Hermes model on the phone drives the robot through the ESP32. Full setup guide: the "KEEL agent mode on a Samsung phone" doc in the project.

Quick start in Termux, with two llama-servers already running (see the guide):

```sh
python keel_agent.py --esp32 192.168.1.50 --vlm http://127.0.0.1:8081/v1/chat/completions --voice
python keel_agent.py --dry-run   # no robot: prints the drive frames
```

Tools the model can call: `move(distance_mm)` (±1000, 120 mm/s), `turn(degrees)` (±180, 60 mm/s wheel speed), `look(question)`, `say(text)`, `stop()`.
The script streams `"v r"` at 20 Hz and sends stop as soon as a move's time is up. The ESP32 keeps its own cap, slew, 250 ms dead-man, bump hold and e-stop.
Standard library only.
