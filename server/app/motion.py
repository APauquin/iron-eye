"""Bar path and bar speed from per-frame pose landmarks.

The browser runs MediaPipe Pose on every frame of the trimmed clip and sends
the landmarks here. This module turns them into a bar trajectory in metres,
a vertical velocity curve, lift phases and summary metrics. Pure numpy, no AI.

Conventions
- Image coordinates arrive normalised to 0..1 (x right, y down).
- Outputs use metres with y pointing UP and 0 at the lowest bar position.
- The bar is approximated by the wrist on the side of the body facing the
  camera (hands hold the bar in a deadlift and sit right beside it in a squat).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from numpy.typing import NDArray

from .models import Lift, MotionMetrics, MotionPhases, MotionResult, MotionSeries, PoseFrame

FloatArray = NDArray[np.float64]

# MediaPipe Pose landmark indices: (left, right)
EYE = (2, 5)
SHOULDER = (11, 12)
WRIST = (15, 16)
HEEL = (29, 30)

MIN_VISIBILITY = 0.5
MIN_DETECTION_RATE = 0.3  # below this, nothing useful can be measured
WARN_DETECTION_RATE = 0.7
EYE_HEIGHT_RATIO = 0.936  # standing eye height as a fraction of stature
SMOOTHING_SECONDS = 0.05  # Gaussian sigma applied to the bar position
STICKING_DROP = 0.85  # a dip below 85% of the earlier peak speed counts
MIN_ROM_M = 0.08
PHASE_BAND = 0.02  # fraction of the range treated as 'still resting'


class MotionError(ValueError):
    """The clip can't be measured (e.g. the lifter was barely detected)."""


@dataclass
class Track:
    x: FloatArray  # pixels
    y: FloatArray  # pixels
    valid: NDArray[np.bool_]


def _landmark_track(frames: list[PoseFrame], index: int, width: int, height: int) -> Track:
    n = len(frames)
    x = np.full(n, np.nan)
    y = np.full(n, np.nan)
    for i, pose in enumerate(frames):
        if pose is None:
            continue
        lx, ly, vis = pose[index]
        if vis >= MIN_VISIBILITY:
            x[i] = lx * width
            y[i] = ly * height
    return Track(x=x, y=y, valid=~np.isnan(x))


def _visibility(frames: list[PoseFrame], indices: list[int]) -> float:
    scores = [pose[i][2] for pose in frames if pose is not None for i in indices]
    return float(np.mean(scores)) if scores else 0.0


def choose_side(frames: list[PoseFrame]) -> int:
    """0 = left, 1 = right: whichever side the camera sees more clearly."""
    left = _visibility(frames, [EYE[0], SHOULDER[0], WRIST[0], HEEL[0]])
    right = _visibility(frames, [EYE[1], SHOULDER[1], WRIST[1], HEEL[1]])
    return 0 if left >= right else 1


def fill_gaps(values: FloatArray) -> FloatArray:
    """Linearly interpolate missing samples; hold the edges."""
    valid = ~np.isnan(values)
    idx = np.arange(len(values))
    return np.interp(idx, idx[valid], values[valid])


def smooth(values: FloatArray, sigma_frames: float) -> FloatArray:
    """Gaussian smoothing. Odd reflection at the edges keeps straight-line motion unbiased."""
    if sigma_frames < 0.5 or len(values) < 3:
        return values.copy()
    radius = max(1, int(round(3 * sigma_frames)))
    radius = min(radius, len(values) - 1)
    offsets = np.arange(-radius, radius + 1)
    kernel = np.exp(-0.5 * (offsets / sigma_frames) ** 2)
    kernel /= kernel.sum()
    padded = np.pad(values, radius, mode="reflect", reflect_type="odd")
    return np.convolve(padded, kernel, mode="valid")


def metres_per_pixel(eye: Track, heel: Track, height_cm: float) -> float | None:
    """Scale from the lifter's height, using the most upright frames (eye-to-heel distance)."""
    both = eye.valid & heel.valid
    if both.sum() < 3:
        return None
    distances = np.hypot(eye.x[both] - heel.x[both], eye.y[both] - heel.y[both])
    upright_px = float(np.percentile(distances, 90))
    if upright_px <= 0:
        return None
    return (height_cm / 100) * EYE_HEIGHT_RATIO / upright_px


def _last_index_near(y: FloatArray, start: int, end: int, level: float, below: bool) -> int:
    """Last index in [start, end] where y is still within the band at `level` (pauses are excluded)."""
    idx = start
    for i in range(start, end + 1):
        if (y[i] <= level) if below else (y[i] >= level):
            idx = i
        else:
            break
    return idx


def _first_index_near(y: FloatArray, start: int, end: int, level: float) -> int:
    for i in range(start, end + 1):
        if y[i] >= level:
            return i
    return end


@dataclass
class Phases:
    start: int  # concentric start (bar leaves the bottom / the floor)
    end: int  # concentric end (lockout)
    descent_start: int | None
    bottom: int | None
    rom: float  # full range between lowest and highest bar position


def _phase_indices(lift: Lift, y: FloatArray) -> Phases:
    """Find the lift phases as frame indices.

    Pauses at the start, bottom and top are excluded: a phase begins when the bar has moved
    more than PHASE_BAND of the range away from where it was resting.
    """
    if lift == "squat":
        bottom = int(np.argmin(y))
        top_before = int(np.argmax(y[: bottom + 1]))
        top_after = bottom + int(np.argmax(y[bottom:]))
        band = PHASE_BAND * max(float(y[top_after] - y[bottom]), 1e-9)
        descent_start = _last_index_near(y, top_before, bottom, float(y[top_before]) - band, below=False)
        start = _last_index_near(y, bottom, top_after, float(y[bottom]) + band, below=True)
        end = _first_index_near(y, start, top_after, float(y[top_after]) - band)
        return Phases(start, end, descent_start, bottom, float(y[top_after] - y[bottom]))

    # Deadlift: the bar rests on the floor, rises to lockout.
    top = int(np.argmax(y))
    floor = int(np.argmin(y[: top + 1]))
    band = PHASE_BAND * max(float(y[top] - y[floor]), 1e-9)
    start = _last_index_near(y, floor, top, float(y[floor]) + band, below=True)
    end = _first_index_near(y, start, top, float(y[top]) - band)
    return Phases(start, end, None, None, float(y[top] - y[floor]))


def _sticking_point(v: FloatArray, start: int, end: int) -> int | None:
    """Where the bar slows down after its first burst of speed, then speeds up again."""
    length = end - start
    if length < 6:
        return None
    first_half_end = start + max(2, length // 2)
    first_peak = start + int(np.argmax(v[start:first_half_end]))
    search_end = end - max(1, length // 10)
    if search_end - first_peak < 3:
        return None
    dip = first_peak + int(np.argmin(v[first_peak:search_end]))
    if dip in (first_peak, search_end):
        return None
    slowed = v[dip] < STICKING_DROP * v[first_peak]
    recovered = float(np.max(v[dip : end + 1])) > v[dip] * 1.1
    return dip if slowed and recovered else None


def analyse_motion(
    lift: Lift,
    timestamps: list[float],
    frames: list[PoseFrame],
    image_width: int,
    image_height: int,
    height_cm: float | None,
) -> MotionResult:
    t = np.asarray(timestamps, dtype=np.float64)
    n = len(t)
    warnings: list[str] = []

    side = choose_side(frames)
    wrist = _landmark_track(frames, WRIST[side], image_width, image_height)
    eye = _landmark_track(frames, EYE[side], image_width, image_height)
    heel = _landmark_track(frames, HEEL[side], image_width, image_height)

    detection_rate = float(wrist.valid.mean())
    if detection_rate < MIN_DETECTION_RATE:
        raise MotionError(
            "The lifter's hands were only visible in a few frames, so the bar couldn't be tracked. "
            "Film from the side with your whole body in frame."
        )
    if detection_rate < WARN_DETECTION_RATE:
        warnings.append(
            f"Hands were visible in only {detection_rate:.0%} of frames; gaps were filled in, "
            "so treat speed numbers as rough."
        )

    fps = (n - 1) / (t[-1] - t[0])
    sigma = SMOOTHING_SECONDS * fps
    bar_x = smooth(fill_gaps(wrist.x), sigma)
    bar_y = smooth(fill_gaps(wrist.y), sigma)

    calibrated_scale = metres_per_pixel(eye, heel, height_cm) if height_cm else None
    calibrated = calibrated_scale is not None
    scale: float
    if calibrated_scale is not None:
        scale = calibrated_scale
    else:
        if height_cm:
            warnings.append("Couldn't see your eyes and heels clearly enough to calibrate, so speeds are unavailable.")
        else:
            warnings.append("Add your height to get bar speed in m/s and distances in cm.")
        # Fall back to "body heights" so the path shape can still be drawn.
        body_scale = metres_per_pixel(eye, heel, 100 / EYE_HEIGHT_RATIO)
        scale = body_scale if body_scale is not None else 1.0 / image_height

    # Metres (or body heights), y up, origin at the lowest bar position.
    y = (bar_y.max() - bar_y) * scale
    lowest = int(np.argmin(y))
    x = (bar_x - bar_x[lowest]) * scale
    v = np.gradient(y, t)

    phases_idx = _phase_indices(lift, y)
    start, end = phases_idx.start, phases_idx.end
    descent_start, bottom = phases_idx.descent_start, phases_idx.bottom
    rom = phases_idx.rom
    if rom < (MIN_ROM_M if calibrated else 0.05) or end <= start:
        warnings.append("No clear rep found in this clip. Make sure the trim covers one full rep.")

    stick = _sticking_point(v, start, end)
    concentric_s = float(t[end] - t[start])
    drift = float(np.max(np.abs(x[start : end + 1] - x[start])))

    def per_second(distance: float, seconds: float) -> float | None:
        return round(distance / seconds, 3) if calibrated and seconds > 0 else None

    def cm(value: float) -> float | None:
        return round(value * 100, 1) if calibrated else None

    peak_index = start + int(np.argmax(v[start : end + 1]))
    descent_s = float(t[bottom] - t[descent_start]) if bottom is not None and descent_start is not None else None
    descent_drop = float(y[descent_start] - y[bottom]) if bottom is not None and descent_start is not None else 0.0

    metrics = MotionMetrics(
        rom_cm=cm(rom),
        concentric_s=round(concentric_s, 2),
        mean_velocity=per_second(float(y[end] - y[start]), concentric_s),
        peak_velocity=round(float(v[peak_index]), 3) if calibrated else None,
        peak_velocity_t=round(float(t[peak_index]), 3),
        sticking_point_t=round(float(t[stick]), 3) if stick is not None else None,
        sticking_point_height_cm=cm(float(y[stick] - y[start])) if stick is not None else None,
        max_drift_cm=cm(drift),
        descent_s=round(descent_s, 2) if descent_s is not None else None,
        descent_velocity=per_second(descent_drop, descent_s) if descent_s else None,
    )
    phases = MotionPhases(
        concentric_start=round(float(t[start]), 3),
        concentric_end=round(float(t[end]), 3),
        descent_start=round(float(t[descent_start]), 3) if descent_start is not None else None,
        bottom=round(float(t[bottom]), 3) if bottom is not None else None,
    )
    series = MotionSeries(
        t=[round(float(value), 3) for value in t],
        x=[round(float(value), 4) for value in x],
        y=[round(float(value), 4) for value in y],
        v=[round(float(value), 4) for value in v],
    )
    return MotionResult(
        calibrated=calibrated,
        side="left" if side == 0 else "right",
        detection_rate=round(detection_rate, 3),
        fps=round(float(fps), 1),
        warnings=warnings,
        series=series,
        phases=phases,
        metrics=metrics,
    )
