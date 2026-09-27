"""사용자 경험에서 제외하기로 한 표현이 프로젝트 코드와 문서에 없는지 검사한다."""
import json
from pathlib import Path
import unittest

ROOT=Path(__file__).resolve().parents[1]
TERMS=('\uc2e4\ud328','\ub2e8\uacc4 '+'\ud558\ub77d','\ub193\ucc44\uc5b4\uc694','\uc5f0\uc18d '+'\uc2e4\ud328','D'+'-day','D'+'-DAY','\ub514\ub370\uc774','\ucd5c\uc800 \uccb4\uc911')
EXTENSIONS={'.js','.cjs','.py','.html','.md','.json','.css'}
EXCLUDED={'.git','reference','qa'}
# 금지 표현 목록 자체를 규칙으로 정의한 파일은 검사에서 제외한다.
RULE_FILES={'CLAUDE.md','AGENTS.md'}

class ForbiddenLanguageTests(unittest.TestCase):
    def test_source_has_no_forbidden_copy(self):
        matches=[]
        for file in ROOT.rglob('*'):
            if not file.is_file() or file.suffix not in EXTENSIONS or any(part in EXCLUDED for part in file.relative_to(ROOT).parts) or str(file.relative_to(ROOT)) in RULE_FILES:
                continue
            text=file.read_text(encoding='utf-8')
            for term in TERMS:
                if term in text:matches.append(f'{file.relative_to(ROOT)}: {term}')
        self.assertEqual(matches,[])
        output={'passed':True,'scope':'reference/, qa/, 규칙 정의 파일(CLAUDE.md, AGENTS.md)을 제외한 소스·설정·문서','term_count':len(TERMS),'match_count':0}
        (ROOT/'qa'/'forbidden-language-results.json').write_text(json.dumps(output,ensure_ascii=False,indent=2),encoding='utf-8')

if __name__=='__main__':unittest.main()
