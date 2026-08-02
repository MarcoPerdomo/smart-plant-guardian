# Verdant Pi agent (Raspberry Pi 5 + Yahboom BST-4WD)

A small Python service that reads the sensors on/around your Pi 5 and POSTs a
reading to Verdant's ingest endpoint every few minutes. It reuses the same
endpoint the Arduino path uses, so nothing changes in the app.

```
sensors → agent.py → POST /api/public/ingest → sensor_readings → dashboard + AI summaries
```

---

## 1. First, the honest hardware answer

**Ultrasonic for pest tracking: no.** An HC‑SR04 emits a ~15° cone of 40 kHz
sound and reports the distance of the *first strong echo*. Its usable
resolution is roughly 0.3 cm on a flat, sound-reflective surface at least a few
cm² in size. A fungus gnat is ~2 mm of soft tissue — it reflects essentially
nothing, and even if it did, the sensor reports one number per ping, not a
count. There is no signal processing that recovers "3 flies are flying here"
from that. Keep the ultrasonic, but repurpose it — it's genuinely useful for:

- **Soil / substrate level**: mount it above the pot pointing down. A rising
  distance means the soil has compacted or dried and shrunk away.
- **Plant height / growth over weeks**: point it down at the canopy from a
  fixed arm. Slow decreases in distance = growth. Nice long-term signal.
- **Presence detection**: someone/something is at the plant (the tank's
  original obstacle-avoidance use).

The agent logs it as `extra.distance_cm`.

**What actually counts flies: the camera + a yellow sticky trap.** Fungus
gnats, whitefly and thrips are strongly attracted to yellow. Stick a standard
yellow sticky card in the pot, aim the 480p camera at it, and count dark specks
on the yellow field. That's a trivially reliable segmentation problem even at
480p — it's implemented in `sensors/camera.py` and reported as
`extra.pest_count` (and mirrored into `motion_events` so the dashboard trends
it). Replace the card when it fills up; the count resets naturally.

For anything more ambitious (spotting mites or leaf disease on the leaf itself)
480p is too low. If you want that later, swap to a Raspberry Pi Camera Module 3
(12 MP, autofocus) — it plugs into the Pi 5's CSI port and coexists with the
USB cam.

---

## 2. What to buy in Europe

Everything below is I²C or analog-over-I²C, 3.3 V, and available from
Berrybase (DE), BerryBase/AZ-Delivery (DE/AT), Kiwi Electronics (NL),
Pi-Shop.ch (CH), The Pi Hut (UK), or Reichelt (DE). Prices are rough retail.

| Need | Part | Why this one | ~€ |
| --- | --- | --- | --- |
| **Soil moisture** | Capacitive soil moisture sensor v2.0 (analog) ×N | Resistive probes corrode within weeks in wet soil; capacitive ones don't. One per plant. | 4–7 ea |
| **Analog→digital** | ADS1115 16‑bit I²C ADC breakout | The Pi 5 has **no analog inputs at all**. This gives you 4 analog channels — i.e. 4 moisture probes — over two wires. Add a second at address 0x49 for 8. | 6–10 |
| **Air temp + humidity** | AHT20 (or AHT20+BMP280 combo) I²C | Accurate, cheap, I²C, no timing-sensitive one-wire protocol like the DHT22. The BMP280 adds pressure if you want it. | 5–9 |
| **Light** | BH1750 I²C lux meter | Reports real lux, which is what the care profiles in Verdant are written against. A photoresistor would need the ADC and gives arbitrary units. | 4–6 |
| **Soil temperature** *(optional)* | DS18B20 waterproof probe + 4.7 kΩ resistor | Root-zone temperature; one-wire, natively supported by Raspbian. | 5–8 |
| **Wiring** | Qwiic/STEMMA-QT cables or Dupont F-F jumpers + a small I²C hub | Chaining 3–4 I²C boards cleanly. | 8–12 |
| **Pest trap** | Yellow sticky traps (pack of 20) | The actual fly sensor. Garden centres, or any online shop. | 5–8 |
| **Better camera** *(optional)* | Raspberry Pi Camera Module 3 | Autofocus + 12 MP for leaf-level disease photos. | 30–35 |
| **Power** | Official Pi 5 27 W USB‑C PSU | The tank's battery pack won't run a Pi 5 plus peripherals for long unattended. | 12–15 |

Total for one fully instrumented plant: **≈ €35–45**, plus ~€6 per extra plant
(just another moisture probe on a free ADC channel).

All I²C devices share the same two pins (GPIO2/SDA, GPIO3/SCL) — they have
different addresses, so ADS1115 (0x48), AHT20 (0x38) and BH1750 (0x23) all live
on the same bus with no conflicts.

---

## 3. Wiring

**I²C chain** (ADS1115 / AHT20 / BH1750, all in parallel):

| Sensor pin | Pi 5 pin |
| --- | --- |
| VIN / VCC | 3.3 V (pin 1) |
| GND | GND (pin 6) |
| SDA | GPIO2 (pin 3) |
| SCL | GPIO3 (pin 5) |

**Capacitive moisture probe** → ADS1115: `VCC → 3.3 V`, `GND → GND`,
`AOUT → A0` (second probe to A1, etc.).

**Ultrasonic** stays on the BST-4WD board. On the standard Yahboom G1 wiring
that's `TRIG = GPIO27`, `ECHO = GPIO22` (BCM numbering) — confirm against your
board's silkscreen and adjust `config.yaml`. The HC-SR04's echo pin outputs
5 V; the BST-4WD already level-shifts it. If you rewire it directly to the Pi,
add a 1 kΩ/2 kΩ divider on ECHO or you'll damage the GPIO.

⚠️ The BST-4WD's motor driver and the Pi share a ground; keep the motors
powered off while the Pi is doing sensing duty, or the switching noise will
show up in your ADC readings.

---

## 4. Install on the Pi

Enable I²C once:

```bash
sudo raspi-config nonint do_i2c 0
sudo reboot
```

Then:

```bash
sudo apt update && sudo apt install -y python3-venv python3-dev i2c-tools libgl1
git clone <your repo> ~/verdant && cd ~/verdant/pi-agent
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt

cp config.example.yaml config.yaml
nano config.yaml     # endpoint, ingest_secret, device_id, which sensors are enabled
```

Check the bus sees your sensors: `i2cdetect -y 1` should list 48 / 38 / 23.

Test one reading without uploading, then one for real:

```bash
.venv/bin/python agent.py --config config.yaml --once --dry-run
.venv/bin/python agent.py --config config.yaml --once
```

Run it as a service:

```bash
sudo cp verdant-agent.service /etc/systemd/system/
sudo systemctl enable --now verdant-agent
journalctl -u verdant-agent -f
```

---

## 5. Connecting it to the app

1. In Verdant → **Add plant**, set the plant's **Device ID** to exactly the
   `device_id` in `config.yaml` (e.g. `pi5-monstera-01`).
2. Copy the ingest secret into `config.yaml` — it's the `ARDUINO_INGEST_SECRET`
   value in your backend secrets. The agent sends it as `X-Ingest-Secret`.
3. Readings appear on the plant detail chart within one interval; the AI
   summary uses the latest ones.

One Pi can feed several plants: run one agent process per plant with its own
config file and `device_id` (moisture probe on a different ADC channel), or
extend `agent.py` to loop over a list of plants.

### Payload the agent sends

```json
{
  "device_id": "pi5-monstera-01",
  "soil_moisture": 38.4,
  "temperature_c": 21.7,
  "humidity": 48.0,
  "light_lux": 412.0,
  "motion_events": 3,
  "extra": { "distance_cm": 24.6, "pest_count": 3, "snapshot": "1754140800.jpg" }
}
```

Snapshots stay on the Pi under `snapshot_dir` (last 200 kept). Uploading them
for live viewing needs a storage bucket — say the word and I'll add it.

---

## 6. Known limits of this prototype

- **No live video.** The camera takes a snapshot per interval. Continuous
  streaming needs a media server (MJPEG over the LAN is easy; over the
  internet needs WebRTC or a relay).
- **Pest count is relative, not absolute.** It counts specks on the trap since
  you last replaced it — treat it as a trend, not a census.
- **The tank's other sensors** (line tracking, motor encoders, MPU6050) have no
  plant-health meaning while it's parked. The MPU6050 is worth adding later if
  you want the tank to *drive between* plants: it gives you heading for dead
  reckoning between pots.
