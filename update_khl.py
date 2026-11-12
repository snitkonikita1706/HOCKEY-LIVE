"""Update KHL calendar using the documented KHL Webcaster mobile API.
Stores only fixture metadata. No video feeds or access credentials are collected.
"""
import datetime as dt
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

OUT = Path(__file__).resolve().parent / "data" / "khl.json"
BASE = "https://khl.api.webcaster.pro/api/khl_mobile/events_v2.json"
TZ = dt.timezone(dt.timedelta(hours=5))
now = dt.datetime.now(dt.timezone.utc)
start = int((now - dt.timedelta(days=7)).timestamp())
end = int((now + dt.timedelta(days=16)).timestamp())

def get_json(page):
    params = {
        "locale": "ru",
        "page": str(page),
        "order_direction": "asc",
        "q[start_at_gt_time_from_unixtime]": str(start),
        "q[start_at_lt_time_from_unixtime]": str(end),
    }
    url = BASE + "?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(url, headers={
        "User-Agent": "HOCKEY-LIVE/2.1 (personal schedule client)",
        "Accept": "application/json",
        "Accept-Language": "ru",
    })
    with urllib.request.urlopen(req, timeout=18) as response:
        return json.load(response)

def events_from(body):
    # The mobile API has returned both nested and top-level event collections
    # across revisions. Do not guess games from unrelated statistics objects.
    if isinstance(body, list):
        return body
    if not isinstance(body, dict):
        raise ValueError("Unexpected JSON root type")
    for node in (body, body.get("data"), body.get("result")):
        if isinstance(node, list):
            return node
        if isinstance(node, dict):
            for field in ("events", "items", "results", "games"):
                if isinstance(node.get(field), list):
                    return node[field]
    raise ValueError("No events array; top-level keys: " + ",".join(body.keys()))

def name(event, prefix):
    team = event.get(prefix)
    if isinstance(team, dict):
        return team.get("name") or team.get("title") or team.get("location")
    return event.get(prefix + "_name") or event.get(prefix + "_title")

def team_logo(g, prefix):
    team = g.get(prefix)
    image = team.get("image") if isinstance(team, dict) else None
    if isinstance(image, dict):
        image = image.get("url") or image.get("original") or image.get("src")
    if not isinstance(image, str):
        return None
    image = image.strip()
    if image.startswith("//"):
        image = "https:" + image
    elif image.startswith("/"):
        image = "https://khl.api.webcaster.pro" + image
    # Never display unknown schemes or untrusted active content.
    if not image.startswith("https://"):
        return None
    return image

def number(v):
    if v is None or v == "":
        return None
    try:
        return int(v)
    except (ValueError, TypeError):
        return None

def first(*values):
    return next((v for v in values if v is not None), None)

def parse_game(g):
    if not isinstance(g, dict):
        return None
    if isinstance(g.get("event"), dict):
        g = g["event"]
    home = name(g, "team_a")
    away = name(g, "team_b")
    if not home or not away:
        return None
    raw_time = first(g.get("start_at"), g.get("start_at_time"), g.get("start_timestamp"))
    if isinstance(raw_time, dict):
        raw_time = first(raw_time.get("timestamp"), raw_time.get("time"))
    try:
        if isinstance(raw_time, (int, float)) or str(raw_time).isdigit():
            stamp = float(raw_time)
            if stamp > 1e12:
                stamp /= 1000
            started = dt.datetime.fromtimestamp(stamp, dt.timezone.utc)
        else:
            started = dt.datetime.fromisoformat(str(raw_time).replace("Z", "+00:00"))
            if started.tzinfo is None:
                started = started.replace(tzinfo=dt.timezone.utc)
    except (TypeError, ValueError, OSError):
        return None
    if not start <= started.timestamp() <= end:
        return None
    state = str(first(g.get("game_state_key"), g.get("status_key"), g.get("status"), "")).lower()
    finished = state in ("finished", "completed", "ended", "final")
    live = state in ("live", "inprogress", "in_progress", "started", "playing")
    score_a = first(g.get("team_a_gf"), g.get("team_a_score"), g.get("home_score"))
    score_b = first(g.get("team_b_gf"), g.get("team_b_score"), g.get("away_score"))
    # Webcaster provides the authoritative final score as "a:b".
    combined = g.get("score")
    if isinstance(combined, str):
        m = re.fullmatch(r"\s*(\d+)\s*[:–-]\s*(\d+)\s*", combined)
        if m:
            score_a, score_b = int(m.group(1)), int(m.group(2))
    gid = first(g.get("khl_id"), g.get("match_id"), g.get("id"))
    if gid is None:
        return None
    # Public match metadata from the same Webcaster API family as the official KHL app.
    # No media URLs, account tokens or DRM material are collected.
    webcaster_id = g.get("id")
    khl_id = g.get("khl_id")
    broadcast = {}
    if isinstance(g.get("hd"), bool):
        broadcast["hd"] = g["hd"]
    if isinstance(g.get("commentator"), bool):
        broadcast["commentator"] = g["commentator"]
    if isinstance(g.get("has_video"), bool):
        broadcast["hasVideo"] = g["has_video"]
    if isinstance(g.get("free"), bool):
        broadcast["freeFlag"] = g["free"]
    if isinstance(g.get("yandex_rights"), bool):
        broadcast["yandexRights"] = g["yandex_rights"]
    if g.get("type_id") is not None:
        broadcast["eventType"] = number(g["type_id"])
    return {
        "league": "KHL", "id": str(gid),
        "webcasterId": str(webcaster_id) if webcaster_id is not None else None,
        "khlId": str(khl_id) if khl_id is not None else None,
        "broadcastMeta": broadcast,
        "home": str(home), "away": str(away),
        "homeLogo": team_logo(g, "team_a"),
        "awayLogo": team_logo(g, "team_b"),
        "homeScore": number(score_a) if finished or live else None,
        "awayScore": number(score_b) if finished or live else None,
        "time": started.astimezone(dt.timezone.utc).isoformat().replace("+00:00", "Z"),
        "status": "done" if finished else "live" if live else "scheduled",
        "watch": "https://www.khl.ru/calendar/",
    }

def main():
    games = {}
    for page in range(1, 20):
        try:
            payload = get_json(page)
            rows = events_from(payload)
        except Exception as exc:
            print(f"ERROR: KHL Webcaster API page {page}: {type(exc).__name__}: {exc}", flush=True)
            return 1 if not games else 0
        print(f"Page {page}: {len(rows)} records", flush=True)
        if page == 1 and rows:
            sample = rows[0].get("event", rows[0]) if isinstance(rows[0], dict) else {}
            print("Sample event fields: " + ",".join(sample.keys())[:800] if isinstance(sample, dict) else "Sample not an object")
        if page == 1:
            for sample_row in rows[:3]:
                e = sample_row.get("event", sample_row) if isinstance(sample_row, dict) else {}
                if isinstance(e, dict):
                    print("Score diagnostics: " + repr({k:e.get(k) for k in ("score","scores","sscore","game_state_key")})[:500], flush=True)
        for event in rows:
            game = parse_game(event)
            if game:
                games[game["id"]] = game
        if len(rows) < 16:
            break
        time.sleep(1.1)
    if not games:
        print("ERROR: No valid KHL games were extracted; retaining previous data.", flush=True)
        return 1
    result = {
        "updatedAt": now.isoformat(),
        "source": "KHL Webcaster mobile scoreboard",
        "games": sorted(games.values(), key=lambda game: game["time"]),
    }
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Saved {len(games)} KHL fixtures", flush=True)
    return 0

if __name__ == "__main__":
    sys.exit(main())
