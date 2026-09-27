from pathlib import Path
import json, hashlib
root=Path(__file__).resolve().parents[1]
p=root/'README.md'
old=p.read_text(encoding='utf-8')
p.write_text('''# BodyFlow — 실행 앱과 Figma 상세 디자인

**실행:** `BodyFlow.html`을 Chrome 또는 Edge에서 여세요. 별도 설치 없이 실행됩니다.

- 실제 Lieflat 템플릿 7종, 라이트/다크 테마, 기간 선택·값 탐색·재생
- 날짜별 체중·식단·운동 기록 입력/수정, 브라우저 저장, JSON 백업/복원
- 예시 데이터와 내 기록 분리. 러닝·페이스·레시피는 현재 예시 데이터
- Figma 32종 × 2테마 = 64개 상세 화면. 실행 앱은 차트·기록 중심의 일부 기능 구현

최신 범위와 남은 작업은 [진행현황_구현범위_보완과제.md](진행현황_구현범위_보완과제.md)를 확인하세요.

## 파일 안내

| 파일/폴더 | 용도 |
|---|---|
| BodyFlow.html | 독립 실행 앱 |
| app/ | HTML·CSS·JavaScript 분리 소스 |
| assets/lieflat/ | 실제 템플릿 SVG 및 Figma용 벡터 |
| reference/lieflat-charts/ | 사용한 원본 파일과 라이선스 |
| provenance.json | 커밋·템플릿 추출 출처 |
| qa/ | 브라우저/Figma 검수 결과와 화면 캡처 |
| tools/ | 빌드, 테스트, 네이버 연결, 전달 폴더 복사 스크립트 |
| design-manifest.json | 클라우드 Figma 화면·차트 노드 목록 |

기록은 브라우저에만 저장됩니다. 파일 위치나 브라우저를 바꾸기 전에 JSON으로 백업하세요. API 인증키는 포함하지 않습니다. 원본 차트의 비상업 라이선스와 상업 배포 전 검토 사항은 진행 보고서를 참고하세요.

## 이전 Figma 납품 기록

아래는 이전 디자인 단계의 기록입니다. ‘실제 연결되지 않은 기능’은 당시 Figma 기준이며, 현재 로컬 앱의 입력·저장·차트 동작 범위는 위 안내와 최신 보고서를 따릅니다. 기존 직접 작성 SVG는 이력 보관용이고 현재 차트는 실제 Lieflat 템플릿으로 교체했습니다.

'''+old,encoding='utf-8')
p=root/'CONTENT_SOURCES.md'
p.write_text('''# 2026-09-12 추가 구현 및 정정

이전 차트는 README·catalog 참고 후 직접 작성한 SVG였습니다. 이번에는 실제 갤러리 콜백을 추출하여 구현했고, 아래 이전 기록의 ‘단순 참고’ 범위를 대체합니다. `provenance.json`과 `tools/build_chart_adapter.py`에서 원본 및 변환을 확인할 수 있습니다.

로컬 `BodyFlow.html`에 기록 입력·저장·수정·JSON 입출력과 차트 인터랙션을 구현했습니다. Figma는 여전히 예시 데이터의 프로토타입입니다. 실제 네이버 호출·자동 크롤링·Adobe 연결·GPS·서버 저장은 완료되지 않았습니다.

---

'''+p.read_text(encoding='utf-8'),encoding='utf-8')
manifest=json.loads((root/'design-manifest.json').read_text(encoding='utf-8'))
qa=json.loads((root/'qa/figma-final.json').read_text(encoding='utf-8'))
manifest['implementedChartNodes']=qa['charts']
manifest['status']['localApp']='working offline web app; chart/record subset, not all 64 Figma screens'
manifest['status']['charts']='actual template callbacks extracted; 7 types, 14 Figma SVG instances'
(root/'design-manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
files={str(p.relative_to(root/'reference/lieflat-charts')).replace('\\','/'):hashlib.sha256(p.read_bytes()).hexdigest() for p in (root/'reference/lieflat-charts').rglob('*') if p.is_file()}
(root/'reference/source-hashes.json').write_text(json.dumps(files,ensure_ascii=False,indent=2),encoding='utf-8')
for name,url in [('BodyFlow-Figma','https://www.figma.com/design/HgoIa0utwpiSp4pQlUPmTL?node-id=83-135'),('BodyFlow-Prototype','https://www.figma.com/proto/HgoIa0utwpiSp4pQlUPmTL?node-id=29-45&page-id=75-2&starting-point-node-id=29-45&scaling=scale-down')]:
 (root/(name+'.url')).write_text('[InternetShortcut]\nURL='+url+'\n',encoding='utf-8')
print('Documentation and provenance finalized')
