/* Local, synthetic acceptance check. Run with NODE_PATH pointing to a Playwright installation. */
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require("playwright");

const BASE_URL = process.env.PROTOTYPE_URL || "http://127.0.0.1:8765/";
const evidence = path.join(__dirname, "evidence");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktop.newPage();
  page.on("pageerror", (error) => failures.push(error.message));
  page.on("console", (entry) => { if (entry.type() === "error") failures.push(entry.text()); });

  await page.goto(BASE_URL);
  await assertVisible(page, "从算力到可用的模型服务");
  await page.screenshot({ path: path.join(evidence, "desktop-overview.png"), fullPage: true, animations: "disabled" });

  await page.getByRole("button", { name: /02 模型目录/ }).click();
  await page.getByRole("button", { name: "私有推理" }).click();
  assert.equal(await page.locator(".model-card").count(), 1);
  await page.getByRole("button", { name: "在工作台试用" }).click();
  assert.equal(await page.locator("#call-model").inputValue(), "private");
  await page.getByRole("button", { name: "模拟发起调用" }).click();
  await page.getByText("模拟调用成功", { exact: true }).waitFor();
  const response = await page.locator("#response-body").innerText();
  assert.match(response, /非真实模型输出/);
  const match = response.match(/sim_req_[a-z0-9]+/);
  assert.ok(match, "request_id must appear in response");
  await page.screenshot({ path: path.join(evidence, "desktop-call.png"), fullPage: true, animations: "disabled" });

  await page.getByRole("button", { name: /05 用量事件/ }).click();
  assert.match(await page.locator("#usage-rows").innerText(), new RegExp(match[0]));
  assert.equal(await page.locator("#event-count").innerText(), "1");

  await page.getByRole("button", { name: /03 访问授权/ }).click();
  await page.getByLabel("申请用途").fill("用于原型回归测试");
  await page.getByRole("button", { name: "提交模拟申请" }).click();
  await page.getByText("待审批 · 演示").waitFor();
  await page.getByRole("button", { name: "切换审批视角" }).click();
  await page.getByRole("button", { name: "批准" }).click();
  assert.equal(await page.getByText("已批准 · 演示").count(), 2);

  await page.getByRole("button", { name: /04 调用工作台/ }).click();
  await page.locator("#call-model").selectOption("public");
  await page.getByRole("button", { name: "模拟发起调用" }).click();
  assert.match(page.url(), /#access$/);

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const mobilePage = await mobile.newPage();
  mobilePage.on("pageerror", (error) => failures.push(error.message));
  await mobilePage.goto(BASE_URL);
  await assertVisible(mobilePage, "从算力到可用的模型服务");
  assert.equal(await mobilePage.locator(".flow-node").count(), 4);
  const bodyWidth = await mobilePage.evaluate(() => document.documentElement.scrollWidth);
  assert.ok(bodyWidth <= 391, `mobile body overflow: ${bodyWidth}px`);
  await mobilePage.screenshot({ path: path.join(evidence, "mobile-overview.png"), fullPage: true, animations: "disabled" });
  await mobilePage.getByRole("button", { name: /03 访问授权/ }).click();
  await assertVisible(mobilePage, "申请项目 API Key");
  await mobilePage.screenshot({ path: path.join(evidence, "mobile-access.png"), fullPage: true, animations: "disabled" });

  assert.deepEqual(failures, []);
  console.log("PASS: desktop model → call → usage, request/approval, missing-key recovery, mobile layout, no browser errors");
  await browser.close();
})().catch((error) => { console.error(error); process.exitCode = 1; });

async function assertVisible(page, text) {
  const locator = page.getByText(text, { exact: true }).first();
  await locator.waitFor({ state: "visible" });
}
