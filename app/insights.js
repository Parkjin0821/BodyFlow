'use strict';
const INSUFFICIENT_SUMMARY='아직 비교할 기록이 부족해요';

function nutritionSummary(){
  const row=latestRecord();
  if(!row||[row.carbs,row.protein,row.fat].every(value=>value===null))return INSUFFICIENT_SUMMARY;
  const parts=[['탄수화물',row.carbs],['단백질',row.protein],['지방',row.fat]].filter(([,value])=>value!==null).map(([name,value])=>`${name} ${value}g`);
  return `마지막 기록은 ${parts.join(' · ')}이에요`;
}
function caloriesSummary(){
  const values=weekRows().filter(row=>row.kcal!==null).map(row=>row.kcal);
  if(!values.length)return INSUFFICIENT_SUMMARY;
  return `최근 7일 기록일 평균은 ${Math.round(values.reduce((sum,value)=>sum+value,0)/values.length).toLocaleString()} kcal예요`;
}
function recipeSummary(){const row=latestRecord();return row?.food_combination?`${row.food_combination.name}은 식약처 구성값으로 ${row.kcal} kcal예요`:INSUFFICIENT_SUMMARY;}
function weightSummary(){
  const values=weightRows().filter(row=>row.weight!==null);
  if(values.length<2)return INSUFFICIENT_SUMMARY;
  const change=+(values.at(-1).weight-values[0].weight).toFixed(1);
  if(change===0)return '첫 기록과 마지막 체중이 같아요';
  return `첫 기록보다 체중이 ${Math.abs(change).toFixed(1)} kg ${change>0?'늘었어요':'줄었어요'}`;
}
function activitySummary(){
  const end=lastDate(),recentStart=addDays(end,-6),priorEnd=addDays(end,-7),priorStart=addDays(end,-13),source=records();
  if(!source.some(row=>row.date>=recentStart&&row.date<=end&&(row.strength!==null||row.cardio!==null))||!source.some(row=>row.date>=priorStart&&row.date<=priorEnd&&(row.strength!==null||row.cardio!==null)))return INSUFFICIENT_SUMMARY;
  const pairs=activityPairs(),previous=pairs.reduce((sum,row)=>sum+row[1],0),current=pairs.reduce((sum,row)=>sum+row[2],0),change=current-previous;
  if(change===0)return '지난주와 이번 주의 총 운동 시간이 같아요';
  return `지난주보다 총 ${Math.abs(change)}분 ${change>0?'더':'덜'} 운동했어요`;
}
function runningSummary(){const info=runningStages();if(!info.stages)return info.rest?'이번 주는 쉬는 주간이라 걷기·달리기 세션이 없어요':'이번 주 계획에 걷기·달리기 세션이 없어요';const walk=info.stages.reduce((sum,[,segs])=>sum+segs[0],0),run=info.stages.reduce((sum,[,segs])=>sum+segs[1],0);return info.source==='plan'?`이번 주 계획 세션은 걷기 ${walk}분과 달리기 ${run}분으로 구성돼요`:`예시 세션은 걷기 ${walk}분과 달리기 ${run}분으로 구성돼요`;}
function paceSummary(){const last=tableFor('pace-chart').slice(1).filter(row=>/^\d+ km$/.test(row[0])).at(-1);return last?`예시 ${last[0]} 구간 기록은 ${last[1]}예요`:INSUFFICIENT_SUMMARY;}

const chartSummaryFunctions={
  'nutrition-chart':nutritionSummary,
  'calories-chart':caloriesSummary,
  'recipe-chart':recipeSummary,
  'weight-chart':weightSummary,
  'activity-chart':activitySummary,
  'running-chart':runningSummary,
  'pace-chart':paceSummary
};
function updateChartSummary(id){
  const svg=document.getElementById(id),card=svg?.closest('.chart-card');if(!card||!chartSummaryFunctions[id])return;
  let summary=card.querySelector('.chart-summary');if(!summary){summary=document.createElement('p');summary.className='chart-summary';summary.setAttribute('aria-live','polite');card.querySelector('.plot').before(summary);}summary.textContent=chartSummaryFunctions[id]();
}
function renderInsights(){Object.keys(chartSummaryFunctions).forEach(updateChartSummary);const home=document.getElementById('today-summary-title');if(home)home.textContent=activitySummary();}
renderInsights();
