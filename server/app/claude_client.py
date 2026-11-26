"""Calls Claude with the frames and turns the reply into an AnalysisResult."""

import os
import re

from anthropic import AsyncAnthropic
from anthropic.types import ImageBlockParam, TextBlockParam
from pydantic import ValidationError

from .models import AnalysisResult
from .prompts import build_prompt
from .usage import UsageRecord, record

DEFAULT_MODEL = "claude-haiku-4-5-20251001"
MAX_TOKENS = 1200

_client: AsyncAnthropic | None = None


class ConfigError(Exception):
    """The server is missing configuration, such as the API key."""


class AnalysisError(Exception):
    """Claude answered, but not with a usable analysis."""


def get_client() -> AsyncAnthropic:
    global _client
    if _client is None:
        api_key = os.getenv("ANTHROPIC_API_KEY")
        if not api_key:
            raise ConfigError("ANTHROPIC_API_KEY is not set on the server.")
        _client = AsyncAnthropic(api_key=api_key)
    return _client


def parse_result(text: str) -> AnalysisResult:
    """Extract the JSON object from Claude's reply and validate it."""
    clean = re.sub(r"```(?:json)?", "", text).strip()
    start, end = clean.find("{"), clean.rfind("}")
    if start == -1 or end <= start:
        raise AnalysisError("The AI reply contained no analysis. Please try again.")
    try:
        return AnalysisResult.model_validate_json(clean[start : end + 1])
    except ValidationError as exc:
        raise AnalysisError("The AI reply was incomplete. Please try again.") from exc


def build_content(frames: list[str], lift: str) -> list[ImageBlockParam | TextBlockParam]:
    content: list[ImageBlockParam | TextBlockParam] = [
        {"type": "image", "source": {"type": "base64", "media_type": "image/jpeg", "data": frame}} for frame in frames
    ]
    content.append({"type": "text", "text": build_prompt(lift)})
    return content


async def analyze_frames(frames: list[str], lift: str) -> AnalysisResult:
    model = os.getenv("CLAUDE_MODEL", DEFAULT_MODEL)
    message = await get_client().messages.create(
        model=model,
        max_tokens=MAX_TOKENS,
        messages=[{"role": "user", "content": build_content(frames, lift)}],
    )

    # Record before parsing: the tokens are spent even if the reply is unusable.
    record(
        UsageRecord(
            lift=lift,
            model=model,
            input_tokens=message.usage.input_tokens,
            output_tokens=message.usage.output_tokens,
        )
    )
    text = "".join(block.text for block in message.content if block.type == "text")
    return parse_result(text)
