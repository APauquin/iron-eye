# Iron Eye

AI form coach for barbell lifts. Film a squat or deadlift, trim it to one rep, and get a coach summary, prioritized corrections and coaching cues, with a pose skeleton drawn over key frames and problem areas highlighted in red.

## How it works

```
Browser (React + TypeScript)                  Server (Python + FastAPI)
────────────────────────────                  ─────────────────────────
pick lift → upload → trim clip
extract 6 frames from the clip
MediaPipe pose detection per frame
POST /api/analyze { lift, frames }  ───────▶  validate request (Pydantic)
                                              build coaching prompt
                                              call Claude (vision)
                                              log tokens + cost
                                              validate reply (Pydantic)
render summary, skeletons    ◀────────────  JSON result
```

The Anthropic API key and the prompt live only on the server, never in the browser.

## Stack

- **Frontend:** React 19, TypeScript, Vite, MediaPipe Pose Landmarker
- **Backend:** Python 3.11+, FastAPI, Pydantic v2, Anthropic SDK
- **Quality:** pytest, ruff, mypy (strict), ESLint, TypeScript strict mode
- **Model:** Claude Haiku 4.5, roughly $0.01 per analysis

## Project layout

```
src/
  IronEye.tsx          app flow and state
  screens/             Select, Upload, Analysing, Results
  components/          VideoTrimmer, SkeletonOverlay, Modal, ...
  lib/                 frame extraction, pose detection, API client
  config/lifts.ts      lift definitions, filming guidelines, limits
server/
  app/main.py          FastAPI routes
  app/claude_client.py Claude call and reply parsing
  app/models.py        request/response schemas
  app/prompts.py       coaching prompt
  app/usage.py         token and cost tracking
  tests/
```

## Run locally

Requires Node 22.13+ and Python 3.11+.

**Backend** (first terminal):

```bash
cd server
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env        # add your Anthropic key
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

**Frontend** (second terminal, project root):

```bash
npm install
npm run dev
```

Open http://localhost:5173. Vite forwards `/api` to the backend.

## Usage and cost tracking

Every analysis is appended to `server/usage.jsonl` with its token counts and estimated cost, and logged in the server terminal. Running totals:

```bash
curl http://localhost:8000/api/usage
```

## Checks

```bash
# backend
cd server && ruff check . && ruff format --check . && mypy app && pytest

# frontend
npm run lint && npm run typecheck && npm run build
```

## Status

| Lift | Status |
| --- | --- |
| Squat | Working |
| Deadlift | Working |
| Bench press | Planned |
| Overhead press | Planned |

## Roadmap

- [ ] Joint angles (hip, knee, back) computed server-side with MediaPipe Python
- [ ] Bar path tracking with OpenCV
- [ ] Dockerfile and deployment
- [ ] Bench press and overhead press
- [ ] Mobile builds with Capacitor
