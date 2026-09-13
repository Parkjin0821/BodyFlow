"""브라우저 검증용 식약처 형식의 예시 응답 캐시 서버."""
import argparse
import tempfile
from pathlib import Path

from content_cards import CardStore
from content_server import make_server
from food_catalog import FoodCache, FoodCatalog, map_mfds_row
from test_food_catalog import NAMES, official_example

parser = argparse.ArgumentParser()
parser.add_argument("--port", type=int, required=True)
args = parser.parse_args()
temp = tempfile.TemporaryDirectory()
food_cache = FoodCache(Path(temp.name) / "foods.sqlite3")
food_cache.put_official([
    map_mfds_row(official_example(name, index), "2026-09-13T00:00:00+00:00")
    for index, name in enumerate(NAMES)
])
catalog = FoodCatalog(food_cache)  # 키 없음: 외부 호출 불가를 재현하고 공식 캐시로 폴백
server = make_server(CardStore(Path(temp.name) / "cards.sqlite3"), "example-admin-token-123456789", args.port, catalog)
print(f"READY {args.port}", flush=True)
server.serve_forever()
