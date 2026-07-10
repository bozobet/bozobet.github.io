import json
import os
import time
import urllib.parse
import urllib.request
from pathlib import Path

KEY = os.environ.get("RAPID_KEY", "").strip()
HOST = "live-casino-slots-evolution-jili-and-50-plus-provider.p.rapidapi.com"
BASE = f"https://{HOST}"

if not KEY:
    raise SystemExit("RAPID_KEY bulunamadı.")

headers = {
    "Content-Type": "application/json",
    "x-rapidapi-host": HOST,
    "x-rapidapi-key": KEY,
}

def request_json(url):
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.loads(response.read().decode("utf-8"))

def find_provider_names(value):
    if isinstance(value, list):
        result = []
        for item in value:
            if isinstance(item, str):
                result.append(item)
            elif isinstance(item, dict):
                name = (
                    item.get("provider")
                    or item.get("name")
                    or item.get("title")
                    or item.get("code")
                )
                if name:
                    result.append(str(name))
        return result

    if isinstance(value, dict):
        for key in ("providers", "data", "result", "results", "items", "list"):
            if key in value:
                found = find_provider_names(value[key])
                if found:
                    return found

        for child in value.values():
            found = find_provider_names(child)
            if found:
                return found

    return []

try:
    providers_response = request_json(f"{BASE}/getallproviders")
    providers = find_provider_names(providers_response)
except Exception as exc:
    print("Provider listesi alınamadı:", exc)
    providers = []

if not providers:
    providers = [
        "SPRIBE",
        "PRAGMATIC PLAY",
        "PRAGMATICPLAY",
        "EVOLUTION",
        "JILI",
    ]

providers = list(dict.fromkeys(p for p in providers if p))

games = []
seen = set()

for provider in providers:
    try:
        query = urllib.parse.urlencode({"provider": provider})
        data = request_json(f"{BASE}/getallgamesandprovider?{query}")

        provider_games = data.get("games", []) if isinstance(data, dict) else []

        for game in provider_games:
            if not isinstance(game, dict):
                continue

            game_id = str(game.get("id", "")).strip()
            name = str(game.get("name", "")).strip()
            image = str(game.get("img", "")).strip()

            if not game_id or not name or not image:
                continue

            unique_key = (provider, game_id)
            if unique_key in seen:
                continue

            seen.add(unique_key)

            games.append({
                "id": game_id,
                "name": name,
                "img": image,
                "type": str(game.get("type", "casino")),
                "provider": str(game.get("provider", provider)),
            })

        print(provider, "→", len(provider_games), "oyun")
        time.sleep(0.25)

    except Exception as exc:
        print(provider, "alınamadı:", exc)

Path("games.json").write_text(
    json.dumps({"games": games}, ensure_ascii=False, indent=2),
    encoding="utf-8",
)

print("Toplam kaydedilen oyun:", len(games))
