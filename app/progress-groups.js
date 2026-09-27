'use strict';
// 긴 화면을 줄이는 표시 방식. 데이터나 계산은 바꾸지 않는다.
// - 나의 변화: 식단·몸·운동으로 나눠 한 분류만 보여주고, 차트는 요약 문장부터 보여준 뒤 눌러서 펼친다.
// - 계획: 이번 주 카드만 펼치고 다음 주들은 접는다.
(() => {
  const GROUP_TITLE = {diet: '식단 그래프', body: '몸 그래프', move: '운동 그래프'};
  const KEY = 'bodyflow.progressGroup.v1';
  let current = 'diet';
  try { const saved = localStorage.getItem(KEY); if (Object.hasOwn(GROUP_TITLE, saved)) current = saved; } catch {}

  function setExpanded(card, expanded) {
    card.classList.toggle('collapsed', !expanded);
    const button = card.querySelector('.chart-toggle');
    if (button) { button.textContent = expanded ? '그래프 접기' : '그래프 보기'; button.setAttribute('aria-expanded', String(expanded)); }
  }

  function ensureToggle(card) {
    if (card.querySelector('.chart-toggle')) return;
    const svg = card.querySelector('svg[id]'), button = document.createElement('button');
    button.type = 'button'; button.className = 'chart-toggle'; button.setAttribute('aria-controls', svg.id);
    button.onclick = () => {
      const expand = card.classList.contains('collapsed');
      setExpanded(card, expand);
      if (expand && typeof renderChart === 'function') renderChart(svg.id);
    };
    (card.querySelector('.chart-summary') || card.querySelector('.plot')).after(button);
  }

  function showGroup(group) {
    current = group;
    try { localStorage.setItem(KEY, group); } catch {}
    const cards = [...document.querySelectorAll('#progress .chart-card[data-group]')];
    const inGroup = cards.filter(card => card.dataset.group === group);
    for (const card of cards) {
      card.hidden = card.dataset.group !== group;
      ensureToggle(card);
      // 분류에 차트가 하나뿐이면 펼쳐 두고, 여러 개면 요약만 보여준다.
      if (!card.hidden) setExpanded(card, inGroup.length === 1);
    }
    for (const tile of document.querySelectorAll('#progress .summary[data-group]')) tile.hidden = tile.dataset.group !== group;
    document.querySelectorAll('[data-group-tab]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.groupTab === group)));
    const title = document.getElementById('group-title'); if (title) title.textContent = GROUP_TITLE[group];
    const period = document.getElementById('weight-period'); if (period) period.hidden = group !== 'body';
  }

  function collapseLaterWeeks() {
    const list = document.getElementById('plan-week-list'); if (!list) return;
    [...list.querySelectorAll(':scope > .plan-week')].forEach((card, index) => {
      if (card.querySelector('.week-toggle')) return;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'week-toggle';
      const set = open => { card.classList.toggle('collapsed', !open); button.textContent = open ? '세션 접기' : '세션 보기'; button.setAttribute('aria-expanded', String(open)); };
      button.onclick = () => set(card.classList.contains('collapsed'));
      card.append(button); set(index === 0);
    });
  }

  document.querySelectorAll('[data-group-tab]').forEach(button => { button.onclick = () => showGroup(button.dataset.groupTab); });
  showGroup(current);
  const list = document.getElementById('plan-week-list');
  if (list) { new MutationObserver(collapseLaterWeeks).observe(list, {childList: true}); collapseLaterWeeks(); }
  window.BodyFlowProgressGroups = {show: showGroup, current: () => current};
})();
