"""Official API metadata only. Never fetch origin pages or download media."""
import hashlib
import html
import json
import os
import re
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from urllib.parse import urlencode, urlsplit
from urllib.request import Request, urlopen

FIELDS = ('id', 'source', 'title', 'publisher', 'thumbnail_url', 'origin_url', 'fetched_at', 'status')
STATUSES = {'pending', 'approved', 'rejected'}

def clean(value):
    return html.unescape(re.sub(r'<[^>]*>', '', str(value or ''))).strip()

def web_url(value):
    if not isinstance(value, str):
        return None
    p = urlsplit(value)
    return value if p.scheme in ('https', 'http') and p.hostname and not p.username and not p.password else None

def normalize(source, payload):
    """Discard all non-whitelisted response fields immediately; do not log payload."""
    now = datetime.now(timezone.utc).isoformat()
    cards = {}
    for item in payload.get('items', []):
        if source == 'naver':
            url = web_url(item.get('link'))
            title, publisher, thumbnail = item.get('title'), item.get('bloggername'), None
        elif source == 'youtube':
            video = item.get('id', {}).get('videoId', '')
            if not re.fullmatch(r'[A-Za-z0-9_-]{11}', video):
                continue
            url = 'https://www.youtube.com/watch?v=' + video
            snippet = item.get('snippet', {})
            title, publisher = snippet.get('title'), snippet.get('channelTitle')
            thumbnail = web_url(snippet.get('thumbnails', {}).get('medium', {}).get('url'))
        else:
            raise ValueError('지원하지 않는 출처입니다.')
        if not url or not clean(title):
            continue
        identity = source + ':' + hashlib.sha256(url.encode()).hexdigest()[:24]
        cards[identity] = dict(zip(FIELDS, (identity, source, clean(title), clean(publisher), thumbnail, url, now, 'pending')))
    return list(cards.values())

def collect(source, query, limit=10):
    if source not in ('naver', 'youtube') or not isinstance(query, str) or not query.strip() or not isinstance(limit, int) or not 1 <= limit <= 50:
        raise ValueError('출처·검색어·개수(1–50)를 확인하세요.')
    if source == 'naver':
        credentials = [os.environ.get(k) for k in ('NAVER_CLIENT_ID', 'NAVER_CLIENT_SECRET')]
        if not all(credentials):
            raise ValueError('NAVER_CLIENT_ID / NAVER_CLIENT_SECRET이 필요합니다.')
        url = 'https://openapi.naver.com/v1/search/blog.json?' + urlencode({'query': query, 'display': limit})
        request = Request(url, headers=dict(zip(('X-Naver-Client-Id', 'X-Naver-Client-Secret'), credentials)))
    else:
        key = os.environ.get('YOUTUBE_API_KEY')
        if not key:
            raise ValueError('YOUTUBE_API_KEY가 필요합니다.')
        url = 'https://www.googleapis.com/youtube/v3/search?' + urlencode({
            'key': key, 'part': 'snippet', 'type': 'video', 'q': query, 'maxResults': limit,
            'videoEmbeddable': 'true', 'videoSyndicated': 'true',
            'fields': 'items(id/videoId,snippet(title,channelTitle,thumbnails/medium/url))'})
        request = Request(url)
    with urlopen(request, timeout=20) as response:
        payload = json.load(response)
    return normalize(source, payload)

class CardStore:
    def __init__(self, path):
        self.path = str(path)
        with self.connect() as db:
            db.execute('CREATE TABLE IF NOT EXISTS cards (id TEXT PRIMARY KEY, source TEXT, title TEXT, publisher TEXT, thumbnail_url TEXT, origin_url TEXT, fetched_at TEXT, status TEXT CHECK(status IN (\'pending\',\'approved\',\'rejected\')))')

    @contextmanager
    def connect(self):
        db = sqlite3.connect(self.path)
        db.row_factory = sqlite3.Row
        try:
            with db:
                yield db
        finally:
            db.close()

    def ingest(self, cards):
        with self.connect() as db:
            for card in cards:
                if set(card) != set(FIELDS) or card['source'] not in ('naver', 'youtube') or card['status'] != 'pending':
                    raise ValueError('수집 카드는 지정 필드와 pending 상태만 허용합니다.')
                # Refresh revokes approval: changed external metadata must be reviewed again.
                db.execute('INSERT OR REPLACE INTO cards VALUES (?,?,?,?,?,?,?,?)', [card[k] for k in FIELDS])

    def list(self, admin=False):
        with self.connect() as db:
            return [dict(r) for r in db.execute('SELECT * FROM cards' + ('' if admin else " WHERE status='approved'") + ' ORDER BY fetched_at DESC, id')]

    def moderate(self, identity, status):
        if status not in STATUSES:
            raise ValueError('잘못된 승인 상태입니다.')
        with self.connect() as db:
            if db.execute('UPDATE cards SET status=? WHERE id=?', (status, identity)).rowcount != 1:
                raise ValueError('카드를 찾지 못했습니다.')
