"""Fetch KHL scoreboards for the next/previous 14 days into a same-origin JSON file.
No embedded credentials, no browser CORS proxy. Best effort if source is unavailable.
"""
import datetime as dt
import json
import os
import time
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'data' / 'khl.json'
TZ = dt.timezone(dt.timedelta(hours=5))
now = dt.datetime.now(TZ)
start = now.date() - dt.timedelta(days=7)
records = {}
errors = []
for offset in range(23):
    day = (start + dt.timedelta(days=offset)).isoformat()
    url = f'https://www.sofascore.com/api/v1/sport/ice-hockey/scheduled-events/{day}'
    try:
        req = urllib.request.Request(url, headers={
            'User-Agent': 'Mozilla/5.0 (compatible; HockeyLiveUpdater/1.0)',
            'Accept': 'application/json', 'Referer': 'https://www.sofascore.com/'
        })
        with urllib.request.urlopen(req, timeout=16) as stream:
            payload = json.load(stream)
        for game in payload.get('events', []):
            tournament = game.get('tournament') or {}
            text = (str(tournament.get('name', '')) + ' ' +
                    str((tournament.get('uniqueTournament') or {}).get('name', ''))).lower()
            if not ('khl' in text or 'континентальн' in text):
                continue
            status = (game.get('status') or {}).get('type')
            gid = game.get('id')
            ts = game.get('startTimestamp')
            if not gid or not ts:
                continue
            record = dict(league='KHL', id=str(gid),
                          home=(game.get('homeTeam') or {}).get('name', 'Хозяева'),
                          away=(game.get('awayTeam') or {}).get('name', 'Гости'),
                          homeScore=(game.get('homeScore') or {}).get('current'),
                          awayScore=(game.get('awayScore') or {}).get('current'),
                          time=dt.datetime.fromtimestamp(ts, dt.timezone.utc).isoformat().replace('+00:00', 'Z'),
                          status='done' if status == 'finished' else 'live' if status == 'inprogress' else 'scheduled',
                          watch='https://www.khl.ru/calendar/')
            records[str(gid)] = record
    except Exception as exc:
        errors.append(f'{day}: {type(exc).__name__}: {str(exc)[:90]}')
    time.sleep(0.15)

if records:
    result = {'updatedAt': now.isoformat(), 'source': 'Sofascore public scoreboard',
              'games': sorted(records.values(), key=lambda r: r['time']),
              'partial': bool(errors)}
    OUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Saved {len(records)} KHL games. Days with errors: {len(errors)}')
else:
    print('No KHL games retrieved; leaving previous file unchanged.')
    for error in errors[:3]: print(error)