import tempfile
import time
import unittest
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

from food_catalog import FoodCache, FoodCatalog, FoodItem, map_mfds_row


NAMES = [
    "고구마", "군고구마", "찐고구마", "감자", "현미밥", "잡곡밥", "흰쌀밥", "닭가슴살", "삶은 달걀", "두부",
    "연어구이", "고등어구이", "바나나", "사과", "방울토마토", "브로콜리", "그릭요거트", "우유", "아몬드", "오트밀",
]


def official_example(name, index):
    return {
        "FOOD_CD": f"EXAMPLE-{index:03d}", "FOOD_NM_KR": name, "SERVING_SIZE": "100",
        "AMT_NUM1": str(80 + index), "AMT_NUM6": str(10 + index / 10),
        "AMT_NUM3": str(5 + index / 10), "AMT_NUM4": str(2 + index / 10),
        "AMT_NUM13": str(30 + index), "IGNORED_FIELD": "캐시에 저장되면 안 됨",
    }


class FoodCatalogTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.cache = FoodCache(Path(self.temp.name) / "foods.sqlite3")
        self.items = [map_mfds_row(official_example(name, i), "2026-09-13T00:00:00+00:00") for i, name in enumerate(NAMES)]
        self.cache.put_official(self.items)

    def tearDown(self):
        self.temp.cleanup()

    def test_food_item_is_exact_whitelist(self):
        self.assertEqual(set(self.items[0].public()), {
            "id", "name", "serving_size_g", "kcal", "carb_g", "protein_g", "fat_g",
            "sodium_mg", "source", "source_id", "fetched_at",
        })
        self.assertNotIn("IGNORED_FIELD", self.items[0].public())

    def test_choseong_search(self):
        self.assertEqual(self.cache.search("ㄱㄱㅁ")[0].name, "고구마")

    def test_api_failure_uses_cache(self):
        def unavailable(_url, _timeout):
            raise TimeoutError("예시 API 장애")
        results, served_from = FoodCatalog(self.cache, "example-key", unavailable).search("고구마")
        self.assertEqual(served_from, "cache")
        self.assertTrue(results)

    def test_api_query_and_mapping(self):
        def response(url, timeout):
            self.assertLessEqual(timeout, 2.5)
            self.assertEqual(parse_qs(urlsplit(url).query)["FOOD_NM_KR"], ["고구마"])
            return {"response": {"body": {"items": [official_example("고구마", 99)]}}}
        results, served_from = FoodCatalog(self.cache, "example-key", response).search("고구마")
        self.assertEqual(served_from, "api")
        self.assertEqual(results[0].source, "mfds")

    def test_twenty_cached_searches_average_under_three_seconds(self):
        catalog = FoodCatalog(self.cache)
        started = time.perf_counter()
        for name in NAMES:
            results, served_from = catalog.search(name)
            self.assertEqual(served_from, "cache")
            self.assertTrue(results, name)
        average = (time.perf_counter() - started) / len(NAMES)
        self.assertLess(average, 3.0)
        print(f"20개 검색 평균: {average * 1000:.2f}ms (예시 공식 응답 캐시)")

    def test_cache_replaces_same_source_id_instead_of_duplicating(self):
        changed = FoodItem(**{**self.items[0].public(), "kcal": 999})
        self.cache.put_official([changed])
        results = self.cache.by_ids([changed.id])
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0].kcal, 999)


if __name__ == "__main__":
    unittest.main()
