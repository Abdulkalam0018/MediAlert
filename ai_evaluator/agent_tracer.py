"""
agent_tracer.py — MediAlert AI Evaluator
=========================================
Implements a ReAct (Reasoning + Acting) agentic loop using the Google Gemini
SDK (google-genai) and Function Calling. The agent:
  1. Receives a natural-language health question.
  2. Gemini decides which tool to call (fetch_user_medications / fetch_today_doses /
     fetch_adherence_summary).
  3. Python intercepts the tool call, hits the live Node.js backend via HTTP.
  4. The JSON response is fed back to Gemini for a final answer.
  5. Every step is logged with millisecond-precision latency to agent_execution.log.

Usage:
    python agent_tracer.py
    python agent_tracer.py --userId <your_mongo_userId> --question "Did I take my meds today?"

Requirements:
    pip install google-genai requests python-dotenv
"""

import argparse
import json
import logging
import os
import sys
import time
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv
from google import genai
from google.genai import types

# ── Load env ────────────────────────────────────────────────────────────────
# Reads GEMINI_API_KEY and INTERNAL_API_KEY from backend/.env
_root = Path(__file__).resolve().parent.parent
load_dotenv(_root / "backend" / ".env")

GEMINI_API_KEY   = os.getenv("GEMINI_API_KEY", "")
INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "medialert-internal-agent-key-2025")
BACKEND_URL      = os.getenv("BACKEND_URL", "http://localhost:8000")
GEMINI_MODEL     = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

if not GEMINI_API_KEY:
    print("[ERROR] GEMINI_API_KEY not set. Add it to backend/.env")
    sys.exit(1)

# ── Logging setup ─────────────────────────────────────────────────────────────
LOG_FILE = Path(__file__).parent / "agent_execution.log"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s.%(msecs)03d | %(levelname)-8s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("agent_tracer")


# ══════════════════════════════════════════════════════════════════════════════
# TOOL DEFINITIONS — mirror your Node.js internal API endpoints
# ══════════════════════════════════════════════════════════════════════════════

TOOLS = [
    types.Tool(
        function_declarations=[
            # ── Tool 1: fetch_user_medications ─────────────────────────────
            types.FunctionDeclaration(
                name="fetch_user_medications",
                description=(
                    "Fetches the list of all active medications (elixirs) prescribed "
                    "for a specific user from the MediAlert database. Returns medication "
                    "name, dosage, frequency, start date, and end date."
                ),
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "userId": types.Schema(
                            type=types.Type.STRING,
                            description="The MongoDB user ID (userId field in the database).",
                        )
                    },
                    required=["userId"],
                ),
            ),
            # ── Tool 2: fetch_today_doses ───────────────────────────────────
            types.FunctionDeclaration(
                name="fetch_today_doses",
                description=(
                    "Fetches today's medication dose schedule for a user — including "
                    "each dose's scheduled time, medication name, dosage, and whether "
                    "the dose was taken, missed, or is still pending."
                ),
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "userId": types.Schema(
                            type=types.Type.STRING,
                            description="The MongoDB user ID.",
                        )
                    },
                    required=["userId"],
                ),
            ),
            # ── Tool 3: fetch_adherence_summary ────────────────────────────
            types.FunctionDeclaration(
                name="fetch_adherence_summary",
                description=(
                    "Returns a 7-day medication adherence summary for a user: total "
                    "doses scheduled, how many were taken, missed, or pending, and "
                    "the overall adherence percentage."
                ),
                parameters=types.Schema(
                    type=types.Type.OBJECT,
                    properties={
                        "userId": types.Schema(
                            type=types.Type.STRING,
                            description="The MongoDB user ID.",
                        )
                    },
                    required=["userId"],
                ),
            ),
        ]
    )
]


# ══════════════════════════════════════════════════════════════════════════════
# TOOL EXECUTOR — makes real HTTP calls to your Node.js backend
# ══════════════════════════════════════════════════════════════════════════════

def _http_get(path: str) -> dict:
    """Makes an authenticated GET request to the Node.js internal API."""
    url = f"{BACKEND_URL}{path}"
    headers = {"x-internal-key": INTERNAL_API_KEY}
    t0 = time.monotonic()
    try:
        resp = requests.get(url, headers=headers, timeout=10)
        latency_ms = (time.monotonic() - t0) * 1000
        log.info(f"HTTP GET {url} → {resp.status_code} ({latency_ms:.1f}ms)")
        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.ConnectionError:
        log.error(f"Cannot connect to backend at {BACKEND_URL}. Is the Node.js server running?")
        return {"error": f"Backend offline at {BACKEND_URL}"}
    except requests.exceptions.HTTPError as e:
        log.error(f"HTTP error: {e}")
        return {"error": str(e)}
    except Exception as e:
        log.error(f"Unexpected error calling backend: {e}")
        return {"error": str(e)}


def execute_tool(tool_name: str, args: dict) -> dict:
    """
    Routes a Gemini function call to the matching Node.js endpoint.
    Returns the JSON payload that gets sent back to Gemini.
    """
    user_id = args.get("userId", "")

    if tool_name == "fetch_user_medications":
        return _http_get(f"/api/v1/internal/medications/{user_id}")

    elif tool_name == "fetch_today_doses":
        return _http_get(f"/api/v1/internal/today/{user_id}")

    elif tool_name == "fetch_adherence_summary":
        return _http_get(f"/api/v1/internal/adherence/{user_id}")

    else:
        log.warning(f"Unknown tool requested by Gemini: {tool_name}")
        return {"error": f"Unknown tool: {tool_name}"}


# ══════════════════════════════════════════════════════════════════════════════
# REACT AGENT LOOP
# ReAct = Reasoning (Gemini thinks) + Acting (Python calls the tool)
# ══════════════════════════════════════════════════════════════════════════════

def run_agent(user_id: str, question: str) -> str:
    """
    Runs the ReAct loop:
      Turn 1: Send user question → Gemini responds with a tool call
      Turn N: Execute tool → feed result back → Gemini generates final answer
    Returns the final text response from Gemini.
    """
    session_id = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    log.info("=" * 70)
    log.info(f"SESSION START  | id={session_id}")
    log.info(f"USER ID        | {user_id}")
    log.info(f"QUESTION       | {question}")
    log.info(f"MODEL          | {GEMINI_MODEL}")
    log.info("=" * 70)

    # ── Initialize Gemini client ───────────────────────────────────────────
    client = genai.Client(api_key=GEMINI_API_KEY)

    # ── System instruction — sets persona and context ─────────────────────
    system_instruction = (
        "You are Sanji, the AI health assistant for MediAlert — a smart medication "
        "management app. You help users understand their medication schedules and "
        "adherence. You have access to real-time tools to fetch live data from the "
        "MediAlert database. Always use the tools to get accurate, personalized data "
        "before answering. Be concise, warm, and medically responsible."
    )

    # ── Build initial message ──────────────────────────────────────────────
    messages = [
        types.Content(
            role="user",
            parts=[types.Part(text=f"My userId is '{user_id}'. {question}")]
        )
    ]

    agent_start = time.monotonic()
    turn = 0
    final_text = ""

    while True:
        turn += 1
        log.info(f"─── TURN {turn} ─────────────────────────────────────────────────────")

        t0 = time.monotonic()
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=messages,
            config=types.GenerateContentConfig(
                system_instruction=system_instruction,
                tools=TOOLS,
                temperature=0.3,
            ),
        )
        gemini_latency = (time.monotonic() - t0) * 1000
        log.info(f"Gemini latency | {gemini_latency:.1f}ms")

        candidate = response.candidates[0]
        tool_calls_this_turn = []

        # Collect all parts from this Gemini response
        function_calls = []
        text_parts = []

        for part in candidate.content.parts:
            if part.function_call:
                function_calls.append(part.function_call)
            elif part.text:
                text_parts.append(part.text)

        # ── If Gemini wants to call tools ─────────────────────────────────
        if function_calls:
            # Add Gemini's response (with tool calls) to message history
            messages.append(candidate.content)

            # Execute each tool and collect results
            tool_results = []
            for fc in function_calls:
                tool_name = fc.name
                tool_args = dict(fc.args)

                log.info(f"TOOL CALLED    | {tool_name}")
                log.info(f"TOOL ARGS      | {json.dumps(tool_args, indent=2)}")

                t_exec = time.monotonic()
                result = execute_tool(tool_name, tool_args)
                tool_latency = (time.monotonic() - t_exec) * 1000

                log.info(f"TOOL RESULT    | {json.dumps(result, default=str)[:500]}...")
                log.info(f"TOOL LATENCY   | {tool_latency:.1f}ms")

                tool_calls_this_turn.append({
                    "tool": tool_name,
                    "args": tool_args,
                    "latency_ms": round(tool_latency, 1),
                })

                tool_results.append(
                    types.Part.from_function_response(
                        name=tool_name,
                        response=result,
                    )
                )

            # Feed all tool results back to Gemini
            messages.append(
                types.Content(role="user", parts=tool_results)
            )
            # Loop — Gemini will now generate a final answer

        else:
            # ── Gemini gave a text answer — we're done ─────────────────────
            final_text = "\n".join(text_parts).strip()
            total_latency = (time.monotonic() - agent_start) * 1000

            log.info(f"FINAL ANSWER   | {final_text}")
            log.info(f"TOTAL LATENCY  | {total_latency:.1f}ms across {turn} turns")
            log.info(f"SESSION END    | id={session_id}")
            log.info("=" * 70)
            break

        # Guard: max 5 turns to avoid infinite loops
        if turn >= 5:
            log.warning("Max turns reached — forcing exit.")
            final_text = " ".join(text_parts) or "[Agent reached max turns without a final answer]"
            break

    return final_text


# ══════════════════════════════════════════════════════════════════════════════
# EVALUATION HARNESS
# Runs multiple test questions and grades the agent's responses
# ══════════════════════════════════════════════════════════════════════════════

def run_evaluation_suite(user_id: str):
    """
    Runs a predefined set of test prompts and logs quality scores.
    This is the 'evaluation' layer Apple's JD references.
    """
    test_cases = [
        {
            "question": "Did I take all my medications today?",
            "expected_tools": ["fetch_today_doses"],
            "pass_keywords": ["taken", "missed", "pending", "dose"],
        },
        {
            "question": "What medications am I currently on?",
            "expected_tools": ["fetch_user_medications"],
            "pass_keywords": ["medication", "dosage", "mg"],
        },
        {
            "question": "How well have I been sticking to my medication schedule this week?",
            "expected_tools": ["fetch_adherence_summary"],
            "pass_keywords": ["adherence", "%", "days"],
        },
    ]

    log.info("▶▶▶  EVALUATION SUITE STARTED  ◀◀◀")
    results = []

    for i, tc in enumerate(test_cases, 1):
        log.info(f"\n{'━'*60}")
        log.info(f"TEST CASE {i}/{len(test_cases)}: {tc['question']}")
        t0 = time.monotonic()
        answer = run_agent(user_id, tc["question"])
        total_ms = (time.monotonic() - t0) * 1000

        # Simple keyword-based quality check
        answer_lower = answer.lower()
        kw_hits = [kw for kw in tc["pass_keywords"] if kw in answer_lower]
        quality_score = round(len(kw_hits) / len(tc["pass_keywords"]) * 100)

        result = {
            "test": i,
            "question": tc["question"],
            "latency_ms": round(total_ms, 1),
            "quality_score": f"{quality_score}%",
            "keywords_found": kw_hits,
            "answer_snippet": answer[:200],
        }
        results.append(result)

        log.info(f"QUALITY SCORE  | {quality_score}% (keywords: {kw_hits})")
        log.info(f"END-TO-END     | {total_ms:.1f}ms")
        print(f"\n{'─'*60}")
        print(f"Q: {tc['question']}")
        print(f"A: {answer}")
        print(f"Score: {quality_score}% | Latency: {total_ms:.0f}ms")

    log.info("\n▶▶▶  EVALUATION SUITE COMPLETE  ◀◀◀")
    log.info(f"Results: {json.dumps(results, indent=2)}")
    return results


# ══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

def main():
    parser = argparse.ArgumentParser(
        description="MediAlert AI Agent Tracer — Gemini + Function Calling + ReAct loop"
    )
    parser.add_argument(
        "--userId",
        default="",
        help="MongoDB userId to query (leave blank to be prompted)",
    )
    parser.add_argument(
        "--question",
        default="",
        help='Natural language question (e.g., "Did I take my meds today?")',
    )
    parser.add_argument(
        "--eval",
        action="store_true",
        help="Run the full evaluation suite instead of a single question",
    )
    args = parser.parse_args()

    user_id = args.userId or input("Enter your MongoDB userId: ").strip()
    if not user_id:
        print("[ERROR] userId is required.")
        sys.exit(1)

    print(f"\n{'═'*60}")
    print(f"  MediAlert AI Agent Tracer")
    print(f"  Model   : {GEMINI_MODEL}")
    print(f"  Backend : {BACKEND_URL}")
    print(f"  Log     : {LOG_FILE}")
    print(f"{'═'*60}\n")

    if args.eval:
        run_evaluation_suite(user_id)
    else:
        question = args.question or input("Ask the AI a health question: ").strip()
        if not question:
            question = "Did I take all my medications today?"
        answer = run_agent(user_id, question)
        print(f"\n{'─'*60}")
        print(f"🤖 Sanji says: {answer}")
        print(f"{'─'*60}")
        print(f"\n📋 Full trace written to: {LOG_FILE}")


if __name__ == "__main__":
    main()

