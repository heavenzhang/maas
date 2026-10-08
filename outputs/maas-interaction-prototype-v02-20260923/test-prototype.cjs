/* Synthetic, browser-local acceptance. NODE_PATH must point to a Playwright installation. */
const assert = require("node:assert/strict");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const { chromium } = require("playwright");

const BASE = process.env.PROTOTYPE_URL || "http://127.0.0.1:8766/";
const evidence = path.join(__dirname, "evidence");
const errors = [];
const snap = async (page, name) => { await page.locator("#toast").evaluate((el) => el.classList.remove("show")); return page.screenshot({ path: path.join(evidence, name), fullPage: true, animations: "disabled" }); };
async function role(page, value) { await page.locator("#role-select").selectOption(value); }
async function nav(page, name) { await page.locator(`[data-nav="${name}"]`).click(); }
async function noOverflow(page, name) {
  const size = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  assert.ok(size.scroll <= size.client + 1, `${name} page overflow: ${size.scroll} > ${size.client}`);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await desktop.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (e) => { if (e.type() === "error") errors.push(e.text()); });
  await page.goto(BASE);
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  assert.match(await page.locator(".demo-ribbon").innerText(), /本地模拟数据/);
  await snap(page, "desktop-overview.png");

  // Developer → operator → developer: same model and key remain linked.
  await nav(page, "catalog");
  await page.getByRole("button", { name: "外部模型" }).click();
  await page.locator('[data-action="select-model"][data-id="public-chat"]').click();
  assert.match(await page.locator("aside.panel").innerText(), /示例·外部通用模型/);
  await nav(page, "keys");
  await page.locator('#key-form [name="purpose"]').fill("验证外部模型接入路径");
  await page.locator('#key-form [name="modelId"]').selectOption("public-chat");
  await page.locator('#key-form button[type="submit"]').click();
  assert.match(await page.locator("#content").innerText(), /待审批/);
  await role(page, "operator");
  await nav(page, "keys");
  await page.locator('[data-action="approve-key"]').click();
  assert.match(await page.locator("#content").innerText(), /已批准/);
  await nav(page, "channels");
  await snap(page, "desktop-channels.png");
  await role(page, "developer");
  await nav(page, "playground");
  await page.locator("#call-model").selectOption("public-chat");
  await page.locator('#call-form button[type="submit"]').click();
  await page.getByText("模拟成功", { exact: true }).waitFor();
  const response = await page.locator(".response").innerText();
  assert.match(response, /不是模型推理结果/);
  const requestId = response.match(/sim_req_[a-z0-9]+/)?.[0];
  assert.ok(requestId);
  await snap(page, "desktop-call.png");
  await nav(page, "usage");
  assert.match(await page.locator("#content").innerText(), new RegExp(requestId));
  assert.match(await page.locator("#content").innerText(), /外部授权渠道/);
  await role(page, "operator");
  await nav(page, "billing");
  await page.locator('[data-action="reconcile"]').click();
  assert.match(await page.locator("#content").innerText(), /已核对·演示/);

  // Embedding has its own request shape, parameters, and non-generative result.
  await role(page, "developer");
  await nav(page, "keys");
  await page.locator('#key-form [name="modelId"]').selectOption("public-embed");
  await page.locator('#key-form [name="purpose"]').fill("验证向量接口形态");
  await page.locator('#key-form button[type="submit"]').click();
  await role(page, "operator");
  await nav(page, "keys");
  await page.locator('[data-action="approve-key"]').click();
  await role(page, "developer");
  await nav(page, "playground");
  await page.locator("#call-model").selectOption("public-embed");
  assert.match(await page.locator("#code-sample").innerText(), /\/v1\/embeddings/);
  assert.doesNotMatch(await page.locator("#code-sample").innerText(), /chat\/completions/);
  assert.equal(await page.getByText("Temperature", { exact: true }).isVisible(), false);
  await page.locator('#call-form button[type="submit"]').click();
  await page.getByText("模拟成功", { exact: true }).waitFor();
  assert.match(await page.locator(".response").innerText(), /模拟向量/);
  assert.match(await page.locator(".response").innerText(), /0 输出/);
  await snap(page, "desktop-embedding.png");
  await role(page, "operator");
  await nav(page, "billing");
  assert.match(await page.locator("#content").innerText(), /差异/);
  await page.locator('[data-action="record-difference"]').click();
  assert.match(await page.locator("#content").innerText(), /差异待处理/);
  await snap(page, "desktop-billing-difference.png");
  await page.locator('[data-action="correct-difference"]').click();
  await page.locator('[data-action="reconcile"]').click();
  assert.match(await page.locator("#content").innerText(), /已核对·演示/);

  // Model admin: deploy → ready → catalog; jobs obey priority policy.
  await role(page, "model-admin");
  await nav(page, "deployments");
  await page.locator('#deploy-form [name="name"]').fill("科研演示模型 B");
  await page.locator('#deploy-form button[type="submit"]').click();
  assert.match(await page.locator("#content").innerText(), /部署中·演示/);
  await role(page, "developer");
  await nav(page, "catalog");
  assert.doesNotMatch(await page.locator("#content").innerText(), /科研演示模型 B/);
  await role(page, "model-admin");
  await nav(page, "deployments");
  await page.locator('[data-action="ready-deployment"]').click();
  await nav(page, "catalog");
  assert.match(await page.locator("#content").innerText(), /科研演示模型 B/);
  await nav(page, "deployments");
  await page.locator('#deploy-form [name="name"]').fill("异构分组演示服务");
  await page.locator('#deploy-form [name="hardware"]').selectOption("b");
  await page.locator('#deploy-form [name="engine"]').selectOption("vLLM");
  await page.locator('#deploy-form button[type="submit"]').click();
  assert.match(await page.locator("#content").innerText(), /NPU-B · 4 卡/);
  await page.locator('[data-action="ready-deployment"]').click();
  await nav(page, "gpu");
  await page.locator('[data-action="filter-gpu"][data-value="b"]').click();
  assert.match(await page.locator("#content").innerText(), /NPU-B/);
  assert.match(await page.locator("#content").innerText(), /已占用 4 \/ 72/);
  await snap(page, "desktop-gpu.png");
  await nav(page, "jobs");
  await page.locator('#job-form [name="name"]').fill("普通作业");
  await page.locator('#job-form button[type="submit"]').click();
  await page.locator('#job-form [name="name"]').fill("核心作业");
  await page.locator('#job-form [name="priority"]').selectOption("high");
  await page.locator('#job-form button[type="submit"]').click();
  await page.locator('[data-action="schedule-jobs"]').click();
  const coreRow = page.locator("tr", { hasText: "核心作业" });
  assert.match(await coreRow.innerText(), /运行中·模拟/);
  await snap(page, "desktop-jobs.png");

  // A vLLM deployment must not be routed through a SGLang channel.
  await role(page, "developer");
  await nav(page, "keys");
  await page.locator('#key-form [name="modelId"]').selectOption({ label: "异构分组演示服务" });
  await page.locator('#key-form [name="purpose"]').fill("验证独立引擎渠道");
  await page.locator('#key-form button[type="submit"]').click();
  await role(page, "operator");
  await nav(page, "keys");
  await page.locator('[data-action="approve-key"]').click();
  await role(page, "developer");
  await nav(page, "playground");
  await page.locator("#call-model").selectOption({ label: "异构分组演示服务 · vLLM" });
  await page.locator('#call-form button[type="submit"]').click();
  await page.getByText("模拟成功", { exact: true }).waitFor();
  assert.match(await page.locator(".response").innerText(), /vLLM · 演示渠道/);

  // Budget rejection routes to operator; recovery allows another call.
  await role(page, "operator");
  await nav(page, "budget");
  const consumed = Number((await page.locator("#content").innerText()).match(/已消耗\s*([\d,]+)/)?.[1]?.replaceAll(",", "") || 0);
  await page.locator('#budget-form [name="limit"]').fill(String(consumed + 1));
  await page.locator('#budget-form button[type="submit"]').click();
  await role(page, "developer");
  await nav(page, "playground");
  await page.locator('#call-form button[type="submit"]').click();
  assert.match(await page.locator(".error-box").innerText(), /额度不足/);
  await page.getByRole("button", { name: "去处理 ↗" }).click();
  assert.match(page.url(), /#budget$/);
  assert.equal(await page.locator("#role-select").inputValue(), "operator");
  await page.locator('#budget-form [name="limit"]').fill("2000");
  await page.locator('#budget-form button[type="submit"]').click();

  // Channel fallback and all-off failure.
  await nav(page, "channels");
  await page.locator('[data-action="toggle-channel"][data-id="sglang-primary"]').click();
  await role(page, "developer");
  await nav(page, "playground");
  await page.locator("#call-model").selectOption("private-main");
  await page.locator('#call-form button[type="submit"]').click();
  await page.getByText("模拟成功", { exact: true }).waitFor();
  assert.match(await page.locator(".response").innerText(), /SGLang · 备用渠道/);
  await role(page, "operator");
  await nav(page, "channels");
  await page.locator('[data-action="toggle-channel"][data-id="sglang-backup"]').click();
  await role(page, "developer");
  await nav(page, "playground");
  await page.locator('#call-form button[type="submit"]').click();
  assert.match(await page.locator(".error-box").innerText(), /渠道已全部停用/);
  await role(page, "model-admin");
  await nav(page, "monitor");
  await page.locator('[data-action="inject-alert"]').click();
  assert.match(await page.locator("#content").innerText(), /服务：示例·企业私有文本模型/);
  assert.match(await page.locator("#content").innerText(), /相关 request_id：sim_req_/);

  // All role-visible routes fit mobile width; direct file opening also works.
  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const mobilePage = await mobile.newPage();
  mobilePage.on("pageerror", (e) => errors.push(e.message));
  await mobilePage.goto(BASE);
  await mobilePage.evaluate(() => localStorage.clear());
  await mobilePage.reload();
  for (const view of ["overview", "catalog", "keys", "playground", "usage"]) { await nav(mobilePage, view); await noOverflow(mobilePage, `developer/${view}`); }
  await nav(mobilePage, "playground");
  await snap(mobilePage, "mobile-playground.png");
  for (const [r, views] of [["model-admin", ["overview", "catalog", "deployments", "gpu", "jobs", "monitor"]], ["operator", ["overview", "catalog", "keys", "channels", "budget", "usage", "billing", "monitor", "security"]]]) {
    await role(mobilePage, r);
    for (const view of views) { await nav(mobilePage, view); await noOverflow(mobilePage, `${r}/${view}`); }
  }
  await nav(mobilePage, "keys");
  await snap(mobilePage, "mobile-keys.png");
  await nav(mobilePage, "security");
  await snap(mobilePage, "mobile-security.png");
  const filePage = await desktop.newPage();
  filePage.on("pageerror", (e) => errors.push(e.message));
  await filePage.goto(pathToFileURL(path.join(__dirname, "index.html")).href);
  assert.match(await filePage.locator("h1").first().innerText(), /开发者工作台/);
  assert.deepEqual(errors, []);
  console.log("PASS: 3 role journeys, deployment, priority scheduling, budget recovery, channel fallback, 20 mobile route checks, file open, no browser errors");
  await browser.close();
})().catch((error) => { console.error(error); process.exitCode = 1; });
