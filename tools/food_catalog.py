"""식약처 식품영양성분DB 전용 읽기·검색·캐시 계층.

영양값을 만드는 쓰기 API는 의도적으로 제공하지 않는다. 공공데이터포털
응답을 FoodItem 화이트리스트로 변환한 뒤에만 로컬 캐시에 저장한다.
"""
from __future__ import annotations

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from contextlib import closing
import json
import os
from pathlib import Path
import re
import sqlite3
from difflib import SequenceMatcher
from typing import Callable, Iterable
from urllib.parse import urlencode
from urllib.request import urlopen

MFDS_API_URL = "https://apis.data.go.kr/1471000/FoodNtrCpntDbInfo02/getFoodNtrCpntDbInq02"
CHOSEONG = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ"
INITIAL_QUERY = re.compile(r"^[ㄱ-ㅎ\s]+$")


@dataclass(frozen=True)
class FoodItem:
    id: str
    name: str
    serving_size_g: float
    kcal: float
    carb_g: float
    protein_g: float
    fat_g: float
    sodium_mg: float
    source: str
    source_id: str
    fetched_at: str

    def public(self) -> dict:
        return asdict(self)


def load_env(path: Path) -> None:
    """작은 로컬 실행용 .env 로더. 이미 설정된 환경변수는 덮지 않는다."""
    if not path.exists():
        return
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


def initials(value: str) -> str:
    result = []
    for char in value:
        code = ord(char)
        if 0xAC00 <= code <= 0xD7A3:
            result.append(CHOSEONG[(code - 0xAC00) // 588])
        elif char in CHOSEONG:
            result.append(char)
        elif not char.isspace():
            result.append(char.casefold())
    return "".join(result)


def _number(value, field: str) -> float:
    text = str(value if value is not None else "").strip().replace(",", "")
    if not text or text in {"-", "N/A", "Tr", "trace"}:
        return 0.0
    match = re.search(r"-?\d+(?:\.\d+)?", text)
    if not match:
        raise ValueError(f"식약처 응답의 {field} 값을 해석할 수 없습니다.")
    number = float(match.group())
    if number < 0:
        raise ValueError(f"식약처 응답의 {field} 값이 음수입니다.")
    return number


def map_mfds_row(row: dict, fetched_at: str | None = None) -> FoodItem:
    """현재 식품영양성분DB정보 필드를 앱의 고정 모델로 축소한다."""
    source_id = str(row.get("FOOD_CD") or row.get("foodCd") or "").strip()
    name = str(row.get("FOOD_NM_KR") or row.get("foodNmKr") or "").strip()
    if not source_id or not name:
        raise ValueError("식약처 응답에 식품코드 또는 식품명이 없습니다.")
    fetched = fetched_at or datetime.now(timezone.utc).isoformat(timespec="seconds")
    return FoodItem(
        id=f"mfds:{source_id}",
        name=name,
        serving_size_g=_number(row.get("SERVING_SIZE", row.get("servingSize")), "SERVING_SIZE"),
        kcal=_number(row.get("AMT_NUM1", row.get("amtNum1")), "AMT_NUM1"),
        carb_g=_number(row.get("AMT_NUM6", row.get("amtNum6")), "AMT_NUM6"),
        protein_g=_number(row.get("AMT_NUM3", row.get("amtNum3")), "AMT_NUM3"),
        fat_g=_number(row.get("AMT_NUM4", row.get("amtNum4")), "AMT_NUM4"),
        sodium_mg=_number(row.get("AMT_NUM13", row.get("amtNum13")), "AMT_NUM13"),
        source="mfds",
        source_id=source_id,
        fetched_at=fetched,
    )


class FoodCache:
    def __init__(self, path: str | Path):
        self.path = str(path)
        with closing(self._connect()) as db:
            db.execute("""CREATE TABLE IF NOT EXISTS foods (
                source_id TEXT PRIMARY KEY, id TEXT UNIQUE NOT NULL, name TEXT NOT NULL,
                serving_size_g REAL NOT NULL, kcal REAL NOT NULL, carb_g REAL NOT NULL,
                protein_g REAL NOT NULL, fat_g REAL NOT NULL, sodium_mg REAL NOT NULL,
                source TEXT NOT NULL CHECK(source='mfds'), fetched_at TEXT NOT NULL,
                initials TEXT NOT NULL
            )""")

    def _connect(self):
        return sqlite3.connect(self.path, isolation_level=None)

    def put_official(self, items: Iterable[FoodItem]) -> None:
        rows = []
        for item in items:
            if item.source != "mfds" or item.id != f"mfds:{item.source_id}":
                raise ValueError("식약처에서 변환된 FoodItem만 캐시에 저장할 수 있습니다.")
            rows.append((*asdict(item).values(), initials(item.name)))
        with closing(self._connect()) as db:
            db.executemany("""INSERT INTO foods
                (id,name,serving_size_g,kcal,carb_g,protein_g,fat_g,sodium_mg,source,source_id,fetched_at,initials)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?)
                ON CONFLICT(source_id) DO UPDATE SET
                  id=excluded.id,name=excluded.name,serving_size_g=excluded.serving_size_g,
                  kcal=excluded.kcal,carb_g=excluded.carb_g,protein_g=excluded.protein_g,
                  fat_g=excluded.fat_g,sodium_mg=excluded.sodium_mg,
                  fetched_at=excluded.fetched_at,initials=excluded.initials""", rows)

    @staticmethod
    def _row(row) -> FoodItem:
        return FoodItem(*row[:11])

    def search(self, query: str, limit: int = 20) -> list[FoodItem]:
        query = query.strip()
        if not query:
            return []
        field = "initials" if INITIAL_QUERY.fullmatch(query) else "name"
        needle = initials(query) if field == "initials" else query.casefold()
        with closing(self._connect()) as db:
            rows = db.execute(
                f"SELECT id,name,serving_size_g,kcal,carb_g,protein_g,fat_g,sodium_mg,source,source_id,fetched_at "
                f"FROM foods WHERE {field} LIKE ? ORDER BY CASE WHEN {field}=? THEN 0 ELSE 1 END, name LIMIT ?",
                (f"%{needle}%", needle, limit),
            ).fetchall()
            if not rows and field == "initials":
                candidates = db.execute(
                    "SELECT id,name,serving_size_g,kcal,carb_g,protein_g,fat_g,sodium_mg,source,source_id,fetched_at,initials FROM foods LIMIT 2000"
                ).fetchall()
                ranked = sorted(candidates, key=lambda row: SequenceMatcher(None, needle, row[11]).ratio(), reverse=True)
                rows = [row[:11] for row in ranked if SequenceMatcher(None, needle, row[11]).ratio() >= .6][:limit]
        return [self._row(row) for row in rows]

    def by_ids(self, ids: list[str]) -> list[FoodItem]:
        clean = list(dict.fromkeys(ids))[:20]
        if not clean:
            return []
        with closing(self._connect()) as db:
            marks = ",".join("?" for _ in clean)
            rows = db.execute(
                f"SELECT id,name,serving_size_g,kcal,carb_g,protein_g,fat_g,sodium_mg,source,source_id,fetched_at FROM foods WHERE id IN ({marks})",
                clean,
            ).fetchall()
        found = {row[0]: self._row(row) for row in rows}
        return [found[item_id] for item_id in clean if item_id in found]

    # 운영 화면용 읽기 전용 조회. 영양값을 고치는 쓰기 경로는 만들지 않는다(ADR-001).
    def stats(self) -> dict:
        with closing(self._connect()) as db:
            count, oldest, newest = db.execute("SELECT COUNT(*), MIN(fetched_at), MAX(fetched_at) FROM foods").fetchone()
        return {"count": count, "oldest_fetched_at": oldest, "newest_fetched_at": newest}

    def page(self, query: str = "", offset: int = 0, limit: int = 20) -> dict:
        query, offset, limit = query.strip(), max(0, int(offset)), min(max(1, int(limit)), 50)
        where, args = ("WHERE name LIKE ?", [f"%{query}%"]) if query else ("", [])
        with closing(self._connect()) as db:
            total = db.execute(f"SELECT COUNT(*) FROM foods {where}", args).fetchone()[0]
            rows = db.execute(
                f"SELECT id,name,serving_size_g,kcal,carb_g,protein_g,fat_g,sodium_mg,source,source_id,fetched_at FROM foods {where} ORDER BY name, source_id LIMIT ? OFFSET ?",
                [*args, limit, offset],
            ).fetchall()
        return {"total": total, "offset": offset, "limit": limit, "items": [asdict(self._row(row)) for row in rows]}

    def suggest(self, query: str, limit: int = 3) -> list[FoodItem]:
        query = query.strip().casefold()
        if not query:
            return []
        with closing(self._connect()) as db:
            rows = db.execute(
                "SELECT id,name,serving_size_g,kcal,carb_g,protein_g,fat_g,sodium_mg,source,source_id,fetched_at FROM foods LIMIT 2000"
            ).fetchall()
        ranked = sorted(rows, key=lambda row: SequenceMatcher(None, query, row[1].casefold()).ratio(), reverse=True)
        return [self._row(row) for row in ranked[:limit]]


FetchJson = Callable[[str, float], dict]


def fetch_json(url: str, timeout: float) -> dict:
    with urlopen(url, timeout=timeout) as response:
        return json.loads(response.read().decode("utf-8"))


class FoodCatalog:
    def __init__(self, cache: FoodCache, service_key: str = "", fetcher: FetchJson = fetch_json):
        self.cache = cache
        self.service_key = service_key
        self.fetcher = fetcher

    @staticmethod
    def _rows(payload: dict) -> list[dict]:
        body = payload.get("body") or payload.get("response", {}).get("body") or {}
        items = body.get("items", [])
        if isinstance(items, dict):
            items = items.get("item", [])
        if isinstance(items, dict):
            items = [items]
        if not isinstance(items, list):
            raise ValueError("식약처 API 응답 목록 형식이 올바르지 않습니다.")
        return items

    def _fetch(self, query: str, limit: int) -> list[FoodItem]:
        if not self.service_key:
            raise RuntimeError("MFDS_SERVICE_KEY가 설정되지 않았습니다.")
        params = urlencode({
            "serviceKey": self.service_key,
            "type": "json",
            "pageNo": 1,
            "numOfRows": min(max(limit, 3), 100),
            "FOOD_NM_KR": query,
        }, safe="%")
        payload = self.fetcher(f"{MFDS_API_URL}?{params}", 2.5)
        return [map_mfds_row(row) for row in self._rows(payload)]

    def search(self, query: str, limit: int = 20) -> tuple[list[FoodItem], str]:
        query = query.strip()
        if not query:
            return [], "cache"
        # 공공 API는 초성 검색 계약이 없으므로 초성은 공식 응답으로 채운 로컬 인덱스에서 찾는다.
        if INITIAL_QUERY.fullmatch(query):
            return self.cache.search(query, limit), "cache"
        try:
            fresh = self._fetch(query, limit)
            self.cache.put_official(fresh)
            return fresh[:limit], "api"
        except Exception:
            return self.cache.search(query, limit), "cache"

    def recent(self, ids: list[str]) -> list[FoodItem]:
        return self.cache.by_ids(ids)
