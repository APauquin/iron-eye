"""Request and response schemas for the Iron Eye API.

Python fields use snake_case; JSON uses camelCase so the React app can
read results without any key mapping.
"""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator
from pydantic.alias_generators import to_camel

# Lifts the backend can analyse. Enabling bench or overhead press later
# means adding it here and in the LIFTS config on the frontend.
Lift = Literal["deadlift", "squat"]
BodyPart = Literal["head", "torso", "arms", "femur", "shin", "feet"]
Priority = Literal["high", "medium", "low"]

# A 720px-wide JPEG frame is well under 1 MB as base64.
Base64Frame = Annotated[str, Field(min_length=100, max_length=2_000_000)]


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


class AnalyzeRequest(CamelModel):
    lift: Lift
    frames: list[Base64Frame] = Field(min_length=2, max_length=8)


class Correction(CamelModel):
    issue: str
    fix: str
    priority: Priority = "medium"
    body_parts: list[BodyPart] = Field(default_factory=list, max_length=3)


class AnalysisResult(CamelModel):
    summary: str
    strengths: list[str] = Field(default_factory=list)
    corrections: list[Correction] = Field(default_factory=list)
    cues: list[str] = Field(default_factory=list)


# ─── Motion analysis (bar path and speed, computed locally, no AI) ─────────────

# One MediaPipe landmark: normalised x, normalised y, visibility (0..1)
Landmark = Annotated[list[float], Field(min_length=3, max_length=3)]
# All 33 landmarks for one frame, or null when no person was detected
PoseFrame = Annotated[list[Landmark], Field(min_length=33, max_length=33)] | None


class MotionRequest(CamelModel):
    lift: Lift
    height_cm: float | None = Field(default=None, ge=100, le=250)
    image_width: int = Field(gt=0, le=8000)
    image_height: int = Field(gt=0, le=8000)
    timestamps: list[float] = Field(min_length=10, max_length=900)
    poses: list[PoseFrame] = Field(min_length=10, max_length=900)

    @model_validator(mode="after")
    def check_frames(self) -> "MotionRequest":
        if len(self.timestamps) != len(self.poses):
            raise ValueError("timestamps and poses must have the same length")
        if any(b <= a for a, b in zip(self.timestamps, self.timestamps[1:], strict=False)):
            raise ValueError("timestamps must be strictly increasing")
        return self


class MotionSeries(CamelModel):
    t: list[float]
    x: list[float]
    y: list[float]
    v: list[float]


class MotionPhases(CamelModel):
    concentric_start: float
    concentric_end: float
    descent_start: float | None = None
    bottom: float | None = None


class MotionMetrics(CamelModel):
    rom_cm: float | None
    concentric_s: float
    mean_velocity: float | None
    peak_velocity: float | None
    peak_velocity_t: float
    sticking_point_t: float | None
    sticking_point_height_cm: float | None
    max_drift_cm: float | None
    descent_s: float | None
    descent_velocity: float | None


class MotionResult(CamelModel):
    calibrated: bool
    side: Literal["left", "right"]
    detection_rate: float
    fps: float
    warnings: list[str]
    series: MotionSeries
    phases: MotionPhases
    metrics: MotionMetrics
