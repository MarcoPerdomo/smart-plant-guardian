#!/usr/bin/env python3
"""Verdant Pi agent — reads the sensors wired to a Raspberry Pi 5 / BST-4WD
expansion board and POSTs a reading to the Verdant ingest endpoint.

Usage:
    python agent.py --config config.yaml          # run forever
    python agent.py --config config.yaml --once   # single reading, then exit
    python agent.py --config config.yaml --dry-run  # read sensors, don't upload
"""

import argparse
import logging
import signal
import sys
import time

import requests
import yaml

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s"
)
log = logging.getLogger("verdant")

# Fields the ingest endpoint accepts at the top level. Anything else we collect
# is nested under "extra" (jsonb) so it is still stored with the reading.
TOP_LEVEL = {
    "soil_moisture",
    "temperature_c",
    "humidity",
    "light_lux",
    "motion_events",
}

_running = True


def _stop(*_a):
    global _running
    _running = False
    log.info("shutting down…")


def build_sensors(cfg: dict) -> list:
    sensors = []
    s = cfg.get("sensors", {})

    def add(name, factory, sub):
        if not sub.get("enabled"):
            return
        try:
            sensors.append((name, factory(sub)))
            log.info("sensor enabled: %s", name)
        except Exception as exc:  # noqa: BLE001
            log.error("sensor %s failed to init (%s) — skipping", name, exc)

    if s.get("ultrasonic", {}).get("enabled"):
        from sensors.ultrasonic import Ultrasonic

        add("ultrasonic", Ultrasonic, s["ultrasonic"])
    if s.get("camera", {}).get("enabled"):
        from sensors.camera import Camera

        add("camera", Camera, s["camera"])
    if s.get("soil_moisture", {}).get("enabled"):
        from sensors.i2c_sensors import SoilMoisture

        add("soil_moisture", SoilMoisture, s["soil_moisture"])
    if s.get("temp_humidity", {}).get("enabled"):
        from sensors.i2c_sensors import TempHumidity

        add("temp_humidity", TempHumidity, s["temp_humidity"])
    if s.get("light", {}).get("enabled"):
        from sensors.i2c_sensors import Light

        add("light", Light, s["light"])
    return sensors


def collect(sensors: list) -> dict:
    values: dict = {}
    for name, sensor in sensors:
        try:
            values.update(sensor.read())
        except Exception as exc:  # noqa: BLE001
            log.error("read failed for %s: %s", name, exc)
    return values


def to_payload(device_id: str, values: dict) -> dict:
    payload = {"device_id": device_id}
    extra = {}
    for key, val in values.items():
        if key in TOP_LEVEL:
            payload[key] = val
        else:
            extra[key] = val
    # The dashboard's "motion" column doubles as the pest counter.
    if "pest_count" in extra and "motion_events" not in payload:
        payload["motion_events"] = int(extra["pest_count"])
    if extra:
        payload["extra"] = extra
    return payload


def upload(cfg: dict, payload: dict) -> bool:
    try:
        resp = requests.post(
            cfg["endpoint"],
            json=payload,
            headers={"X-Ingest-Secret": cfg["ingest_secret"]},
            timeout=20,
        )
    except requests.RequestException as exc:
        log.error("upload failed: %s", exc)
        return False
    if resp.status_code >= 400:
        log.error("ingest rejected (%s): %s", resp.status_code, resp.text[:300])
        return False
    log.info("uploaded: %s", payload)
    return True


def upload_snapshot(cfg: dict, snapshot_path: str) -> str | None:
    """Upload a local snapshot to cloud storage and return its storage path."""
    endpoint = cfg.get("snapshot_endpoint", cfg["endpoint"].replace("/ingest", "/snapshot-upload"))
    try:
        with open(snapshot_path, "rb") as fh:
            resp = requests.post(
                endpoint,
                files={"snapshot": fh},
                data={"device_id": cfg["device_id"]},
                headers={"X-Ingest-Secret": cfg["ingest_secret"]},
                timeout=30,
            )
    except requests.RequestException as exc:
        log.error("snapshot upload failed: %s", exc)
        return None
    if resp.status_code >= 400:
        log.error("snapshot upload rejected (%s): %s", resp.status_code, resp.text[:300])
        return None
    url = resp.json().get("snapshot_url")
    log.info("snapshot uploaded: %s", url)
    return url


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--config", default="config.yaml")
    ap.add_argument("--once", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    with open(args.config, "r", encoding="utf-8") as fh:
        cfg = yaml.safe_load(fh)

    for required in ("endpoint", "ingest_secret", "device_id"):
        if not cfg.get(required):
            log.error("config is missing %s", required)
            return 2

    signal.signal(signal.SIGINT, _stop)
    signal.signal(signal.SIGTERM, _stop)

    sensors = build_sensors(cfg)
    if not sensors:
        log.error("no sensors enabled — nothing to do")
        return 2

    interval = int(cfg.get("interval_seconds", 300))
    try:
        while _running:
            values = collect(sensors)
            snapshot_path = values.pop("snapshot", None)
            snapshot_url = upload_snapshot(cfg, snapshot_path) if snapshot_path else None

            payload = to_payload(cfg["device_id"], values)
            if snapshot_url:
                payload.setdefault("extra", {})["snapshot_url"] = snapshot_url
            if args.dry_run:
                log.info("dry-run payload: %s", payload)
            else:
                upload(cfg, payload)
            if args.once:
                break
            for _ in range(interval):
                if not _running:
                    break
                time.sleep(1)
    finally:
        for _, sensor in sensors:
            sensor.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
