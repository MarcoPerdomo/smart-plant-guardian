"""USB camera: snapshot capture + sticky-trap fly counting.

Counting approach: point the 480p camera at a yellow sticky trap next to the
plant. Flies land on it and show up as small dark blobs on a bright yellow
field, which is a very easy segmentation problem even at 480p. We isolate the
yellow region, threshold the dark specks inside it, and count blobs within a
plausible size range.
"""

import logging
import time
from pathlib import Path

log = logging.getLogger(__name__)


class Camera:
    def __init__(self, cfg: dict):
        import cv2  # lazy

        self._cv2 = cv2
        self._cfg = cfg
        self._dir = Path(cfg.get("snapshot_dir", "./snapshots"))
        self._dir.mkdir(parents=True, exist_ok=True)
        self._keep = int(cfg.get("keep_snapshots", 200))
        self._index = int(cfg.get("index", 0))
        self._width = int(cfg.get("width", 640))
        self._height = int(cfg.get("height", 480))

    def _grab(self):
        cv2 = self._cv2
        cap = cv2.VideoCapture(self._index)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, self._width)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, self._height)
        try:
            for _ in range(5):  # let auto-exposure settle
                cap.read()
            ok, frame = cap.read()
        finally:
            cap.release()
        return frame if ok else None

    def read(self) -> dict:
        frame = self._grab()
        if frame is None:
            log.warning("camera: no frame captured")
            return {}

        path = self._dir / f"{int(time.time())}.jpg"
        self._cv2.imwrite(str(path), frame)
        self._prune()

        out: dict = {"snapshot": path.name}
        if self._cfg.get("pest_trap_counting", False):
            out["pest_count"] = self._count_trap_specks(frame)
        return out

    def _count_trap_specks(self, frame) -> int:
        import numpy as np

        cv2 = self._cv2
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        # Yellow sticky-trap region.
        trap = cv2.inRange(hsv, np.array([18, 70, 90]), np.array([38, 255, 255]))
        trap = cv2.morphologyEx(trap, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
        if cv2.countNonZero(trap) < 2000:
            return 0  # no trap visible in frame

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        dark = cv2.adaptiveThreshold(
            gray, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 31, 12
        )
        specks = cv2.bitwise_and(dark, trap)
        specks = cv2.morphologyEx(specks, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8))

        count = 0
        contours, _ = cv2.findContours(specks, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        for c in contours:
            area = cv2.contourArea(c)
            if 3 <= area <= 120:  # a fly at 480p from ~20cm
                count += 1
        return count

    def _prune(self) -> None:
        files = sorted(self._dir.glob("*.jpg"))
        for old in files[: max(0, len(files) - self._keep)]:
            old.unlink(missing_ok=True)

    def close(self) -> None:
        pass
