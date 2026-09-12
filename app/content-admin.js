'use strict';
// Operator credentials stay in memory/input only, never localStorage or card exports.
const notice = document.querySelector('#admin-message'), host = document.querySelector('#admin-cards');
async function request(path, body) {
  const response = await fetch(path, {method:body ? 'POST' : 'GET',cache:'no-store',headers:{'Authorization':'Bearer '+document.querySelector('#admin-token').value,'Content-Type':'application/json'},body:body ? JSON.stringify(body) : undefined});
  const data = await response.json(); if (!response.ok) throw Error(data.error || '요청 실패'); return data;
}
async function loadCards() {
  host.replaceChildren();
  try { const cards = await request('/api/admin/cards'); for (const card of cards) {
    const article = document.createElement('article'); article.className = 'chart-card'; article.dataset.contentId = card.id; article.style.marginTop = '16px';
    const title = document.createElement('h2'); title.textContent = card.title;
    const p = document.createElement('p'); p.textContent = `${card.source} · ${card.publisher} · ${card.status} · ${card.fetched_at}`;
    const link = document.createElement('a'); link.href = card.origin_url; link.textContent = '원문 검토'; link.target = '_blank'; link.rel = 'noopener noreferrer';
    article.append(title,p,link);
    for (const [status,label] of [['approved','승인'],['rejected','반려'],['pending','승인 취소']]) {const button=document.createElement('button');button.textContent=label;button.dataset.status=status;button.onclick=async()=>{try{await request('/api/admin/moderate',{id:card.id,status});await loadCards()}catch(e){notice.textContent=e.message}};article.append(button);}
    host.append(article);
  } notice.textContent = cards.length+'개 · 운영 전용'; } catch(e) {notice.textContent=e.message;}
}
document.querySelector('#load-cards').onclick=loadCards;
document.querySelector('#collect-form').onsubmit=async e=>{e.preventDefault();try{await request('/api/admin/collect',{source:document.querySelector('#source').value,query:document.querySelector('#query').value});await loadCards()}catch(error){notice.textContent=error.message}};
