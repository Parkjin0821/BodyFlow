import io
import json
import unittest
from unittest.mock import patch

import naver_recipe_search as naver


class SearchContractTests(unittest.TestCase):
    def test_missing_auth_fails_before_network(self):
        with patch.dict("os.environ", {}, clear=True), patch.object(naver, "urlopen") as fetch:
            with self.assertRaisesRegex(ValueError, "NAVER_CLIENT_ID"):
                naver.search("두부 레시피")
            fetch.assert_not_called()

    def test_metadata_does_not_copy_body_and_rejects_unsafe_links(self):
        payload = {"items": [
            {"title": "<b>두부</b> &amp; 채소", "bloggername": "작성자", "postdate": "20260912",
             "link": "https://blog.naver.com/example/123", "description": "do not copy article"},
            {"title": "bad", "link": "javascript:alert(1)"},
        ]}
        with patch.dict("os.environ", {"NAVER_CLIENT_ID": "test", "NAVER_CLIENT_SECRET": "test"}), \
                patch.object(naver, "urlopen", return_value=io.StringIO(json.dumps(payload))):
            result = naver.search("두부 레시피")
        self.assertEqual(len(result["results"]), 1)
        item = result["results"][0]
        self.assertEqual(item["title"], "두부 & 채소")
        self.assertEqual(item["status"], "pending")
        self.assertIsNone(item["thumbnail_url"])
        self.assertEqual(set(item), {'id','source','title','publisher','thumbnail_url','origin_url','fetched_at','status'})
        self.assertNotIn("description", item)

    def test_empty_results_remain_empty(self):
        with patch.dict("os.environ", {"NAVER_CLIENT_ID": "test", "NAVER_CLIENT_SECRET": "test"}), \
                patch.object(naver, "urlopen", return_value=io.StringIO('{"items": []}')):
            self.assertEqual(naver.search("no match")["results"], [])

    def test_input_boundaries(self):
        for query, limit in [(" ", 10), ("두부", 0), ("두부", 101)]:
            with self.assertRaises(ValueError):
                naver.search(query, limit)


if __name__ == "__main__":
    unittest.main()
