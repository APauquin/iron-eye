"""Coaching prompt sent to Claude alongside the video frames."""

import json

LIFT_NAMES = {"deadlift": "deadlift", "squat": "back squat"}

# Shown to the model as the exact shape to return.
EXAMPLE_RESPONSE = {
    "overallScore": 7,
    "summary": "2-3 sentence overview mentioning best strength and biggest issue.",
    "strengths": ["specific positive 1", "specific positive 2"],
    "corrections": [
        {"issue": "specific problem", "fix": "exact coaching cue", "priority": "high", "bodyParts": ["torso"]},
        {"issue": "secondary issue", "fix": "cue", "priority": "medium", "bodyParts": ["femur", "shin"]},
    ],
    "cues": ["short cue 1", "short cue 2", "short cue 3"],
}


def build_prompt(lift: str) -> str:
    name = LIFT_NAMES.get(lift, lift)
    return f"""You are an elite powerlifting coach analysing a {name} from sequential video frames.
Evaluate setup, body positions throughout the lift, bar path, joint sequencing, and lockout.
Be specific and practical. Score 10 = competition-ready, 5 = average gym-goer.

For each correction, the "bodyParts" array MUST use ONLY these exact tags (1-3 per issue):
- "head"  -> head/neck position
- "torso" -> back, spine, shoulders, hips, core
- "arms"  -> shoulders, elbows, wrists, grip
- "femur" -> thighs, quads, hip-to-knee segment
- "shin"  -> knee-to-ankle segment, calves
- "feet"  -> foot position, weight distribution

"priority" must be "high", "medium" or "low". "overallScore" must be a whole number from 1 to 10.

Respond ONLY with raw JSON, no markdown, no backticks, no preamble, in exactly this shape:
{json.dumps(EXAMPLE_RESPONSE)}"""
