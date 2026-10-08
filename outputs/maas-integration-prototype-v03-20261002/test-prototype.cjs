const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

async function run() {
  const browser = await playwright.chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const errors = [];
  const externalRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  page.on('request', request => { if (!request.url().startsWith('file:')) externalRequests.push(request.url()); });
  const root = __dirname;
  const evidence = path.join(root, 'evidence');
  fs.mkdirSync(evidence, { recursive: true });
  const shot = async name => {
    await page.locator('#toast').evaluate(element => { element.style.display = 'none'; });
    await page.screenshot({ path: path.join(evidence, name), fullPage: true });
  };
  await page.goto(pathToFileURL(path.join(root, 'index.html')).href);
  await page.locator('#reset').click();
  await shot('desktop-overview.png');
  await page.locator('#nav [data-action="nav:deploy"]').click();
  await page.locator('#deploy-form button[type="submit"], #deploy-form button:not([type])').click();
  await page.getByText('Ready', { exact: true }).first().waitFor({ timeout: 10000 });
  assert.match(await page.locator('#content .trace > div:last-child').innerText(), /已执行模拟/);
  await shot('desktop-deployment.png');

  await page.locator('#role').selectOption('operator');
  await page.locator('#nav [data-action="nav:publish"]').click();
  await page.locator('[data-action="publish"]').click();
  await page.locator('#role').selectOption('developer');
  await page.locator('#key-form button').click();
  await page.locator('#nav [data-action="nav:call"]').click();
  await page.locator('#call-form button').click();
  await page.getByText('Rejected', { exact: true }).first().waitFor();

  await page.locator('#role').selectOption('operator');
  await page.locator('#nav [data-action="nav:publish"]').click();
  await page.locator('[data-action="approve"]').click();
  await shot('desktop-publication.png');
  await page.locator('#role').selectOption('developer');
  await page.locator('#nav [data-action="nav:call"]').click();
  await page.locator('#call-form button').click();
  await page.getByText('Succeeded', { exact: true }).first().waitFor();
  await shot('desktop-call-trace.png');
  assert.match(await page.locator('#content').innerText(), /correlation_id/);
  await page.locator('#nav [data-action="nav:usage"]').click();
  assert.match(await page.locator('#content').innerText(), /usage-mc-demo/);
  await shot('desktop-usage.png');

  await page.locator('#role').selectOption('operator');
  await page.locator('#nav [data-action="nav:call"]').click();
  await page.locator('#fault').check();
  await page.locator('#role').selectOption('developer');
  await page.locator('#call-form button').click();
  await page.getByText('Recovered', { exact: true }).first().waitFor();
  await page.locator('#role').selectOption('operator');
  await page.locator('#nav [data-action="nav:publish"]').click();
  await page.locator('#backup').uncheck();
  await page.locator('#role').selectOption('developer');
  await page.locator('#nav [data-action="nav:call"]').click();
  await page.locator('#call-form button').click();
  await page.getByText('Failed', { exact: true }).first().waitFor();
  await page.locator('#role').selectOption('operator');
  await page.locator('#exhausted').check();
  await page.locator('#role').selectOption('developer');
  await page.locator('#call-form button').click();
  await page.getByText('项目模拟预算不足').first().waitFor();

  const simulated = await page.evaluate(() => JSON.parse(localStorage.getItem('matrixcube-maas-v03')));
  assert.equal(simulated.calls.length, 5);
  assert.equal(simulated.calls.filter(call => call.usageId).length, 2);
  assert.equal(simulated.budget, 99.96);

  await page.reload();
  assert.match(await page.locator('#content').innerText(), /Rejected/);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#nav [data-action="nav:contract"]').click();
  await shot('mobile-contract.png');
  const sizes = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, inner: window.innerWidth }));
  assert.ok(sizes.scroll <= sizes.inner + 1, `Mobile overflow: ${JSON.stringify(sizes)}`);
  assert.deepEqual(errors, [], `Browser errors: ${errors.join('; ')}`);
  assert.deepEqual(externalRequests, [], `Unexpected network requests: ${externalRequests.join('; ')}`);
  await browser.close();
  console.log('PASS: deploy/publish/reject/approve/call/usage/failover/failure/budget/persistence/mobile/no browser error/no network');
}

run().catch(error => { console.error(error); process.exitCode = 1; });
