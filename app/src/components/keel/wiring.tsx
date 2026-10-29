export function Wiring() {
  return (
    <svg className="wire-svg" viewBox="0 0 980 520" xmlns="http://www.w3.org/2000/svg">
      <rect width="980" height="520" fill="#efe8d8" />
      <text x="28" y="36" fill="#1c1914" fontFamily="Outfit, sans-serif" fontSize="18" fontWeight="600">
        Motion link — signals only
      </text>
      <text x="28" y="56" fill="#5e584c" fontFamily="IBM Plex Mono, monospace" fontSize="11">
        DWG 900-TP-04 · MEASURE THE IDLE LINE BEFORE YOU CONNECT GPIO
      </text>

      <g fill="none" stroke="#1c1914" strokeWidth="1.4">
        <rect x="36" y="88" width="200" height="150" />
        <rect x="390" y="88" width="200" height="210" />
        <rect x="720" y="88" width="220" height="250" />
      </g>
      <text x="48" y="112" fill="#1c1914" fontSize="13" fontFamily="Outfit, sans-serif">
        Power bank
      </text>
      <text x="48" y="134" fill="#5e584c" fontSize="11">
        5 V via the DevKit USB
      </text>
      <text x="48" y="154" fill="#5e584c" fontSize="11">
        socket. Not the 5V pin.
      </text>
      <text x="48" y="186" fill="#1c1914" fontSize="12">
        USB
      </text>
      <line x1="236" y1="182" x2="390" y2="182" stroke="#1c1914" strokeWidth="1.4" />

      <text x="404" y="112" fill="#1c1914" fontSize="13" fontFamily="Outfit, sans-serif">
        ESP32 DevKit
      </text>
      <text x="404" y="148" fill="#1c1914" fontSize="12">
        GPIO17 TX
      </text>
      <text x="404" y="178" fill="#1c1914" fontSize="12">
        GPIO16 RX
      </text>
      <text x="404" y="208" fill="#1c1914" fontSize="12">
        GND
      </text>
      <text x="404" y="248" fill="#1c1914" fontSize="12">
        GPIO4 e-stop
      </text>
      <text x="404" y="278" fill="#5e584c" fontSize="11">
        pull-up, switch to GND
      </text>

      <text x="734" y="112" fill="#1c1914" fontSize="13" fontFamily="Outfit, sans-serif">
        900 service port
      </text>
      <text x="734" y="136" fill="#5e584c" fontSize="11">
        micro-USB under the
      </text>
      <text x="734" y="152" fill="#5e584c" fontSize="11">
        rear-right top trim
      </text>
      <text x="734" y="190" fill="#1c1914" fontSize="12">
        RX
      </text>
      <text x="734" y="220" fill="#1c1914" fontSize="12">
        TX
      </text>
      <text x="734" y="250" fill="#1c1914" fontSize="12">
        GND
      </text>
      <text x="734" y="290" fill="#d4654a" fontSize="12">
        VBUS — open
      </text>
      <text x="734" y="312" fill="#d4654a" fontSize="11">
        do not feed 5 V in
      </text>

      <line x1="590" y1="144" x2="640" y2="144" stroke="#1c1914" strokeWidth="1.4" />
      <rect x="640" y="132" width="56" height="24" fill="#efe8d8" stroke="#d4783a" />
      <text x="668" y="148" textAnchor="middle" fill="#d4783a" fontSize="11">
        220Ω
      </text>
      <line x1="696" y1="144" x2="720" y2="186" stroke="#1c1914" strokeWidth="1.4" />

      <line x1="590" y1="174" x2="640" y2="174" stroke="#1c1914" strokeWidth="1.4" />
      <rect x="640" y="162" width="56" height="24" fill="#efe8d8" stroke="#d4783a" />
      <text x="668" y="178" textAnchor="middle" fill="#d4783a" fontSize="11">
        220Ω
      </text>
      <line x1="696" y1="174" x2="720" y2="216" stroke="#1c1914" strokeWidth="1.4" />

      <line x1="590" y1="204" x2="720" y2="246" stroke="#1c1914" strokeWidth="1.4" />

      <g>
        <rect x="36" y="360" width="908" height="130" fill="none" stroke="#1c1914" strokeWidth="1" />
        <text x="52" y="386" fill="#1c1914" fontSize="13" fontFamily="Outfit, sans-serif">
          Bring-up, in this order
        </text>
        <text x="52" y="412" fill="#5e584c" fontSize="12">
          1  Pop the rear-right trim. Find the micro-USB. Do not plug in a 5 V UART dongle.
        </text>
        <text x="52" y="432" fill="#5e584c" fontSize="12">
          2  Continuity: ground wire to a shell screw. Idle data wire sits near 3.3 V and twitches on CLEAN.
        </text>
        <text x="52" y="452" fill="#5e584c" fontSize="12">
          3  That wire is Roomba TX, into GPIO16. The quiet data wire is Roomba RX, from GPIO17.
        </text>
        <text x="52" y="472" fill="#5e584c" fontSize="12">
          4  Listen at 115200 8N1. A boot line (roomba-mobility) means you have the console. Then 128, 131.
        </text>
      </g>
    </svg>
  )
}
