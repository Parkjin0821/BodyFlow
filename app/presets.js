'use strict';
const PRESETS=new Set(['senior_health','diet','strength']);
function labelIconButtons(root=document){for(const button of root.querySelectorAll('button')){const value=button.textContent.trim();if(value==='↻')button.innerHTML='↻ <span>다시 보기</span>';if(value==='×')button.textContent='닫기';}}
function applyGoalPreset(goal){
  const preset=PRESETS.has(goal)?goal:'strength';
  const changed=document.documentElement.dataset.preset!==preset;
  document.documentElement.dataset.preset=preset;
  if(changed&&typeof renderChart==='function'&&document.getElementById('weight-chart'))renderChart('weight-chart');
  return preset;
}
document.addEventListener('DOMContentLoaded',()=>{queueMicrotask(()=>labelIconButtons());new MutationObserver(()=>labelIconButtons()).observe(document.body,{childList:true,subtree:true});});
function decoratePresetChart(id,svg){
  if(id!=='weight-chart'||document.documentElement.dataset.preset!=='diet')return;
  const rows=weightRows(),ticks=[...svg.querySelectorAll('line')].filter(n=>n.getAttribute('x1')===n.getAttribute('x2')&&Math.abs(Number(n.getAttribute('y1'))-Number(n.getAttribute('y2')))===7);
  const points=[...svg.querySelectorAll('circle[data-tip]')],byDate=new Map(points.map(n=>[n.dataset.tip.slice(0,10),n]));
  const values=rows.map((row,index)=>{const recent=rows.slice(Math.max(0,index-6),index+1).map(r=>byDate.get(r.date)).filter(Boolean);if(!recent.length||!ticks[index])return null;return{x:Number(ticks[index].getAttribute('x1')),y:recent.reduce((sum,n)=>sum+Number(n.getAttribute('cy')),0)/recent.length,date:row.date};});
  let pen=false,d='';for(const value of values){if(!value){pen=false;continue;}d+=(pen?' L ':'M ')+value.x+' '+value.y;pen=true;}
  if(!d)return;const path=el(svg,'path',{d,class:'moving-average-line','aria-label':'체중 7일 이동평균선'});path.dataset.series='7-day-average';
  txt(svg,{x:40,y:18,class:'moving-average-label'},'기본 · 7일 이동평균선');txt(svg,{x:40,y:36,class:'moving-average-key'},'보조 · 일별 실측점');
}
