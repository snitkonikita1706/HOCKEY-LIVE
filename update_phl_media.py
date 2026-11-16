#!/usr/bin/env python3
"""Official Pro Hokei Ligasy match schedule and embedded YouTube IDs.

Reads only official game pages and YouTube IDs explicitly embedded there.
No stream extraction, rebroadcast, YouTube scraping or rights bypass.
"""
from __future__ import annotations
import concurrent.futures
import datetime as dt
import html
import json
import re
import urllib.request
from pathlib import Path

BASE = "https://pro.ligasy.kz"
DATA = Path("pilot/phl.json")
MEDIA = Path("pilot/videos.json")
LOCAL_TZ = dt.timezone(dt.timedelta(hours=5))
NAMES = {
    "Almaty": "Алматы", "Aqtóbe": "Актобе", "Arlan": "Арлан",
    "Beibarys": "Бейбарыс", "Ertis": "Иртыш", "Gornyak": "Горняк",
    "Nomad": "Номад", "Qulager": "Кулагер", "Saryarqa": "Сарыарка",
    "Torpedo": "Торпедо",
}
SLUG = {
    "alm": "Алматы", "aqt": "Актобе", "arl": "Арлан",
    "bei": "Бейбарыс", "ert": "Иртыш", "gor": "Горняк",
    "nom": "Номад", "qul": "Кулагер", "sar": "Сарыарка",
    "tor": "Торпедо",
}

def download(url: str) -> str:
    if not url.startswith(BASE + "/ru/"):
        raise ValueError("Untrusted source")
    request = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (HOCKEY-LIVE public fixture sync)", "Accept": "text/html"})
    with urllib.request.urlopen(request, timeout=22) as response:
        return response.read().decode("utf-8", errors="replace")

def strip(value: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]*>", " ", value))).strip()

def match(pattern: str, content: str):
    return re.search(pattern, content, re.I | re.S)

def parse_schedule(content: str):
    section = match(r'<table\b[^>]*class="table-matches"[^>]*>(.*?)</table>', content)
    if not section:
        raise ValueError("Official schedule table missing")
    games = []
    for row in re.findall(r'<tr\b[^>]*>(.*?)</tr>', section.group(1), re.I | re.S):
        cells = re.findall(r'<td\b[^>]*>(.*?)</td>', row, re.I | re.S)
        if len(cells) != 6:
            continue
        num = re.search(r'\d+', strip(cells[0]))
        date = re.search(r'\b(\d{1,2})\.(\d{1,2})\.(20\d\d)\b', strip(cells[1]))
        clock = re.search(r'\b(\d\d?):(\d\d)\b', strip(cells[2]))
        home = match(r'<strong>(.*?)</strong>', cells[3])
        away = match(r'<strong>(.*?)</strong>', cells[4])
        if not (num and date and clock and home and away):
            continue
        day, month, year = map(int, date.groups())
        logos = [match(r'<img[^>]+src="(https://[^"]+)"', cell) for cell in cells[3:5]]
        score = re.search(r'\b(\d+)\s*:\s*(\d+)\b', strip(cells[5]))
        direct = match(r'href="(https://pro\.ligasy\.kz/ru/game/[a-zA-Z0-9-]+)"', cells[5])
        stamp = dt.datetime(year, month, day, int(clock.group(1)), int(clock.group(2)), tzinfo=LOCAL_TZ)
        game = {
            "id": f"PHL-{year}-{num.group(0)}", "league": "PHL",
            "home": NAMES.get(strip(home.group(1)), strip(home.group(1))),
            "away": NAMES.get(strip(away.group(1)), strip(away.group(1))),
            "date": stamp.isoformat(timespec="seconds"),
            "status": "done" if score and stamp.date() < dt.datetime.now(LOCAL_TZ).date() else "scheduled",
            "watch": direct.group(1) if direct else BASE + "/ru/schedule",
        }
        if logos[0]:
            game["homeLogo"] = logos[0].group(1)
        if logos[1]:
            game["awayLogo"] = logos[1].group(1)
        if score:
            game["homeScore"], game["awayScore"] = int(score.group(1)), int(score.group(2))
        games.append(game)
    if len(games) < 200 or sum(g["home"] == "Горняк" or g["away"] == "Горняк" for g in games) < 40:
        raise ValueError("Incomplete official schedule: refusing publication")
    return games

def featured_game_links(content: str):
    """The official site's carousel contains forthcoming game-page links with dates."""
    links = {}
    anchors = re.findall(
        r'<a\s+class="[^"]*\bevent\b[^"]*"\s+href="(https://pro\.ligasy\.kz/ru/game/(\d+)-([a-z]+)-([a-z]+))"[^>]*>(.*?)</a>',
        content, re.I | re.S)
    for url, _, home_slug, away_slug, body in anchors:
        date = match(r'<div class="date">\s*(\d{1,2})\.\s*(\d{1,2})\.\s*(20\d\d)\s*</div>', body)
        if not date or home_slug not in SLUG or away_slug not in SLUG:
            continue
        day, month, year = map(int, date.groups())
        key = (f"{year:04}-{month:02}-{day:02}", SLUG[home_slug], SLUG[away_slug])
        links.setdefault(key, url)
    return links

def official_youtube_id(game):
    page = download(game["watch"])
    # Only the official match's "Трансляция" section; exclude channel footer/social links.
    zone = match(r'<div[^>]+id="nav-tab2"[^>]*>(.*?)</div>\s*</div>', page)
    if not zone:
        # The embedded facade is sometimes nested differently, but it must
        # occur after the official match's broadcast tab anchor.
        pos = page.find('id="nav-tab2"')
        zone_text = page[pos:pos+4500] if pos >= 0 else ""
    else:
        zone_text = zone.group(1)
    youtube = match(r'<img[^>]+data-yt="([-_A-Za-z0-9]{11})"', zone_text)
    if not youtube:
        youtube = match(r'youtube\.com/embed/([-_A-Za-z0-9]{11})', zone_text)
    return youtube.group(1) if youtube else None

def main():
    content = download(BASE + "/ru/schedule")
    games = parse_schedule(content)
    links = featured_game_links(content)
    now = dt.datetime.now(LOCAL_TZ)
    existing_media = json.loads(MEDIA.read_text("utf-8")) if MEDIA.exists() else {"games": {}}
    by_game = existing_media.get("games", {})
    candidates = []
    for game in games:
        day = dt.datetime.fromisoformat(game["date"]).date()
        if not -3 <= (day - now.date()).days <= 3:
            continue
        key = (game["date"][:10], game["home"], game["away"])
        official = links.get(key)
        if official:
            game["watch"] = official
        if game["watch"].startswith(BASE + "/ru/game/"):
            candidates.append(game)

    def inspect(game):
        try:
            return game, official_youtube_id(game)
        except Exception as exc:
            print(f"Could not inspect {game['id']}: {exc}")
            return game, None

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for game, video_id in pool.map(inspect, candidates):
            if not video_id:
                continue
            kind = "replay" if game["status"] == "done" else "broadcast"
            by_game[game["id"]] = {
                "youtubeId": video_id, "source": game["watch"],
                "label": ("Запись матча: " if kind == "replay" else "Официальная трансляция: ")
                         + game["home"] + " — " + game["away"]
                         + ", " + dt.datetime.fromisoformat(game["date"]).strftime("%d.%m.%Y"),
                "kind": kind,
            }
    date = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    old_schedule = json.loads(DATA.read_text("utf-8")) if DATA.exists() else {}
    schedule_content = {"updatedAt":old_schedule.get("updatedAt",date),"season":"2026/27","source":BASE+"/ru/schedule","live":False,"games":games}
    if old_schedule.get("games") != games:
        schedule_content["updatedAt"] = date
        DATA.write_text(json.dumps(schedule_content,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        print(f"Updated {len(games)} official games")
    else:
        print("Official schedule unchanged")
    old_media = json.loads(MEDIA.read_text("utf-8")) if MEDIA.exists() else {}
    media_content = {"updatedAt":old_media.get("updatedAt",date),"description":"Official match-specific YouTube embeds sourced from pro.ligasy.kz; a scheduled video is not proof that it is live.", "games":by_game}
    if old_media.get("games") != by_game:
        media_content["updatedAt"] = date
        MEDIA.write_text(json.dumps(media_content,ensure_ascii=False,indent=2)+"\n",encoding="utf-8")
        print(f"Updated {len(by_game)} official video links")
    else:
        print("Official videos unchanged")

if __name__ == "__main__":
    main()
