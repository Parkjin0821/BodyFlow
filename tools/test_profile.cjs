// 예시 입력을 사용하는 온보딩 회귀 검증. 운영 프로필에 예시값을 주입하지 않음.
const {chromium}=require('C:/Users/no32b/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('assert'),fs=require('fs'),path=require('path');
(async()=>{
const browser=await chromium.launch({headless:true,channel:'chrome'});
try{
const page=await browser.newPage({viewport:{width:390,height:844},acceptDownloads:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
const url='file:///'+path.resolve('BodyFlow.html').replaceAll('\\','/');await page.goto(url);await page.locator('#open-profile').click();
assert.equal(await page.locator('#profile-form [name]').evaluateAll(nodes=>new Set(nodes.map(n=>n.name)).size),10);
const sample={goal:'senior_health',age_band:'60s',sex:'female',height_cm:160,weight_kg:65,exercise_sessions_per_week:2,continuous_walk_minutes:30,pain_areas:['knee'],running_experience:'none',rpe:4};
for(const k of ['goal','age_band','sex','running_experience'])await page.locator(`[name=${k}]`).selectOption(sample[k]);
for(const k of ['height_cm','weight_kg','exercise_sessions_per_week','continuous_walk_minutes','rpe'])await page.locator(`[name=${k}]`).fill(String(sample[k]));
await page.locator('[name=pain_areas][value=none]').check();assert(await page.locator('#pain-warning').isHidden());await page.locator('[name=pain_areas][value=knee]').check();assert(!(await page.locator('[name=pain_areas][value=none]').isChecked()));assert(await page.locator('#pain-warning').isVisible());
await page.locator('#profile-form [type=submit]').click();await page.reload();assert((await page.locator('#profile-summary').textContent()).includes('프로필 저장됨'));assert(await page.locator('#profile-pain-notice').isVisible());
const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('bodyflow.records.v1')));assert.deepEqual((await saved()).profile,sample);
const download=page.waitForEvent('download');await page.locator('#export-data').click();const d=await download;const file='qa/profile-export-example.json';await d.saveAs(file);assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')).profile,sample);
await page.evaluate(()=>localStorage.clear());await page.reload();await page.locator('#import-data').setInputFiles(file);await page.waitForFunction(()=>document.querySelector('#profile-summary').textContent.includes('프로필 저장됨'));assert.deepEqual((await saved()).profile,sample);
async function importData(data){await page.locator('#import-data').setInputFiles({name:'example.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(data))});}
await importData({version:1,records:[{date:'2026-09-13',kcal:1600}]});assert.deepEqual((await saved()).profile,sample);assert.equal((await saved()).records.length,1);
const previous=await saved();for(const bad of [{...sample,rpe:11},{...sample,pain_areas:['none','knee']},{...sample,medications:'not allowed'}]){await importData({version:1,records:[{date:'2026-09-12',kcal:999}],profile:bad});assert((await page.locator('#storage-notice').textContent()).includes('실패'));assert.deepEqual(await saved(),previous);}
await page.locator('#open-profile').click();assert.equal(await page.locator('[name=height_cm]').inputValue(),'160');await page.locator('[name=weight_kg]').fill('66');
await page.evaluate(()=>{window.originalSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(){throw new DOMException('full','QuotaExceededError')};});await page.locator('#profile-form [type=submit]').click();assert(await page.locator('#profile-dialog').isVisible());assert((await page.locator('#profile-error').textContent()).includes('저장에 실패'));assert.deepEqual(await saved(),previous);
await page.evaluate(()=>{Storage.prototype.setItem=window.originalSetItem});await page.locator('#profile-form [type=submit]').click();assert.equal((await saved()).profile.weight_kg,66);
await page.locator('#open-profile').click();await page.screenshot({path:'qa/onboarding-mobile.png',fullPage:true});assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
fs.writeFileSync('qa/profile-results.json',JSON.stringify({passed:true,data:'예시 입력',checks:['exactly 10 fields','exclusive pain none','pain warning','save and reload','export and import profile','legacy record import preserves profile','invalid profile atomic rejection','storage failure preserves data','edit saved profile','mobile width','no page errors']},null,2));
}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
