import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


class NutritionIntegrityTests(unittest.TestCase):
    def test_no_user_editable_nutrition_inputs(self):
        html = (ROOT / "app/index.html").read_text(encoding="utf-8")
        for name in ("kcal", "carbs", "protein", "fat", "sodium"):
            self.assertIsNone(re.search(rf"<input[^>]+name=[\"']{name}[\"']", html, re.I), name)

    def test_no_food_mutation_endpoint(self):
        server = (ROOT / "tools/content_server.py").read_text(encoding="utf-8")
        post_block = server.split("def do_POST", 1)[1]
        self.assertNotIn("'/api/foods'", post_block)
        self.assertNotIn("'/api/foods/", post_block)

    def test_env_key_is_not_in_tracked_source(self):
        for path in [ROOT / ".env.example", ROOT / "tools/food_catalog.py", ROOT / "tools/content_server.py"]:
            text = path.read_text(encoding="utf-8")
            self.assertNotRegex(text, r"MFDS_SERVICE_KEY\s*=\s*[^\s\"']+")


if __name__ == "__main__":
    unittest.main()
