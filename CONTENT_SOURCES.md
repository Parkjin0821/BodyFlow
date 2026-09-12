# 2026-09-12 추가 구현 및 정정

이전 차트는 README·catalog 참고 후 직접 작성한 SVG였습니다. 이번에는 실제 갤러리 콜백을 추출하여 구현했고, 아래 이전 기록의 ‘단순 참고’ 범위를 대체합니다. `provenance.json`과 `tools/build_chart_adapter.py`에서 원본 및 변환을 확인할 수 있습니다.

로컬 `BodyFlow.html`에 기록 입력·저장·수정·JSON 입출력과 차트 인터랙션을 구현했습니다. Figma는 여전히 예시 데이터의 프로토타입입니다. 실제 네이버 호출·자동 크롤링·Adobe 연결·GPS·서버 저장은 완료되지 않았습니다.

---

# BodyFlow 상세 화면 작업 · 2026-09-12

## 실제 연결 상태

- Figma 원본: https://www.figma.com/design/HgoIa0utwpiSp4pQlUPmTL
- 신규 화면 페이지: Detail Flows · 2026.09 (55:2)
- 기존 화면은 유지하고 신규 상세 흐름을 추가합니다.
- Adobe 초기화 도구가 Internal error를 반환했습니다. Adobe 이미지 생성 성공으로 보고하지 않습니다.
- 기본 image_gen 도구로 음식 사진을 새로 생성하고 Figma 원본 레시피 이미지 노드 27:42에 업로드했습니다.
- 이미지 해시: ffa406ff693ad623fa0ee607f6ce02a51bfc0c17
- 로컬 이미지: assets/chicken-tofu-bowl.png
- 추가 이미지: assets/oat-yogurt-bowl.png, assets/chickpea-salad.png. 동일한 촬영 스타일의 요거트·오트·과일·호두 볼과 익힌 병아리콩·채소 샐러드를 각각 기본 image_gen으로 생성했습니다. 두 이미지도 Figma에 업로드했습니다.
- 생성 프롬프트: Korean healthy meal planning app, premium editorial food photograph, single sage ceramic bowl with brown rice, pan-seared tofu, cooked chicken breast, onion, broccoli and scallions, soft natural light, off-white linen, no text or logos. 실제 조리 사진이 아닌 AI 생성 예시입니다.

## 네이버 레시피

- 네이버 직접 검색 페이지 열기는 도구에서 접근 오류로 완료하지 못했습니다.
- blog.naver.com / m.blog.naver.com을 대상으로 검색했지만, 검증 가능한 원문 목록을 확보하지 못했습니다.
- 따라서 네이버 레시피 수집 완료, 크롤링 DB 구축, 실시간 자동 추천 완료라고 표시하지 않습니다.
- 공식 API 문서 확인: https://developers.naver.com/docs/serviceapi/search/blog/blog.md
- 검색 API는 클라이언트 ID와 시크릿이 필요합니다. tools/naver_recipe_search.py는 서버 측 연결을 위한 독립 실행 스크립트이며 현재 인증된 실호출은 수행하지 않았습니다.
- 원문 본문과 이미지를 복제하지 않고, 제목·작성자·작성일·원문 링크 메타데이터를 받아 탐색에 사용합니다. 외부 레시피를 자체 검수 콘텐츠로 표시하지 않습니다.
- 검색 실패, 결과 없음, 인증 미설정 상태를 구분해야 합니다. 알레르기나 영양정보를 제목만으로 추론해 안전 판정을 내리지 않습니다.
- 일정 자동화는 만들지 않았습니다. 추후 서버 연결 시 갱신 주기와 API 약관을 확인해야 합니다.

## 차트 참조

- 사용자 지정 저장소: https://github.com/Parkjin0821/lieflat-charts
- README.md, catalog.md를 직접 읽었습니다.
- 참고한 원칙: 얇은 선, 단위 명시, 실제 관측점, 비교 기준, 차트별 한 가지 질문, 설명과 출처.
- F2 일별 선형 추이, F6 전후 비교, F11 진행률, 구성비·시간구간 표현을 참고하여 Figma 벡터로 새로 작성했습니다. 저장소의 HTML/JS 템플릿 코드를 복사하지 않았습니다.
- 저장소 README는 PolyForm Noncommercial License 1.0.0을 명시합니다. 원본 템플릿을 제품에 포함하는 경우 별도 라이선스 확인이 필요합니다.

## 시연 데이터

- 개인 측정 데이터나 실제 권장량이 아닙니다. 모든 열량·체중·운동량은 화면 검증용 예시입니다.
- 9/6–9/12 섭취 열량: 1510, 1630, null, 1570, 1690, 1540, 1600 kcal. 기록일 6일, 평균 1590 kcal.
- 체중: 64.8, 64.7, null, 64.6, 64.9, 64.5, 64.4 kg. 첫/마지막 기록 차이 -0.4 kg. null은 0으로 계산하지 않고 선도 끊습니다.
- 활동 시간: 지난주 근력 35분·유산소 70분, 이번 주 근력 45분·유산소 95분.
- 러닝: 1 km 580초, 1 km 560초, 1 km 550초, 0.2 km 110초 = 3.2 km 1800초, 평균 562.5초/km, 표시는 9분 23초/km.
- 영양 진행률: 탄수 120/180g, 단백 72/90g, 지방 39/60g. 식사 열량은 반올림한 예시이며 목표는 개인 처방이 아닙니다.
- 레시피 영양 표시는 검수 전 시연값 510 kcal, 탄수 54g·단백 42g·지방 14g입니다. 원재료 DB와 수율 검증 없이 실제 영양표로 사용하지 않습니다.
- 추가 레시피의 350 kcal(요거트 볼), 340 kcal(병아리콩 샐러드) 역시 검수 전 시연값입니다. 메뉴별 식사 기록·완료 화면에 각각 대응시켰습니다.

## 식품 조리 참고

- USDA FSIS 안전 조리 온도 안내: https://www.fsis.usda.gov/food-safety/safe-food-handling-and-preparation/food-safety-basics/safe-temperature-chart
- 닭고기 중심 온도는 식품용 온도계로 확인하도록 안내합니다. 실제 음식의 색만으로 충분히 익었다고 판단하지 않습니다.
- 조리 화면의 닭고기 중심부 74°C 안내는 위 USDA FSIS의 165°F/약 74°C 기준을 참고했습니다.

## 연결 스크립트 검증

- tools/test_naver_recipe_search.py의 4개 테스트 통과: 인증 누락 시 네트워크 호출 방지, 메타데이터 정리·잘못된 URL 제외, 빈 결과, 검색 조건 범위.
- 실제 인증 정보를 사용한 NAVER API 호출은 미실행입니다.

## 구현 범위

Figma는 편집 가능한 디자인과 화면 간 이동 시연입니다. 계정·실제 저장·사진 인식·실시간 AI 생성·GPS·타이머·자동 콘텐츠 갱신은 연결되지 않았습니다. 폼은 예시 선택 상태이며 실제 입력 엔진을 구현한 것은 아닙니다.
