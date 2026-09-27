'use strict';
// Operator credentials stay in memory/input only, never localStorage or card exports.
const notice = document.querySelector('#admin-message'), host = document.querySelector('#admin-cards');
async function request(path, body) {
  const response = await fetch(path, {method:body ? 'POST' : 'GET',cache:'no-store',headers:{'Authorization':'Bearer '+document.querySelector('#admin-token').value,'Content-Type':'application/json'},body:body ? JSON.stringify(body) : undefined});
  const data = await response.json(); if (!response.ok) throw Error(data.error || '요청 오류'); return data;
}
function stat(label, value, detail) {
  const box = document.createElement('div'), span = document.createElement('span'), strong = document.createElement('strong'), small = document.createElement('small');
  box.className = 'stat'; span.textContent = label; strong.textContent = value; small.textContent = detail || ''; box.append(span, strong, small); return box;
}
const when = value => value ? value.replace('T', ' ').slice(0, 16) : '없음';
async function loadOverview() {
  const box = document.querySelector('#admin-overview'), data = await request('/api/admin/overview');
  const cards = data.cards, foods = data.foods;
  box.replaceChildren(
    stat('식약처 음식 캐시', foods ? foods.count.toLocaleString() + '개' : '연결 안 됨', foods ? '최근 수신 ' + when(foods.newest_fetched_at) : '서버에 음식 캐시가 설정되지 않았어요'),
    stat('식약처 API 키', data.mfds_key_configured ? '설정됨' : '미설정', data.mfds_key_configured ? '검색 시 공식 API에서 받아 저장해요' : '.env의 MFDS_SERVICE_KEY 필요 · 캐시만 조회돼요'),
    stat('콘텐츠 카드', cards.total + '개', `승인 ${cards.by_status.approved} · 대기 ${cards.by_status.pending} · 반려 ${cards.by_status.rejected}`),
    stat('사용자 기록', '서버 저장 없음', '각 사용자 브라우저에만 저장돼요'));
  return data;
}
let foodOffset = 0;
async function loadFoods(offset = 0) {
  const table = document.querySelector('#food-admin-table'), body = table.querySelector('tbody'), label = document.querySelector('#food-page');
  const query = document.querySelector('#food-admin-query').value.trim();
  const data = await request('/api/admin/foods?' + new URLSearchParams({query, offset, limit: 20}));
  foodOffset = data.offset; body.replaceChildren();
  for (const item of data.items) {
    const tr = body.insertRow();
    for (const value of [item.name, item.serving_size_g, item.kcal, item.carb_g, item.protein_g, item.fat_g, item.sodium_mg, item.source_id, when(item.fetched_at)]) tr.insertCell().textContent = value;
  }
  table.hidden = !data.items.length;
  label.textContent = data.total ? `${data.offset + 1}–${data.offset + data.items.length} / ${data.total.toLocaleString()}개` : (query ? '검색 결과가 없어요' : '캐시에 저장된 음식이 아직 없어요');
  document.querySelector('#food-prev').disabled = data.offset === 0;
  document.querySelector('#food-next').disabled = data.offset + data.items.length >= data.total;
}
async function loadCards() {
  host.replaceChildren();
  try { const cards = await request('/api/admin/cards'); for (const card of cards) {
    const article = document.createElement('article'); article.className = 'chart-card'; article.dataset.contentId = card.id; article.style.marginTop = '16px';
    const title = document.createElement('h2'); title.textContent = card.title;
    const p = document.createElement('p'); p.textContent = `${card.source} · ${card.publisher} · ${card.status} · ${card.fetched_at}`;
    const link = document.createElement('a'); link.href = card.origin_url; link.textContent = '원문 검토'; link.target = '_blank'; link.rel = 'noopener noreferrer';
    article.append(title,p,link);
    for (const [status,label] of [['approved','승인'],['rejected','반려'],['pending','승인 취소']]) {const button=document.createElement('button');button.textContent=label;button.dataset.status=status;button.onclick=async()=>{try{await request('/api/admin/moderate',{id:card.id,status});await loadCards();await loadOverview()}catch(e){notice.textContent=e.message}};article.append(button);}
    host.append(article);
  } notice.textContent = cards.length+'개 · 운영 전용'; } catch(e) {notice.textContent=e.message;}
}
async function loadAll() {
  await loadCards();
  try { const overview = await loadOverview(); if (overview.foods) await loadFoods(0); else { document.querySelector('#food-admin-table').hidden = true; document.querySelector('#food-page').textContent = '서버에 음식 캐시가 연결되지 않아 조회할 항목이 없어요'; } } catch (e) { notice.textContent = e.message; }
}
document.querySelector('#load-cards').onclick=loadAll;
document.querySelector('#food-admin-form').onsubmit=async e=>{e.preventDefault();try{await loadFoods(0)}catch(error){notice.textContent=error.message}};
document.querySelector('#food-prev').onclick=async()=>{try{await loadFoods(Math.max(0,foodOffset-20))}catch(error){notice.textContent=error.message}};
document.querySelector('#food-next').onclick=async()=>{try{await loadFoods(foodOffset+20)}catch(error){notice.textContent=error.message}};
document.querySelector('#collect-form').onsubmit=async e=>{e.preventDefault();try{await request('/api/admin/collect',{source:document.querySelector('#source').value,query:document.querySelector('#query').value});await loadCards();await loadOverview()}catch(error){notice.textContent=error.message}};
