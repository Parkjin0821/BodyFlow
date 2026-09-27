// 예시 responses are served from a temporary database. No live external API/media requests.
const {chromium}=require('C:/Users/no32b/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('assert'),fs=require('fs');
(async()=>{
 const [base,token,pendingId]=process.argv.slice(2);const browser=await chromium.launch({headless:true,channel:'chrome'});
 try {
  const context=await browser.newContext({viewport:{width:390,height:844}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await context.route('https://www.youtube.com/embed/**',r=>r.abort());
  await page.goto(base);await page.waitForFunction(()=>document.querySelectorAll('#content-card-list article').length===2);
  assert(!(await page.locator('#content-card-list').textContent()).includes('예시 대기 카드'));assert(!(await page.locator('#content-card-list').textContent()).includes('예시 반려 카드'));
  await page.locator('[data-tab=more]').click();await page.getByText('YouTube 공식 플레이어 열기',{exact:true}).click();assert.equal(await page.locator('#content-card-list iframe').getAttribute('src'),'https://www.youtube.com/embed/Example0001');assert.equal(await page.locator('video').count(),0);
  assert((await page.locator('#exercise-instruction').textContent()).includes('예시 · BodyFlow 운동 지시문'));assert.equal(await page.locator('#external-content #exercise-instruction').count(),0);
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  const admin=await context.newPage();await admin.goto(base+'/admin');await admin.locator('#load-cards').click();await admin.getByText('운영 인증이 필요합니다.',{exact:true}).waitFor();assert.equal(await admin.locator('#admin-cards article').count(),0);
  await admin.locator('#admin-token').fill(token);await admin.locator('#load-cards').click();await admin.waitForFunction(()=>document.querySelectorAll('#admin-cards article').length===4);await admin.waitForFunction(()=>document.querySelector('#admin-overview').textContent.includes('콘텐츠 카드'));const overviewText=await admin.locator('#admin-overview').textContent();assert(overviewText.includes('4개'),'card total shown');assert(overviewText.includes('서버 저장 없음'),'user records not stored on server');assert(overviewText.includes('연결 안 됨'),'food cache absent is reported, not faked');assert.equal(await admin.locator('#food-page').textContent(),'서버에 음식 캐시가 연결되지 않아 조회할 항목이 없어요');assert(!(await admin.content()).includes(token),'token not written into the page');assert(await admin.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'admin fits mobile width');
  await admin.locator(`[data-content-id="${pendingId}"] [data-status=approved]`).click();await admin.waitForFunction(id=>document.querySelector(`[data-content-id="${id}"] p`)?.textContent.includes('approved'),pendingId);
  await page.waitForFunction(async()=>{const response=await fetch('/api/cards',{cache:'no-store'});return response.ok&&(await response.json()).length===3});
  await page.evaluate(()=>document.querySelector('#refresh-cards').onclick());assert.equal(await page.locator('#content-card-list article').count(),3);
  await admin.locator(`[data-content-id="${pendingId}"] [data-status=rejected]`).click();await admin.waitForFunction(id=>document.querySelector(`[data-content-id="${id}"] p`)?.textContent.includes('rejected'),pendingId);
  await page.waitForFunction(async()=>{const response=await fetch('/api/cards',{cache:'no-store'});return response.ok&&(await response.json()).length===2});
  await page.evaluate(()=>document.querySelector('#refresh-cards').onclick());assert.equal(await page.locator('#content-card-list article').count(),2);
  await page.screenshot({path:'qa/content-cards-mobile.png',fullPage:true});await admin.screenshot({path:'qa/content-admin.png',fullPage:true});assert.deepEqual(errors,[]);
  fs.writeFileSync('qa/content-results.json',JSON.stringify({passed:true,data:'예시 API 응답',checks:['approved-only server and UI','unauthenticated admin blocked','approve and revoke','admin overview (cards, food cache status, user records)','official iframe only','separate exercise instructions','mobile width','no page errors']},null,2));
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
