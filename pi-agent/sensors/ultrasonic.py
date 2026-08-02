"""HC-SR04 ultrasonic distance sensor on the BST-4WD expansion board."""

import logging

log = logging.getLogger(__name__)


class Ultrasonic:
    def __init__(self, cfg: dict):
        from gpiozero import DistanceSensor  # imported lazily; Pi-only

        self._sensor = DistanceSensor(
            echo=int(cfg["echo_pin"]),
            trigger=int(cfg["trigger_pin"]),
            max_distance=float(cfg.get("max_distance_m", 2.0)),
        )

    def read(self) -> dict:
        """Returns {'distance_cm': float} — median of 5 pings to kill outliers."""
        samples = sorted(self._sensor.distance for _ in range(5))
        return {"distance_cm": round(samples[2] * 100, 1)}

    def close(self) -> None:
        try:
            self._sensor.close()
        except Exception:  # noqa: BLE001
            log.debug("ultrasonic close failed", exc_info=True)
