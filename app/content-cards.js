/* Official metadata cards. No example content is silently injected on failure. */
(() => {
  const section = document.createElement('section');
  section.id = 'external-content';
  section.className = 'chart-card';
  section.style.marginTop = '28px';
  section.innerHTML = '<p class="eyebrow">외부 참고 콘텐츠</p><h2>출처에서 더 알아보기</h2><p>운영자가 승인한 링크입니다. 외부 콘텐츠는 BodyFlow 운동 지시문과 별개입니다.</p><button id="refresh-cards">목록 새로고침</button><p id="cards-message" role="status"></p><div id="content-card-list" class="chart-grid"></div>';
  document.querySelector('#plan-extras').append(section);
  const message = section.querySelector('#cards-message');
  const list = section.querySelector('#content-card-list');
  const safe = value => { try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && !u.username && !u.password ? u : null; } catch { return null; } };
  function show(card) {
    if (card.status !== 'approved' || !['naver', 'youtube'].includes(card.source)) return;
    const origin = safe(card.origin_url); if (!origin) return;
    const article = document.createElement('article'); article.dataset.contentId = card.id;
    article.style.cssText = 'border:1px solid var(--grid);border-radius:16px;padding:18px;min-width:0;overflow-wrap:anywhere';
    const label = document.createElement('p'); label.className = 'eyebrow'; label.textContent = `${card.source === 'naver' ? 'NAVER' : 'YOUTUBE'} · 외부 링크`;
    const title = document.createElement('h3'); title.textContent = card.title;
    const publisher = document.createElement('p'); publisher.textContent = card.publisher;
    const link = document.createElement('a'); link.href = origin.href; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = '원문에서 보기';
    article.append(label, title, publisher, link);
    // Only the URL is persisted. No image download/cache is implemented by BodyFlow.
    if (card.source === 'youtube' && safe(card.thumbnail_url)?.hostname.endsWith('.ytimg.com')) {
      const img = document.createElement('img'); img.src = card.thumbnail_url; img.alt = ''; img.loading = 'lazy'; img.style.cssText = 'width:100%;border-radius:12px'; article.prepend(img);
    }
    const video = origin.hostname === 'www.youtube.com' ? origin.searchParams.get('v') : null;
    if (card.source === 'youtube' && /^[A-Za-z0-9_-]{11}$/.test(video || '')) {
      const play = document.createElement('button'); play.textContent = 'YouTube 공식 플레이어 열기';
      play.onclick = () => { const frame = document.createElement('iframe'); frame.src = 'https://www.youtube.com/embed/' + video; frame.title = card.title; frame.allow = 'encrypted-media; picture-in-picture'; frame.allowFullscreen = true; frame.referrerPolicy = 'strict-origin-when-cross-origin'; frame.style.cssText = 'width:100%;aspect-ratio:16/9;border:0;min-height:200px'; play.replaceWith(frame); };
      article.append(play);
    }
    list.append(article);
  }
  async function refresh() {
    list.replaceChildren();
    if (location.protocol === 'file:') { message.textContent = '콘텐츠 API 서버로 앱을 열면 승인된 링크가 표시됩니다. 현재는 연결되지 않았습니다.'; return; }
    try { const response = await fetch('/api/cards', {cache:'no-store'}); if (!response.ok) throw Error(); const cards = await response.json(); if (!Array.isArray(cards)) throw Error(); cards.forEach(show); message.textContent = list.children.length ? '승인된 참고 링크 ' + list.children.length + '개' : '아직 승인된 콘텐츠가 없습니다.'; }
    catch { list.replaceChildren(); message.textContent = '콘텐츠 목록을 불러오지 못했습니다. 다시 시도해 주세요.'; }
  }
  section.querySelector('#refresh-cards').onclick = refresh;
  // ExerciseInstruction is independent of ContentCard; these are explicit UI examples.
  const instruction = {id:'example-instruction', label:'예시 · BodyFlow 운동 지시문', sets:2, reps:8, precautions:'통증이 생기면 중단하세요.', alternative:'몸상태에 맞춰 휴식으로 변경하세요.'};
  const block = document.createElement('article'); block.id = 'exercise-instruction'; block.className = 'chart-card'; block.style.cssText = 'border-left:5px solid var(--accent);margin-top:24px;background:var(--pill)';
  const h = document.createElement('h2'); h.textContent = instruction.label; block.append(h);
  for (const [name, value] of [['세트',instruction.sets],['횟수',instruction.reps],['주의사항',instruction.precautions],['대체동작',instruction.alternative]]) {const p = document.createElement('p'); p.textContent = name + ': ' + value; block.append(p);}
  const note = document.createElement('p'); note.textContent = '데이터 구조 설명용 예시입니다. 외부 영상에서 추출한 지시문이나 개인 맞춤 운동 처방이 아닙니다.'; block.append(note);
  document.querySelector('#plan-extras').append(block);
  refresh();
})();
