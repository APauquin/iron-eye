"""Request and response schemas for the Iron Eye API.

Python fields use snake_case; JSON uses camelCase so the React app can
read results without any key mapping.
"""

from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
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
    overall_score: int = Field(ge=1, le=10)
    summary: str
    strengths: list[str] = Field(default_factory=list)
    corrections: list[Correction] = Field(default_factory=list)
    cues: list[str] = Field(default_factory=list)

    @field_validator("overall_score", mode="before")
    @classmethod
    def round_score(cls, value: object) -> object:
        """The model sometimes answers 7.5 or "7"; accept and round those."""
        try:
            return round(float(value))  # type: ignore[arg-type]
        except (TypeError, ValueError):
            return value
