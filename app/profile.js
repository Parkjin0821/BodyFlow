'use strict';
// User-entered profile only: no generated/default/example personal values.
const PROFILE_OPTIONS = {
  goal: {senior_health:'중장년 건강',diet:'체중 관리',strength:'근력 향상'},
  age_band: {under_20:'20세 미만','20s':'20대','30s':'30대','40s':'40대','50s':'50대','60s':'60대','70s':'70대','80_plus':'80대 이상'},
  sex: {female:'여성',male:'남성',other:'기타',undisclosed:'응답하지 않음'},
  running_experience: {none:'없음',under_6_months:'6개월 미만',at_least_6_months:'6개월 이상'}
};
const PROFILE_NUMBERS = {height_cm:[50,250],weight_kg:[20,400],exercise_sessions_per_week:[0,50],continuous_walk_minutes:[0,1440],rpe:[1,10]};
const PROFILE_PAIN = {knee:'무릎',back:'허리',ankle:'발목',shoulder:'어깨',none:'없음'};
function validateProfile(value) {
  if(value===null)return null;
  const fields=[...Object.keys(PROFILE_OPTIONS),...Object.keys(PROFILE_NUMBERS),'pain_areas'];
  if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).length!==fields.length||fields.some(k=>!Object.hasOwn(value,k)))throw Error('프로필은 지정된 항목만 포함해야 합니다.');
  const result={};
  for(const [key,options] of Object.entries(PROFILE_OPTIONS)){if(typeof value[key]!=='string'||!Object.hasOwn(options,value[key]))throw Error('프로필 선택 항목을 확인하세요.');result[key]=value[key];}
  for(const [key,[min,max]] of Object.entries(PROFILE_NUMBERS)){const n=value[key];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max||(['exercise_sessions_per_week','continuous_walk_minutes','rpe'].includes(key)&&!Number.isInteger(n)))throw Error('프로필 수치 범위를 확인하세요.');result[key]=n;}
  const pain=value.pain_areas;
  if(!Array.isArray(pain)||!pain.length||new Set(pain).size!==pain.length||pain.some(p=>typeof p!=='string'||!Object.hasOwn(PROFILE_PAIN,p))||(pain.includes('none')&&pain.length!==1))throw Error('통증 부위 또는 없음 중에서 선택하세요.');
  result.pain_areas=[...pain];return result;
}
function refreshProfileUI(){
  applyGoalPreset(profile?.goal);
  const status=document.getElementById('profile-summary');if(!status)return;
  status.textContent=profile ? `${PROFILE_OPTIONS.goal[profile.goal]} · ${PROFILE_OPTIONS.age_band[profile.age_band]} · 프로필 저장됨` : '러닝·운동 계획을 위한 프로필을 입력해 주세요.';
  document.getElementById('open-profile').textContent=profile?'프로필 수정':'프로필 시작하기';
  document.getElementById('profile-pain-notice').hidden=!profile||profile.pain_areas.includes('none');
}
document.addEventListener('DOMContentLoaded',()=>{
  const box=document.createElement('section');
  box.className='profile-access';box.innerHTML='<p class="eyebrow">내 프로필</p><p id="profile-summary"></p><p id="profile-pain-notice" hidden>의료적 진단이 아니며 통증이 지속되면 전문의 상담</p><button id="open-profile">프로필 시작하기</button>';
  box.style.display='block';document.querySelector('main footer').before(box);
  const dialog=document.createElement('dialog');dialog.id='profile-dialog';dialog.setAttribute('aria-labelledby','profile-title');
  dialog.innerHTML='<form id="profile-form"><div class="card-top"><h2 id="profile-title">내 프로필</h2><button type="button" id="close-profile" aria-label="프로필 닫기">×</button></div><p>이 브라우저에 저장합니다. 질환명과 복용약은 수집하지 않습니다.</p><div id="profile-fields" class="form-grid"></div><fieldset id="profile-pain"><legend>통증/불편 부위</legend></fieldset><p id="pain-warning" role="status" hidden>의료적 진단이 아니며 통증이 지속되면 전문의 상담</p><p id="rpe-help">현재 활동할 때 대화를 얼마나 편하게 이어갈 수 있는지 떠올려, 느끼는 강도를 RPE 1~10으로 선택하세요. 1은 매우 쉬움, 10은 최대 강도입니다.</p><p id="profile-error" role="status"></p><button type="submit" class="primary">온보딩 완료 · 프로필 저장</button></form>';
  document.body.append(dialog);const form=dialog.querySelector('form'),fields=dialog.querySelector('#profile-fields');
  const labels={goal:'목표',age_band:'나이대',sex:'성별',height_cm:'키 (cm)',weight_kg:'체중 (kg)',exercise_sessions_per_week:'주당 운동 횟수',continuous_walk_minutes:'연속으로 걸을 수 있는 시간 (분)',running_experience:'러닝 경험',rpe:'대화 가능 여부 기준 강도 (RPE 1~10)'};
  for(const key of ['goal','age_band','sex','height_cm','weight_kg','exercise_sessions_per_week','continuous_walk_minutes','running_experience','rpe']){
    const label=document.createElement('label');label.textContent=labels[key];let input;
    if(PROFILE_OPTIONS[key]){input=document.createElement('select');input.add(new Option('선택해 주세요',''));for(const [value,text]of Object.entries(PROFILE_OPTIONS[key]))input.add(new Option(text,value));input.style.cssText='display:block;width:100%;padding:10px;border-radius:10px;background:var(--bg);color:var(--ink);border:1px solid var(--grid)';}
    else{input=document.createElement('input');input.type='number';[input.min,input.max]=PROFILE_NUMBERS[key];input.step=['height_cm','weight_kg'].includes(key)?'.1':'1';}
    input.name=key;input.required=true;if(key==='rpe')input.setAttribute('aria-describedby','rpe-help');label.append(input);fields.append(label);
  }
  const checks=[];for(const [value,text]of Object.entries(PROFILE_PAIN)){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.name='pain_areas';input.value=value;input.style.cssText='display:inline-block;width:auto;margin:0 10px 0 0';label.append(input,document.createTextNode(text));dialog.querySelector('#profile-pain').append(label);checks.push(input);}
  function warning(){dialog.querySelector('#pain-warning').hidden=!checks.some(c=>c.checked&&c.value!=='none');}
  checks.forEach(input=>input.onchange=()=>{if(input.checked)checks.forEach(c=>{if(c!==input&&(input.value==='none'||c.value==='none'))c.checked=false;});warning();});
  document.getElementById('open-profile').onclick=()=>{form.reset();dialog.querySelector('#profile-error').textContent='';if(profile){for(const key of Object.keys(labels))form.elements[key].value=profile[key];checks.forEach(c=>c.checked=profile.pain_areas.includes(c.value));}warning();dialog.showModal();};
  dialog.querySelector('#close-profile').onclick=()=>dialog.close();
  form.onsubmit=e=>{e.preventDefault();try{const draft={};for(const key of Object.keys(PROFILE_OPTIONS))draft[key]=form.elements[key].value;for(const key of Object.keys(PROFILE_NUMBERS))draft[key]=Number(form.elements[key].value);draft.pain_areas=checks.filter(c=>c.checked).map(c=>c.value);const validated=validateProfile(draft);localStorage.setItem(STORAGE,JSON.stringify({version:1,records:own,profile:validated}));profile=validated;refreshProfileUI();dialog.close();}catch(error){dialog.querySelector('#profile-error').textContent=error.name==='QuotaExceededError'?'프로필 저장에 실패했습니다. 저장 공간을 확인하세요.':error.message;}};
  refreshProfileUI();
});
