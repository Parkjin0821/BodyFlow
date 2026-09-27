"""Local operator API. API credentials and approval authority stay on server."""
import argparse
import hmac
import json
import mimetypes
import os
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit
from content_cards import CardStore, collect
from food_catalog import FoodCache, FoodCatalog, load_env

ROOT = Path(__file__).resolve().parents[1]

def make_server(store, token, port=8765, food_catalog=None):
    if len(token) < 24:
        raise ValueError('BODYFLOW_ADMIN_TOKEN은 24자 이상 설정하세요.')
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass  # Do not log credentials, searches or upstream responses.

        def reply(self, status, data):
            body = json.dumps(data, ensure_ascii=False).encode()
            self.send_response(status)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(body)

        def authorized(self):
            return hmac.compare_digest(self.headers.get('Authorization', ''), 'Bearer ' + token)

        def do_GET(self):
            parsed = urlsplit(self.path)
            path = parsed.path
            if path == '/api/cards':
                return self.reply(200, store.list())
            if path == '/api/foods':
                if food_catalog is None:
                    return self.reply(503, {'error': '식약처 음식 검색이 설정되지 않았습니다.'})
                query = parse_qs(parsed.query).get('query', [''])[0].strip()
                if not query:
                    return self.reply(400, {'error': '검색어를 입력해 주세요.'})
                items, served_from = food_catalog.search(query, 20)
                suggestions = [] if items else food_catalog.cache.suggest(query, 3)
                return self.reply(200, {'items': [item.public() for item in items], 'suggestions': [item.public() for item in suggestions], 'served_from': served_from})
            if path == '/api/foods/recent':
                if food_catalog is None:
                    return self.reply(503, {'error': '식약처 음식 검색이 설정되지 않았습니다.'})
                ids = parse_qs(parsed.query).get('id', [])[:20]
                return self.reply(200, {'items': [item.public() for item in food_catalog.recent(ids)], 'served_from': 'cache'})
            if path == '/api/admin/cards':
                return self.reply(200, store.list(True)) if self.authorized() else self.reply(401, {'error': '운영 인증이 필요합니다.'})
            if path == '/api/admin/overview':
                if not self.authorized():
                    return self.reply(401, {'error': '운영 인증이 필요합니다.'})
                # 키 값은 내보내지 않고 설정 여부만 알린다. 사용자 기록은 서버에 저장하지 않는다.
                foods = food_catalog.cache.stats() if food_catalog else None
                return self.reply(200, {'foods': foods, 'mfds_key_configured': bool(food_catalog and food_catalog.service_key), 'cards': store.stats(), 'user_records': {'stored_on_server': False}})
            if path == '/api/admin/foods':
                if not self.authorized():
                    return self.reply(401, {'error': '운영 인증이 필요합니다.'})
                if food_catalog is None:
                    return self.reply(503, {'error': '식약처 음식 캐시가 설정되지 않았습니다.'})
                query = parse_qs(parsed.query)
                try:
                    return self.reply(200, food_catalog.cache.page(query.get('query', [''])[0], query.get('offset', ['0'])[0], query.get('limit', ['20'])[0]))
                except ValueError:
                    return self.reply(400, {'error': '조회 범위를 확인하세요.'})
            public = {'/': ROOT/'app/index.html', '/admin': ROOT/'app/content-admin.html'}  # 운영 관리: 현황·식약처 캐시·콘텐츠 승인
            for name in ('app.js', 'charts.js', 'presets.js', 'profile.js', 'insights.js', 'progress-groups.js', 'recovery.js', 'plan.js', 'style.css', 'ia.css', 'tokens.css', 'accessibility.css', 'logging.css', 'guidance.css', 'food-search.css', 'content-cards.js', 'content-admin.js', 'food-search.js', 'record.js', 'quick-recording.js', 'voice-parser.js', 'voice-recording.js', 'prescribe.js', 'adaptive-plan.js'):
                public['/'+name] = ROOT/'app'/name
            public['/assets/chicken-tofu-bowl.png'] = ROOT/'assets/chicken-tofu-bowl.png'
            public['/fixtures/sample-plan.json'] = ROOT/'fixtures/sample-plan.json'
            file = public.get(path)
            if not file:
                return self.reply(404, {'error': '찾을 수 없습니다.'})
            self.send_response(200)
            self.send_header('Content-Type', mimetypes.guess_type(str(file))[0] or 'application/octet-stream')
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            self.wfile.write(file.read_bytes())

        def do_POST(self):
            if not self.authorized():
                return self.reply(401, {'error': '운영 인증이 필요합니다.'})
            try:
                length = int(self.headers.get('Content-Length', '0'))
                if not 0 < length <= 4096:
                    raise ValueError('요청 크기를 확인하세요.')
                data = json.loads(self.rfile.read(length))
                path = urlsplit(self.path).path
                if path == '/api/admin/collect':
                    store.ingest(collect(data.get('source'), data.get('query'), data.get('limit', 10)))
                elif path == '/api/admin/moderate':
                    store.moderate(data.get('id'), data.get('status'))
                else:
                    return self.reply(404, {'error': '찾을 수 없습니다.'})
                self.reply(200, {'ok': True})
            except ValueError as error:
                self.reply(400, {'error': str(error)})
            except Exception:
                self.reply(502, {'error': 'API 수집 또는 저장을 완료하지 못했습니다. 인증·한도·네트워크를 확인하세요.'})
    return ThreadingHTTPServer(('127.0.0.1', port), Handler)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--db', default=str(ROOT/'content-cards.sqlite3'))
    parser.add_argument('--port', type=int, default=8765)
    args = parser.parse_args()
    load_env(ROOT/'.env')
    food_cache = FoodCache(ROOT/'food-cache.sqlite3')
    catalog = FoodCatalog(food_cache, os.environ.get('MFDS_SERVICE_KEY', ''))
    server = make_server(CardStore(args.db), os.environ.get('BODYFLOW_ADMIN_TOKEN', ''), args.port, catalog)
    print(f'BodyFlow: http://127.0.0.1:{args.port} / 운영: /admin', flush=True)
    server.serve_forever()
