"""Fetch recipe discovery metadata through NAVER's official blog Search API.

Run: python tools/naver_recipe_search.py "두부 다이어트 레시피"
Set NAVER_CLIENT_ID and NAVER_CLIENT_SECRET on the server; never in app code.
This does not scrape, store, or reproduce blog bodies or photographs.
"""
import argparse
import html
import json
import os
from pathlib import Path
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urlparse
from urllib.request import Request, urlopen
from content_cards import normalize


def clean(value):
    return html.unescape(re.sub(r"<[^>]*>", "", str(value or ""))).strip()


def search(query, limit=10, sort="sim"):
    query = query.strip()
    if not query:
        raise ValueError("검색어를 입력하세요.")
    if not 1 <= limit <= 100 or sort not in {"sim", "date"}:
        raise ValueError("limit은 1–100, sort는 sim 또는 date여야 합니다.")
    client_id = os.environ.get("NAVER_CLIENT_ID")
    secret = os.environ.get("NAVER_CLIENT_SECRET")
    if not client_id or not secret:
        raise ValueError("서버 환경변수 NAVER_CLIENT_ID와 NAVER_CLIENT_SECRET 설정이 필요합니다.")
    url = "https://openapi.naver.com/v1/search/blog.json?" + urlencode(
        {"query": query, "display": limit, "start": 1, "sort": sort}
    )
    request = Request(url, headers={"X-Naver-Client-Id": client_id, "X-Naver-Client-Secret": secret})
    with urlopen(request, timeout=20) as response:
        payload = json.load(response)
    results = normalize('naver', payload)
    return {"query": query, "retrievedAt": payload.get("lastBuildDate"), "results": results}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("query")
    parser.add_argument("--limit", type=int, default=10)
    parser.add_argument("--sort", choices=["sim", "date"], default="sim")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    try:
        data = search(args.query, args.limit, args.sort)
        text = json.dumps(data, ensure_ascii=False, indent=2)
        if args.output:
            args.output.parent.mkdir(parents=True, exist_ok=True)
            temporary = args.output.with_suffix(args.output.suffix + ".tmp")
            temporary.write_text(text, encoding="utf-8")
            temporary.replace(args.output)
        else:
            print(text)
    except HTTPError as error:
        print(f"NAVER API HTTP {error.code}: 인증·호출 한도·요청 조건을 확인하세요.", file=sys.stderr)
        return 1
    except (URLError, TimeoutError, ValueError, OSError) as error:
        print(str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
