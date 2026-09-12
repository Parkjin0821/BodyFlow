"""예시 API 응답을 이용한 저장·승인·브라우저 통합 검증. 실제 API 호출 없음."""
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import threading
import unittest
from unittest.mock import patch
from urllib.request import urlopen
from urllib.error import HTTPError
from content_cards import CardStore, FIELDS, collect, normalize
from content_server import make_server

class CardTests(unittest.TestCase):
    def test_official_api_whitelist_and_no_media_fetch(self):
        for source, payload in [
            ('naver', {'items':[{'title':'<b>예시</b> 식단 카드','bloggername':'예시 작성자','link':'https://example.com/recipe','description':'DO_NOT_STORE_BODY','image':'DO_NOT_STORE_IMAGE'}]}),
            ('youtube', {'items':[{'id':{'videoId':'Example0001'},'snippet':{'title':'예시 운동 카드','channelTitle':'예시 채널','description':'DO_NOT_STORE_BODY','thumbnails':{'medium':{'url':'https://i.ytimg.com/vi/Example0001/mqdefault.jpg'}}},'video':'DO_NOT_STORE_VIDEO'}]})]:
            with patch.dict(os.environ, {'NAVER_CLIENT_ID':'example','NAVER_CLIENT_SECRET':'example','YOUTUBE_API_KEY':'example'}), patch('content_cards.urlopen',return_value=io.StringIO(json.dumps(payload))) as fetch:
                cards=collect(source,'예시 검색')
            self.assertEqual(fetch.call_count,1)
            self.assertEqual(set(cards[0]),set(FIELDS))
            self.assertEqual(cards[0]['status'],'pending')
            self.assertNotIn('DO_NOT_STORE',json.dumps(cards))
            if source=='naver':self.assertIsNone(cards[0]['thumbnail_url'])
            if source=='youtube':self.assertIn('fields=',fetch.call_args.args[0].full_url)

    def test_missing_credentials_no_fallback(self):
        with patch.dict(os.environ,{},clear=True),patch('content_cards.urlopen') as fetch:
            for source in ['naver','youtube']:
                with self.assertRaises(ValueError):collect(source,'운동')
            fetch.assert_not_called()

    def test_invalid_source_links(self):
        self.assertEqual(normalize('naver',{'items':[{'title':'예시','link':'javascript:alert(1)'}]}),[])
        self.assertEqual(normalize('youtube',{'items':[{'id':{'videoId':'../../bad'}}]}),[])

    def test_approval_and_browser(self):
        with tempfile.TemporaryDirectory() as directory:
            store=CardStore(Path(directory)/'cards.sqlite3')
            cards=normalize('naver',{'items':[
                {'title':'예시 승인 카드','bloggername':'예시 운영자','link':'https://example.com/approved'},
                {'title':'예시 대기 카드','bloggername':'예시 운영자','link':'https://example.com/pending'},
                {'title':'예시 반려 카드','bloggername':'예시 운영자','link':'https://example.com/rejected'}]})
            video=normalize('youtube',{'items':[{'id':{'videoId':'Example0001'},'snippet':{'title':'예시 유튜브 카드','channelTitle':'예시 채널'}}]})[0]
            store.ingest(cards+[video]);self.assertEqual(store.list(),[])
            store.moderate(cards[0]['id'],'approved');store.moderate(cards[2]['id'],'rejected');store.moderate(video['id'],'approved')
            self.assertEqual(len(store.list()),2)
            # Re-fetch of approved metadata must never silently retain approval.
            store.ingest([cards[0]]);self.assertEqual(len(store.list()),1);store.moderate(cards[0]['id'],'approved')
            token='example-test-only-token-0123456789'
            server=make_server(store,token,0);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
            base='http://127.0.0.1:'+str(server.server_port)
            try:
                with urlopen(base+'/api/cards') as response:self.assertEqual(len(json.load(response)),2)
                with self.assertRaises(HTTPError) as error:urlopen(base+'/api/admin/cards')
                self.assertEqual(error.exception.code,401)
                node=Path('C:/Users/no32b/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe')
                subprocess.run([str(node),'tools/test_content_browser.cjs',base,token,cards[1]['id']],check=True)
                self.assertEqual(len(store.list()),2)
            finally:server.shutdown();server.server_close();thread.join()

if __name__=='__main__':unittest.main()
