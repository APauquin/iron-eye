"""Bar path and speed analysis, tested on synthetic lifts with known answers."""

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app import main
from app.motion import EYE_HEIGHT_RATIO, MotionError, analyse_motion, fill_gaps, smooth

FPS = 30
WIDTH = HEIGHT = 1000
LIFTER_CM = 175
M_PER_PX = 0.002  # synthetic camera scale
HEEL_Y = 950
EYE_Y = HEEL_Y - (LIFTER_CM / 100) * EYE_HEIGHT_RATIO / M_PER_PX


def make_pose(bar_x_m: float, bar_y_m: float, visible: float = 0.95) -> list[list[float]]:
    """A side-on pose facing the camera with its left side; only the landmarks we use matter."""
    pose = [[0.5, 0.5, 0.1] for _ in range(33)]
    wrist_px_y = HEEL_Y - bar_y_m / M_PER_PX
    pose[2] = [0.5, EYE_Y / HEIGHT, 0.95]  # left eye
    pose[29] = [0.5, HEEL_Y / HEIGHT, 0.95]  # left heel
    pose[11] = [0.5, 0.3, 0.95]  # left shoulder
    pose[15] = [0.4 + bar_x_m / M_PER_PX / WIDTH, wrist_px_y / HEIGHT, visible]  # left wrist
    return pose


def run(lift, heights_m, xs_m=None, height_cm=LIFTER_CM, drop_every=None):
    n = len(heights_m)
    xs_m = xs_m if xs_m is not None else [0.0] * n
    t = [i / FPS for i in range(n)]
    poses = [make_pose(x, y) for x, y in zip(xs_m, heights_m, strict=True)]
    if drop_every:
        poses = [None if i % drop_every == 0 else p for i, p in enumerate(poses)]
    return analyse_motion(lift, t, poses, WIDTH, HEIGHT, height_cm)


def squat_path(depth=0.5, down_s=1.0, up_s=1.0, pause_s=0.3):
    """Stand, descend at constant speed, ascend at constant speed, stand."""
    top = 1.45
    pause = [top] * int(pause_s * FPS)
    down = list(np.linspace(top, top - depth, int(down_s * FPS)))
    up = list(np.linspace(top - depth, top, int(up_s * FPS)))
    return pause + down + up + pause


def deadlift_path(rom=0.55, up_s=1.1, floor_s=0.4, hold_s=0.4):
    floor = 0.22
    return (
        [floor] * int(floor_s * FPS)
        + list(np.linspace(floor, floor + rom, int(up_s * FPS)))
        + [floor + rom] * int(hold_s * FPS)
    )


def test_squat_speed_depth_and_phases():
    result = run("squat", squat_path(depth=0.5, down_s=1.0, up_s=1.0))
    m = result.metrics
    assert result.calibrated
    assert m.rom_cm == pytest.approx(50, abs=2)
    assert m.mean_velocity == pytest.approx(0.5, abs=0.05)
    assert m.descent_velocity == pytest.approx(0.5, abs=0.05)
    assert m.descent_s == pytest.approx(1.0, abs=0.1)
    assert result.phases.bottom == pytest.approx(0.3 + 1.0, abs=0.07)


def test_deadlift_starts_at_liftoff():
    result = run("deadlift", deadlift_path(rom=0.55, up_s=1.1, floor_s=0.4))
    m = result.metrics
    assert result.phases.concentric_start == pytest.approx(0.4, abs=0.1)
    assert m.rom_cm == pytest.approx(55, abs=2)
    assert m.mean_velocity == pytest.approx(0.5, abs=0.06)
    assert m.descent_s is None


def test_sticking_point_found_where_bar_slows():
    # Fast out of the hole, slow grind in the middle, fast to lockout.
    bottom, segments = 0.95, [(0.15, 0.25), (0.10, 0.60), (0.25, 0.35)]
    path, y = [1.45] * 9 + list(np.linspace(1.45, bottom, 30)), bottom
    for rise, seconds in segments:
        path += list(np.linspace(y, y + rise, int(seconds * FPS)))[1:]
        y += rise
    path += [y] * 9
    result = run("squat", path)
    stick_t = result.metrics.sticking_point_t
    grind_start = (9 + 30 + int(0.25 * FPS)) / FPS
    assert stick_t is not None
    assert grind_start - 0.1 < stick_t < grind_start + 0.6


def test_no_sticking_point_on_smooth_rep():
    assert run("squat", squat_path()).metrics.sticking_point_t is None


def test_horizontal_drift_measured():
    # Bar drifts 5 cm forward, steadily, on the way up.
    path = squat_path(depth=0.5, down_s=1.0, up_s=1.0, pause_s=0.3)
    up_start, up_frames = 9 + 30, 30
    drift = [0.05 * min(max(i - up_start, 0), up_frames) / up_frames for i in range(len(path))]
    result = run("squat", path, xs_m=drift)
    assert result.metrics.max_drift_cm == pytest.approx(5, abs=0.6)


def test_gaps_are_filled_with_a_warning():
    result = run("squat", squat_path(), drop_every=3)
    assert result.detection_rate == pytest.approx(0.66, abs=0.02)
    assert any("visible in only" in w for w in result.warnings)
    assert result.metrics.mean_velocity == pytest.approx(0.5, abs=0.06)


def test_without_height_speeds_are_withheld():
    result = run("squat", squat_path(), height_cm=None)
    assert not result.calibrated
    assert result.metrics.mean_velocity is None
    assert result.metrics.concentric_s == pytest.approx(1.0, abs=0.1)
    assert any("Add your height" in w for w in result.warnings)


def test_barely_visible_lifter_is_rejected():
    t = [i / FPS for i in range(40)]
    poses = [make_pose(0, 1.0) if i < 5 else None for i in range(40)]
    with pytest.raises(MotionError):
        analyse_motion("squat", t, poses, WIDTH, HEIGHT, LIFTER_CM)


def test_no_rep_in_clip_warns():
    result = run("squat", [1.45] * 60)
    assert any("No clear rep" in w for w in result.warnings)


def test_fill_gaps_and_smooth_keep_shape():
    filled = fill_gaps(np.array([np.nan, 1.0, np.nan, 3.0, np.nan]))
    assert filled.tolist() == [1.0, 1.0, 2.0, 3.0, 3.0]
    ramp = np.linspace(0, 10, 50)
    assert np.allclose(smooth(ramp, 2.0), ramp, atol=1e-6)


# ─── API ─────────────────────────────────────────────────────────────────────

client = TestClient(main.app)


def payload(**overrides):
    path = squat_path()
    body = {
        "lift": "squat",
        "heightCm": LIFTER_CM,
        "imageWidth": WIDTH,
        "imageHeight": HEIGHT,
        "timestamps": [i / FPS for i in range(len(path))],
        "poses": [make_pose(0, y) for y in path],
    }
    body.update(overrides)
    return body


def test_motion_endpoint_returns_camel_case():
    res = client.post("/api/motion", json=payload())
    assert res.status_code == 200
    body = res.json()
    assert body["metrics"]["meanVelocity"] == pytest.approx(0.5, abs=0.05)
    assert len(body["series"]["t"]) == len(body["series"]["v"])


def test_motion_endpoint_rejects_mismatched_lengths():
    body = payload()
    body["timestamps"] = body["timestamps"][:-1]
    assert client.post("/api/motion", json=body).status_code == 422


def test_motion_endpoint_rejects_unordered_timestamps():
    body = payload()
    body["timestamps"][5] = body["timestamps"][4]
    assert client.post("/api/motion", json=body).status_code == 422


def test_motion_endpoint_reports_untrackable_clip():
    body = payload(poses=[None] * len(payload()["poses"]))
    res = client.post("/api/motion", json=body)
    assert res.status_code == 422
    assert "Film from the side" in res.json()["detail"]
