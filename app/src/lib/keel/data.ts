export const GEO = {
  diameterMm: 353,
  heightMm: 92,
  massKg: 3.94,
  /** Pitch fulcrum used in the tip calc — inside the shell, about the caster. */
  leverMm: 150,
  baseCgMm: 42,
  saddleKg: 0.1,
  stickKg: 0.16,
  studBehindCenterMm: 120,
  sideAnchorXmm: 150,
  sideAnchorZmm: -30,
  aftAnchorZmm: -162,
  spineWmm: 100,
  spineLmm: 110,
  spineCenterZmm: -115,
  armWmm: 300,
  armDepthMm: 16,
  phoneWmm: 148,
  phoneHmm: 72,
  phoneTmm: 8,
  wheelTrackMm: 230,
  wheelDiaMm: 72,
  wheelZmm: -15,
} as const

export type PartId =
  | "shell"
  | "bumper"
  | "wheels"
  | "caster"
  | "brush"
  | "camera"
  | "saddle"
  | "pod"
  | "mast"
  | "phone"
  | "guys"

export const PARTS: { id: PartId; index: string; label: string; body: string }[] = [
  {
    id: "shell",
    index: "01",
    label: "Roomba 900 shell",
    body: "353 mm disc, 92 mm tall, 3.94 kg. The pack sits in the bottom tray, so the base center of gravity is about 42 mm off the floor. That is why a phone cannot tip this robot. Do not open the shell for this build.",
  },
  {
    id: "bumper",
    index: "02",
    label: "Bumper",
    body: "Spring-loaded front shell. If a zip tie or the saddle bridges the bumper to the body, obstacle detection dies and the plastic cracks. Leave the whole front arc free, including a few millimeters of travel.",
  },
  {
    id: "wheels",
    index: "03",
    label: "Drive wheels",
    body: "Differential drive, about 230 mm track, axis just behind center. Safe mode refuses to drive if either wheel drops — which is why a propped-up bench test will not move. First motion test is on the floor, slow, with the e-stop in hand.",
  },
  {
    id: "caster",
    index: "04",
    label: "Front caster",
    body: "This caster, not the outer rim, is the pitch fulcrum when the robot brakes. The tip math uses a 150 mm lever on purpose, inside the 176 mm radius.",
  },
  {
    id: "brush",
    index: "05",
    label: "Side brush",
    body: "Right-front. Pop it off so it cannot grab the guy lines. Either way, opcode 138 with data 0 keeps it stopped. This build does not vacuum.",
  },
  {
    id: "camera",
    index: "06",
    label: "Camera and RCON",
    body: "Leave the iAdapt window and the front infrared dome uncovered. Dock-seek (opcode 143) still uses them. The saddle stays behind both.",
  },
  {
    id: "saddle",
    index: "07",
    label: "Saddle",
    body: "The printed part. A PETG spine hooks the rear handle and carries the 1/4-20 stud. Two arms reach the side guy anchors. Everything stays inside the 353 mm planform so door frames only ever see the robot, not the rig.",
  },
  {
    id: "pod",
    index: "08",
    label: "Electronics",
    body: "ESP32 DevKit, powered through its own USB port from a flat power bank. Signal ground meets the Roomba only on the service-port ground wire. Do not back-feed the pin labeled 5V — on many DevKits that pin is downstream of a diode.",
  },
  {
    id: "mast",
    index: "09",
    label: "Selfie stick",
    body: "Butt section only. Every slip joint you open is a hinge, and that hinge is the whole stability problem. The foot must be a 1/4-20 female thread. A TPU washer under the foot takes out buzz.",
  },
  {
    id: "phone",
    index: "10",
    label: "Phone",
    body: "Landscape. Screen and front camera face the bumper — the remote person is the face, the front camera is their eyes. The rear camera looks the wrong way. Add a retainer under the clamp; clamps open.",
  },
  {
    id: "guys",
    index: "11",
    label: "Guy lines",
    body: "Three lengths of 1.2 mm dyneema, lightly pretensioned. At a 460 mm mast the angle off vertical is only about 20°. They are not a tower. They take the lash out of the clamp and the joints so the picture does not ring when the wheels start and stop.",
  },
]

export function jointsForMast(mastMm: number) {
  if (mastMm <= 520) return 0
  if (mastMm <= 740) return 1
  if (mastMm <= 960) return 2
  return 3
}

/** Degrees of free play at the phone. Guy pretension kills most of the deadband. */
export function lashDeg(mastMm: number, guyed: boolean) {
  const joints = jointsForMast(mastMm)
  const open = 0.28 + joints * 0.75
  return guyed ? open * 0.18 : open
}

export function shakeMm(mastMm: number, guyed: boolean) {
  const rad = (lashDeg(mastMm, guyed) * Math.PI) / 180
  return Math.tan(rad) * mastMm
}

export function guyAngleDeg(mastMm: number) {
  const radial = GEO.sideAnchorXmm
  return (Math.atan(radial / Math.max(mastMm, 1)) * 180) / Math.PI
}

/** Horizontal accel that lifts the rear (or the nose) — statics only. */
export function tipAccelMs2(mastMm: number, phoneG: number) {
  const g = 9.81
  const mb = GEO.massKg + GEO.saddleKg
  const mp = phoneG / 1000
  const ms = GEO.stickKg
  const L = GEO.leverMm / 1000
  const hb = GEO.baseCgMm / 1000
  const h = mastMm / 1000
  const num = (mb + mp + ms) * L
  const den = mb * hb + mp * h + ms * 0.45 * h
  return (g * num) / den
}

export function recommend(mastMm: number, guyed: boolean) {
  const shake = shakeMm(mastMm, guyed)
  const v = shake < 3.5 ? 180 : shake < 7 ? 140 : shake < 12 ? 100 : 70
  const slew = guyed && shake < 7 ? 400 : 250
  return { v, slew, shake }
}

export function verdict(mastMm: number, guyed: boolean) {
  const joints = jointsForMast(mastMm)
  if (joints === 0 && guyed)
    return {
      tone: "sage" as const,
      title: "Build this",
      body: "Butt section, three guys, speed held at the cap below. Static tip-over is not the limit. Picture shake is, and this is the minimum of it.",
    }
  if (joints === 0 && !guyed)
    return {
      tone: "copper" as const,
      title: "Add the guys",
      body: "The collapsed stick is already stiff. What is left is clamp and foot lash, and a taut line is what takes it out.",
    }
  if (guyed)
    return {
      tone: "copper" as const,
      title: "Close a section",
      body: "Guys help a jointed stick. They do not make a slip joint into a tube. Drop back to the butt section unless you swap the stick for one unbroken carbon tube.",
    }
  return {
    tone: "danger" as const,
    title: "This will wobble",
    body: "An extended selfie stick is a stack of hinges with a camera on top. Collapse it, then guy what remains.",
  }
}

export type BomTag = "owned" | "print" | "buy" | "later"

export type BomItem = {
  qty: string
  part: string
  spec: string
  why: string
  est: number | null
  tag: BomTag
}

export const BOM: BomItem[] = [
  {
    qty: "1",
    part: "Roomba 900",
    spec: "960 / 980 / 981 / 985",
    why: "The base. Mass, cliff sensors, and a service serial port.",
    est: null,
    tag: "owned",
  },
  {
    qty: "1",
    part: "Phone",
    spec: "Front camera, speaker, modern browser",
    why: "Face, eyes, ears, and echo cancellation. The ESP32 does not touch video.",
    est: null,
    tag: "owned",
  },
  {
    qty: "1",
    part: "Selfie stick",
    spec: "1/4-20 female foot, stiffest stick you have",
    why: "Used collapsed. Full extension is the failure mode.",
    est: null,
    tag: "owned",
  },
  {
    qty: "1",
    part: "Multimeter",
    spec: "Any DC voltmeter",
    why: "Confirm the service-port idle line is ~3.3 V before the ESP32 touches it.",
    est: null,
    tag: "owned",
  },
  {
    qty: "1",
    part: "ESP32 DevKit",
    spec: "WROOM-32, 30-pin, USB port",
    why: "Hardware UART to the robot. Wi-Fi only for motion packets.",
    est: 9,
    tag: "buy",
  },
  {
    qty: "1",
    part: "Stick power bank",
    spec: "One 18650 cell, Ø23 × 95 mm max, ~3 350 mAh, USB-A out",
    why: "Powers the DevKit through its USB socket. Isolates the robot pack from the controller. Sized to snap into the two clips on the spine; a flat 5 000 mAh bank does not fit inside the planform.",
    est: 14,
    tag: "buy",
  },
  {
    qty: "1",
    part: "Micro-USB pigtail",
    spec: "Sacrificial cable, cut and probed",
    why: "The 980 service port is a micro-USB under the rear-right trim. Do not assume a random UART dongle is 3.3 V.",
    est: 4,
    tag: "buy",
  },
  {
    qty: "2",
    part: "220 Ω resistors",
    spec: "1/4 W, series, one per data line",
    why: "Limits fault current if a pin is wrong. Not a level shifter.",
    est: 1,
    tag: "buy",
  },
  {
    qty: "1",
    part: "E-stop switch",
    spec: "16 mm panel-mount momentary, normally open to ground",
    why: "GPIO 4, internal pull-up. Opening the software watchdog is not a substitute for a finger.",
    est: 4,
    tag: "buy",
  },
  {
    qty: "2 m",
    part: "Dyneema line",
    spec: "1.0–1.4 mm, plus 3 cord locks",
    why: "Guy lines. Spectra/dyneema does not creep the way nylon does.",
    est: 8,
    tag: "buy",
  },
  {
    qty: "1",
    part: "1/4-20 stud",
    spec: "Stainless set screw, 1/4-20 × 30 mm, plus two hex nuts",
    why: "One nut is trapped under the boss, one jams on top. 16 mm stands proud for the stick foot.",
    est: 3,
    tag: "buy",
  },
  {
    qty: "1",
    part: "M3 inserts and screws",
    spec: "10 heat-set inserts M3 × 5.7; 4 × M3×12, 6 × M3×8 socket head; 1 × M3×6 grub",
    why: "Arms to the spine neck (4), pod floor (2), pod lid (4), guy-ring grub (1). The 300 mm arm is printed as two halves so it fits a 256 mm bed.",
    est: 6,
    tag: "buy",
  },
  {
    qty: "1",
    part: "Tape, ties, heat-shrink",
    spec: "VHB, 4 zip ties, 3 mm heat-shrink",
    why: "Strain-relief on the service cable. The cable is not a structural member.",
    est: 6,
    tag: "buy",
  },
  {
    qty: "~125 g",
    part: "Saddle, ring and pod",
    spec: "PETG, 4 walls, 40% gyroid, 0.2 mm",
    why: "Spine (101), two arms (102), guy ring (103), pod base and lid (104). Only the spine's handle hook needs support.",
    est: 4,
    tag: "print",
  },
  {
    qty: "~15 g",
    part: "Pads and washer",
    spec: "TPU 95A",
    why: "Foot pads so the plate does not polish the shell. Washer under the stick.",
    est: 2,
    tag: "print",
  },
  {
    qty: "1",
    part: "Buck module",
    spec: "5 V, ≥2 A, 7–24 V in, plus a 1 A fuse",
    why: "Later, if you want one battery. Not the first build — a wiring mistake here kills the pack.",
    est: 8,
    tag: "later",
  },
  {
    qty: "1",
    part: "Carbon tube",
    spec: "16 mm × 600 mm, one piece, no joints",
    why: "Only if you outgrow tabletop height. Replaces the stick. Keep the guys and the speed cap.",
    est: 18,
    tag: "later",
  },
]

export function bomTotals() {
  const buy = BOM.filter((i) => i.tag === "buy" || i.tag === "print").reduce(
    (s, i) => s + (i.est ?? 0),
    0,
  )
  const later = BOM.filter((i) => i.tag === "later").reduce((s, i) => s + (i.est ?? 0), 0)
  return { buy, later }
}

export function toDrive(x: number, y: number, vmax: number) {
  const vRaw = Math.round(y * vmax)
  const turn = x
  if (Math.abs(vRaw) < 8 && Math.abs(turn) < 0.08) {
    return { v: 0, r: 32768, mode: "stop" as const }
  }
  if (Math.abs(vRaw) < 14 && Math.abs(turn) >= 0.08) {
    const spin = Math.round(Math.min(1, Math.abs(turn)) * 100)
    const right = turn > 0
    return { v: spin, r: right ? -1 : 1, mode: "spin" as const }
  }
  const yaw = turn * 1.15
  if (Math.abs(yaw) < 0.05) return { v: vRaw, r: 32768, mode: "straight" as const }
  let r = Math.round(vRaw / yaw)
  if (!Number.isFinite(r) || Math.abs(r) > 2000) {
    return { v: vRaw, r: 32768, mode: "straight" as const }
  }
  if (r === 0) r = yaw > 0 ? 1 : -1
  return { v: vRaw, r, mode: "arc" as const }
}

export function packetBytes(v: number, r: number) {
  const hi = (n: number) => {
    const u = n < 0 ? (n + 0x10000) & 0xffff : n & 0xffff
    return [(u >> 8) & 0xff, u & 0xff]
  }
  return [137, ...hi(v), ...hi(r)]
}

export function toHex(bytes: number[]) {
  return bytes.map((b) => b.toString(16).toUpperCase().padStart(2, "0")).join(" ")
}

export const FIRMWARE = `// KEEL motion — Roomba 900 service port
// Board: ESP32 Dev Module. Arduino-ESP32 2.x or 3.x.
// Library: "WebSockets" by Markus Sattler (Library Manager).
//
// Bench: laptop on the same Wi-Fi opens ws://<ip>:81
// and sends text frames "v r" in millimetres, e.g. "80 32768".
// Remote: keep this loop and swap the server for an outbound
// MQTT client. The phone call never carries drive bytes.

#include <WiFi.h>
#include <WebSocketsServer.h>

const char* WIFI_SSID = "your-ssid";
const char* WIFI_PASS = "your-pass";

static const int PIN_RX = 16;   // GPIO16 <- Roomba TX, through 220 ohm
static const int PIN_TX = 17;   // GPIO17 -> Roomba RX, through 220 ohm
static const int PIN_ESTOP = 4; // to GND when pressed. Internal pull-up.

static const int VCAP = 180;          // mm/s  — from the stability sheet
static const int SLEW_PER_TICK = 8;   // mm/s per 20 ms tick = 400 mm/s^2
static const uint32_t DEADMAN_MS = 250;
static const uint32_t BUMP_HOLD_MS = 400;

WebSocketsServer ws(81);

int16_t tgtV = 0;
int16_t tgtR = (int16_t)0x8000; // 0x8000 is the OI "straight" radius
int16_t curV = 0;
uint32_t lastCmd = 0;
uint32_t bumpUntil = 0;
bool linked = false;

void roombaStart() {
  uint8_t startSafe[] = {128, 131};     // Start, Safe. Never Full.
  Serial2.write(startSafe, 2);
  delay(80);
  uint8_t motorsOff[] = {138, 0};        // vacuum, main brush, side brush off
  Serial2.write(motorsOff, 2);
}

void drive(int16_t v, int16_t r) {
  uint8_t p[5];
  p[0] = 137;
  p[1] = (uint8_t)((v >> 8) & 0xFF);
  p[2] = (uint8_t)(v & 0xFF);
  p[3] = (uint8_t)((r >> 8) & 0xFF);
  p[4] = (uint8_t)(r & 0xFF);
  Serial2.write(p, 5);
}

void noteCommand(int16_t v, int16_t r) {
  if (v > VCAP) v = VCAP;
  if (v < -VCAP) v = -VCAP;
  tgtV = v;
  tgtR = r;
  lastCmd = millis();
}

void onWs(uint8_t, WStype_t type, uint8_t* payload, size_t len) {
  if (type == WStype_CONNECTED) {
    linked = true;
    lastCmd = millis();
    return;
  }
  if (type == WStype_DISCONNECTED) {
    linked = false;
    tgtV = 0;
    tgtR = 32768;
    return;
  }
  if (type != WStype_TEXT || len == 0 || len > 32) return;
  char buf[33];
  memcpy(buf, payload, len);
  buf[len] = 0;
  int v = 0, r = 32768;
  if (sscanf(buf, "%d %d", &v, &r) == 2) noteCommand((int16_t)v, (int16_t)r);
}

void setup() {
  pinMode(PIN_ESTOP, INPUT_PULLUP);
  Serial.begin(115200);
  // Native UART. No DTR, so opening it does not pulse a reset the way a
  // USB-serial adapter can.
  Serial2.begin(115200, SERIAL_8N1, PIN_RX, PIN_TX);
  delay(300);
  roombaStart();
  drive(0, 32768);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) delay(250);
  Serial.println(WiFi.localIP());

  ws.begin();
  ws.onEvent(onWs);
  lastCmd = millis();
}

void loop() {
  ws.loop();
  const uint32_t now = millis();

  if (digitalRead(PIN_ESTOP) == LOW || !linked || (now - lastCmd) > DEADMAN_MS) {
    tgtV = 0;
    tgtR = 32768;
  }

  // Packet 7 — bumps and wheel drops. One byte.
  static uint32_t lastPoll = 0;
  if (now - lastPoll > 200) {
    lastPoll = now;
    uint8_t q[] = {142, 7};
    Serial2.write(q, 2);
  }
  if (Serial2.available()) {
    int b = Serial2.read();
    if (b >= 0 && (b & 0x03)) bumpUntil = now + BUMP_HOLD_MS;
  }

  int16_t goal = (now < bumpUntil) ? 0 : tgtV;
  if (curV < goal) curV = min<int16_t>(goal, curV + SLEW_PER_TICK);
  else if (curV > goal) curV = max<int16_t>(goal, curV - SLEW_PER_TICK);

  static uint32_t lastTx = 0;
  if (now - lastTx >= 20) {
    lastTx = now;
    drive(curV, curV == 0 ? 32768 : tgtR);
  }
}
`

export const SHOP: { call: string; mm: string; note: string }[] = [
  { call: "A", mm: "353", note: "Robot diameter. Nothing you print may exceed this." },
  { call: "B", mm: "92", note: "Shell height. Floor to deck." },
  { call: "C", mm: "100 × 110 × 6", note: "Spine. Width × fore-aft × thick. Stands 4 mm off the deck on TPU pads. Hook the rear edge to the handle." },
  { call: "D", mm: "300 × 16 × 5", note: "Arm, centered 30 mm behind robot center." },
  { call: "E", mm: "120", note: "Stud behind geometric center, on centerline. 1/4-20." },
  { call: "F", mm: "Ø14 / Ø36", note: "Guy ring. Slides up the butt section, sits 72 mm below phone centre, under the clamp." },
  { call: "G", mm: "460", note: "Recommended deck-to-phone-center. Butt section, no slip joint open." },
  { call: "H", mm: "148 × 72", note: "Phone, landscape, screen toward the bumper." },
  { call: "J", mm: "3 × 120°", note: "Guys. Side anchors ±150 mm, aft anchor 162 mm behind center." },
]

/* ---------- Build sequence (drives the 3D stage on the Build tab) ---------- */

/** Pieces the 3D stage can show, hide and highlight independently. */
export type Piece =
  | "robot"
  | "brush"
  | "pads"
  | "spine"
  | "stud"
  | "arms"
  | "pod"
  | "podlid"
  | "board"
  | "bank"
  | "cable"
  | "washer"
  | "stick"
  | "ring"
  | "clamp"
  | "phone"
  | "guys"

export const ALL_PIECES: Piece[] = [
  "robot", "brush", "pads", "spine", "stud", "arms", "pod", "podlid", "board", "bank",
  "cable", "washer", "stick", "ring", "clamp", "phone", "guys",
]

export type CamView = "overview" | "robot" | "deck" | "rear" | "side" | "mast" | "phone" | "parts"

export type BuildStep = {
  n: string
  title: string
  body: string
  need: string[]
  check: string[]
  show: Piece[]
  focus: Piece[]
  view: CamView
  explode: number
}

const SADDLE: Piece[] = ["pads", "spine", "stud", "arms"]
const POD: Piece[] = ["pod", "podlid", "board", "bank", "cable"]

export const BUILD: BuildStep[] = [
  {
    n: "01",
    title: "Prepare the robot",
    body: "Charge the Roomba and set it on the floor. Pop off the side brush (one screw on most 900s). Lift the rear carry handle and measure the bar diameter and the gap under it with calipers. That number sets the hook slot on the spine.",
    need: ["Phillips #1", "Calipers"],
    check: ["Side brush removed", "Handle bar measured (drawing assumes Ø10)", "Camera window and IR dome clean and uncovered"],
    show: ["robot", "brush"],
    focus: ["brush"],
    view: "robot",
    explode: 0,
  },
  {
    n: "02",
    title: "Print the parts",
    body: "PETG for the spine (101), both arms (102, print one mirrored), the guy ring (103) and the pod base and lid (104). TPU 95A for six foot pads and the stick washer. Four walls, 40% gyroid, 0.2 mm layers. Only the spine's hook needs supports. Edit HANDLE_BAR_D in cad/src/keel_dims.py first if your handle measured differently.",
    need: ["~125 g PETG", "~15 g TPU 95A", "Any bed ≥ 180 mm; the longest part is the 158 mm arm"],
    check: ["Hook slot test-fits the handle bar before you print the rest", "Arms are a left and a right, not two rights"],
    show: ["spine", "arms", "pod", "podlid", "ring"],
    focus: ["spine", "arms", "pod", "podlid", "ring"],
    view: "parts",
    explode: 0.35,
  },
  {
    n: "03",
    title: "Inserts, nut and stud",
    body: "Heat-set the M3 inserts: four in the spine neck for the arms, two beside the boss for the pod, four in the pod base bosses. Press a 1/4-20 hex nut into the trap under the boss, run the 30 mm set screw up through it until 16 mm stands proud, then lock it with the second nut on top of the boss.",
    need: ["Soldering iron with insert tip", "10 × M3 inserts", "1/4-20 set screw + 2 nuts"],
    check: ["Inserts flush, not proud", "Stud vertical and does not turn when the stick is torqued"],
    show: ["spine", "stud"],
    focus: ["stud"],
    view: "deck",
    explode: 0.25,
  },
  {
    n: "04",
    title: "Bolt on the arms",
    body: "Lap each arm onto the neck and fit two M3 × 12 socket heads per side. The two arm ends meet on the centreline. The lugs at the outer ends are the side guy anchors, 300 mm apart.",
    need: ["4 × M3 × 12", "2.5 mm hex key"],
    check: ["Lugs face up, holes run fore-aft", "Arms sit flat on the neck with no rock"],
    show: ["spine", "stud", "arms"],
    focus: ["arms"],
    view: "deck",
    explode: 0.15,
  },
  {
    n: "05",
    title: "Stick on the TPU pads",
    body: "Six 2 mm TPU pads go under the four spine feet and the two arm feet, with a dot of VHB or CA. They hold the whole saddle 4 mm off the deck, which keeps it clear of the CLEAN button and stops the plate polishing the shell.",
    need: ["6 TPU pads", "VHB scraps or CA glue"],
    check: ["Nothing under the arm touches the CLEAN button when the saddle is pressed down"],
    show: ["pads", "spine", "stud", "arms"],
    focus: ["pads"],
    view: "deck",
    explode: 0.3,
  },
  {
    n: "06",
    title: "Seat the saddle on the robot",
    body: "Lift the carry handle, slide the hook under the bar from the front, then lower the front of the saddle onto the deck. Everything stays inside the 353 mm planform and behind the camera window. Press the bumper by hand at several points: it must still click and spring back freely.",
    need: [],
    check: ["Bumper clicks all the way around", "Camera window and IR dome uncovered", "Saddle cannot slide aft off the handle"],
    show: ["robot", ...SADDLE],
    focus: [...SADDLE],
    view: "rear",
    explode: 0,
  },
  {
    n: "07",
    title: "Electronics pod and service cable",
    body: "Flash the firmware from the Motion tab before anything is boxed up. Drop the DevKit between the rails, USB toward the rear opening. Wire it per the Wiring tab: GPIO17 to Roomba RX and GPIO16 to Roomba TX through 220 Ω, ground to ground, e-stop from GPIO4 to ground. Fit the 16 mm e-stop in the lid. Screw the base to the spine with two M3 × 8, lead the service cable out of the side slot to the rear-right trim, and strain-relieve it with a zip tie.",
    need: ["ESP32 DevKit", "2 × 220 Ω", "16 mm e-stop", "2 × M3 × 8", "Micro-USB pigtail", "Heat-shrink, zip ties"],
    check: ["Idle data line measured near 3.3 V before connecting", "VBUS left open", "Cable is not structural: it has slack at the trim"],
    show: ["robot", ...SADDLE, "pod", "board", "cable"],
    focus: ["pod", "board", "cable"],
    view: "rear",
    explode: 0.35,
  },
  {
    n: "08",
    title: "Lid and power bank",
    body: "Close the lid with four M3 × 8. Snap the stick power bank into the two clips on the left of the spine, USB end aft, and run a short USB-A to micro-USB lead around the rear of the boss into the pod.",
    need: ["Stick power bank", "4 × M3 × 8", "20 cm USB lead"],
    check: ["DevKit LED shows through the lid window", "E-stop press makes the pad output read stop"],
    show: ["robot", ...SADDLE, ...POD],
    focus: ["podlid", "bank"],
    view: "rear",
    explode: 0,
  },
  {
    n: "09",
    title: "Floor test, no mast yet",
    body: "Wheels on the floor, hallway clear, e-stop in hand. Send 80 83 8A 00 (Start, Safe, motors off) then a one-second 89 00 32 80 00 pulse (50 mm/s straight). Then 89 00 00 80 00 to stop. Only when that is boring do you add the mast.",
    need: ["Laptop on the same Wi-Fi", "Clear floor"],
    check: ["Vacuum never spins up", "Robot stops within 250 ms of letting go", "Bump stops it and holds 400 ms"],
    show: ["robot", ...SADDLE, ...POD],
    focus: [],
    view: "robot",
    explode: 0,
  },
  {
    n: "10",
    title: "Mount the selfie stick",
    body: "Lay the TPU washer over the stud and thread the stick's 1/4-20 foot down onto it, hand-tight plus a quarter turn. Use the butt section only: collapse it fully and lock every slip joint. Every joint you open is a hinge that shakes the picture.",
    need: ["TPU washer", "Selfie stick"],
    check: ["All joints collapsed and locked", "Stick is plumb when viewed from the front and the side"],
    show: ["robot", ...SADDLE, ...POD, "washer", "stick"],
    focus: ["washer", "stick"],
    view: "mast",
    explode: 0.2,
  },
  {
    n: "11",
    title: "Guy ring",
    body: "Slide the guy ring down over the clamp end with the flange down and one hole pointing straight aft. Park it 72 mm below where the phone centre will be and lock it with the M3 grub screw.",
    need: ["Guy ring", "M3 grub screw", "1.5 mm hex key"],
    check: ["One hole points aft at the spine lug", "Ring does not slide when you tug a guy"],
    show: ["robot", ...SADDLE, ...POD, "washer", "stick", "ring"],
    focus: ["ring"],
    view: "mast",
    explode: 0,
  },
  {
    n: "12",
    title: "Clamp and phone",
    body: "Phone in landscape, screen and front camera toward the bumper. The remote person is the face and the front camera is their eyes. Close the clamp on the phone's long edges and add a retainer strap or band across the clamp, because spring clamps open.",
    need: ["Phone", "Retainer band"],
    check: ["Screen faces the bumper", "Front camera is not behind a jaw", "Phone does not slip when the robot stops hard"],
    show: ["robot", ...SADDLE, ...POD, "washer", "stick", "ring", "clamp", "phone"],
    focus: ["clamp", "phone"],
    view: "phone",
    explode: 0,
  },
  {
    n: "13",
    title: "Rig and tension the guys",
    body: "Cut three lengths of 1.2 mm Dyneema. Tie each to a ring hole with a figure-eight stopper, run it to its anchor lug (left arm, right arm, spine aft lug), back through a cord lock, and pull light even tension. Pluck each line: they should sound about the same.",
    need: ["2 m Dyneema 1.0–1.4 mm", "3 cord locks", "Lighter for the ends"],
    check: ["Stick still plumb after tensioning", "Lines clear the bumper and the side brush mount", "No line crosses the camera window"],
    show: ["robot", ...SADDLE, ...POD, "washer", "stick", "ring", "clamp", "phone", "guys"],
    focus: ["guys"],
    view: "overview",
    explode: 0,
  },
  {
    n: "14",
    title: "Shake-down",
    body: "Set VCAP and slew from the Stability tab into the sketch and reflash. Start a call to another device, then drive a square at the cap. Watch the remote picture, not the robot: if it rings on every stop, lower the slew before you lower the speed. Last, send the robot to its dock (opcode 143) to prove the camera and IR dome still see.",
    need: ["Second device on a call"],
    check: ["Picture settles within a second of a stop", "Docks on its own", "Bumper still stops it"],
    show: ALL_PIECES.filter((p) => p !== "brush"),
    focus: [],
    view: "overview",
    explode: 0,
  },
]

/** Printed parts list, matching the CAD sheets in cad/PDF. */
export const PRINTED: { no: string; name: string; qty: string; mat: string; grams: string; sheet: string }[] = [
  { no: "900-TP-101", name: "Saddle spine", qty: "1", mat: "PETG", grams: "≈ 70", sheet: "spine" },
  { no: "900-TP-102", name: "Saddle arm, R and L", qty: "2", mat: "PETG", grams: "≈ 2 × 15", sheet: "arm" },
  { no: "900-TP-103", name: "Guy ring", qty: "1", mat: "PETG", grams: "≈ 5", sheet: "ring" },
  { no: "900-TP-104", name: "Electronics pod, base and lid", qty: "1 + 1", mat: "PETG", grams: "≈ 19", sheet: "pod" },
  { no: "900-TP-105", name: "Foot pad", qty: "6", mat: "TPU 95A", grams: "≈ 1.5", sheet: "plan" },
  { no: "900-TP-106", name: "Stick washer", qty: "1", mat: "TPU 95A", grams: "≈ 1.5", sheet: "plan" },
]
