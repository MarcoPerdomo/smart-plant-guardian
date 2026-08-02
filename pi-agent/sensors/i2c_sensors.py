"""I2C sensors: ADS1115 (capacitive soil moisture), AHT20 (temp/humidity),
BH1750 (lux). All optional — enable them in config.yaml as you buy them."""

import logging

log = logging.getLogger(__name__)

_i2c = None


def _bus():
    global _i2c
    if _i2c is None:
        import board  # lazy, Pi-only
        import busio

        _i2c = busio.I2C(board.SCL, board.SDA)
    return _i2c


class SoilMoisture:
    """Capacitive probe on an ADS1115 channel, mapped to 0-100%."""

    def __init__(self, cfg: dict):
        import adafruit_ads1x15.ads1115 as ADS
        from adafruit_ads1x15.analog_in import AnalogIn

        ads = ADS.ADS1115(_bus())
        pins = [ADS.P0, ADS.P1, ADS.P2, ADS.P3]
        self._chan = AnalogIn(ads, pins[int(cfg.get("ads_channel", 0))])
        self._dry = float(cfg.get("dry_volts", 2.85))
        self._wet = float(cfg.get("wet_volts", 1.25))

    def read(self) -> dict:
        volts = self._chan.voltage
        span = self._dry - self._wet
        pct = 0.0 if span == 0 else (self._dry - volts) / span * 100
        return {
            "soil_moisture": round(max(0.0, min(100.0, pct)), 1),
            "soil_volts": round(volts, 3),
        }

    def close(self) -> None:
        pass


class TempHumidity:
    def __init__(self, _cfg: dict):
        import adafruit_ahtx0

        self._s = adafruit_ahtx0.AHTx0(_bus())

    def read(self) -> dict:
        return {
            "temperature_c": round(self._s.temperature, 2),
            "humidity": round(self._s.relative_humidity, 1),
        }

    def close(self) -> None:
        pass


class Light:
    def __init__(self, _cfg: dict):
        import adafruit_bh1750

        self._s = adafruit_bh1750.BH1750(_bus())

    def read(self) -> dict:
        return {"light_lux": round(self._s.lux, 1)}

    def close(self) -> None:
        pass
