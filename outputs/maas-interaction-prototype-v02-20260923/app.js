/* MatrixCube MaaS v0.2. All records, transitions and metrics are browser-local simulations. */
(() => {
  "use strict";
  const STORAGE = "matrixcube-maas-prototype-v02";
  const TOTAL_GPU = 216;
  const roleNames = { developer: "开发者", "model-admin": "模型管理员", operator: "平台运营" };
  const routes = {
    overview: ["工作台", ["developer", "model-admin", "operator"]],
    catalog: ["模型目录", ["developer", "model-admin", "operator"]],
    keys: ["Key 与审批", ["developer", "operator"]],
    playground: ["调用工作台", ["developer"]],
    usage: ["请求与用量", ["developer", "operator"]],
    deployments: ["模型部署", ["model-admin"]],
    gpu: ["算力资源池", ["model-admin"]],
    jobs: ["训练与调度", ["model-admin"]],
    monitor: ["监控告警", ["model-admin", "operator"]],
    channels: ["渠道与路由", ["operator"]],
    budget: ["预算与服务包", ["operator"]],
    billing: ["对账与审计", ["operator"]],
    security: ["安全与升级", ["operator"]]
  };
  const sharedModelFacts = [
    { id: "public-chat", name: "示例·外部通用模型", family: "文本生成", source: "外部授权渠道", engine: "供应商", context: "32K · 演示值", price: "10 点 / 千 Token · 演示规则", access: "需项目 Key" },
    { id: "public-embed", name: "示例·向量模型", family: "Embedding", source: "外部授权渠道", engine: "供应商", context: "8K · 演示值", price: "4 点 / 千 Token · 演示规则", access: "需项目 Key" }
  ];
  function initial() {
    return {
      version: 2, role: "developer", budget: 1200, consumed: 0, policy: "核心业务优先",
      keys: [{ id: "key_demo_1", label: "demo_••••_4172", project: "科研工作台", purpose: "预置演示权限", modelId: "private-main", status: "approved", created: "演示预置" }],
      deployments: [{ id: "dep_main", modelId: "private-main", name: "示例·企业私有文本模型", engine: "SGLang", gpu: 8, status: "ready", created: "演示预置" }],
      channels: [
        { id: "sglang-primary", name: "SGLang · 主渠道", type: "private", enabled: true, priority: 100 },
        { id: "sglang-backup", name: "SGLang · 备用渠道", type: "private", enabled: true, priority: 60 },
        { id: "vllm-primary", name: "vLLM · 演示渠道", type: "vllm", enabled: true, priority: 90 },
        { id: "external", name: "外部授权渠道", type: "public", enabled: true, priority: 80 }
      ],
      jobs: [], events: [], alerts: [], patchDemo: false
    };
  }
  function read() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE) || "null");
      if (value?.version === 2 && Array.isArray(value.keys) && Array.isArray(value.events) && Array.isArray(value.deployments) && Array.isArray(value.channels)) {
        if (!value.channels.some((x) => x.id === "vllm-primary")) value.channels.push({ id: "vllm-primary", name: "vLLM · 演示渠道", type: "vllm", enabled: true, priority: 90 });
        return value;
      }
    } catch (_) { /* private browsing can block storage */ }
    return initial();
  }
  let state = read();
  let route = "overview";
  let modelFilter = "all";
  let selectedModel = "private-main";
  let selectedCallModel = "private-main";
  let selectedEvent = "";
  let selectedNode = "all";
  let draftPrompt = "请说明企业私有模型怎样通过统一 API 提供服务。";
  let callPending = false;
  let callEpoch = 0;
  let callResult = null;
  let toastTimer;
  const $ = (id) => document.getElementById(id);
  const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]);
  const now = () => new Date().toLocaleString("zh-CN", { hour12: false });
  const id = (prefix) => `${prefix}_${globalThis.crypto?.randomUUID?.().slice(0, 8) || Math.random().toString(36).slice(2, 10)}`;
  const fmt = (n) => Number(n).toLocaleString("zh-CN");
  const remaining = () => Math.max(0, Number(state.budget) - Number(state.consumed));
  const allocatedGpu = () => state.deployments.filter((x) => x.status !== "offline").reduce((n, x) => n + Number(x.gpu), 0) + state.jobs.filter((x) => x.status === "running").reduce((n, x) => n + Number(x.gpu), 0);
  const availableGpu = () => TOTAL_GPU - allocatedGpu();
  const hardwareNames = { a: "GPU-A", b: "NPU-B", c: "DCU-C" };
  const usedByGroup = (group) => state.deployments.filter((x) => x.status !== "offline" && (x.hardware || "a") === group).reduce((n, x) => n + Number(x.gpu), 0) + (group === "a" ? state.jobs.filter((x) => x.status === "running").reduce((n, x) => n + Number(x.gpu), 0) : 0);
  const availableByGroup = (group) => 72 - usedByGroup(group);
  const allModels = () => [
    ...state.deployments.filter((x) => x.status !== "offline").map((x) => ({ id: x.modelId, name: x.name, family: "文本生成", source: "私有推理", engine: x.engine, context: "32K · 演示值", price: "8 点 / 千 Token · 演示规则", access: "需项目 Key", status: x.status })),
    ...sharedModelFacts.map((x) => ({ ...x, status: "ready" }))
  ];
  const modelById = (modelId) => allModels().find((x) => x.id === modelId);
  const channelFor = (modelId) => { const model = modelById(modelId); const type = model?.source === "外部授权渠道" ? "public" : model?.engine === "vLLM" ? "vllm" : "private"; return state.channels.filter((x) => x.type === type && x.enabled).sort((a, b) => b.priority - a.priority)[0]; };
  function save() { try { localStorage.setItem(STORAGE, JSON.stringify(state)); } catch (_) { /* transient demo still works */ } }
  function toast(message) { const el = $("toast"); el.textContent = message; el.classList.add("show"); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove("show"), 3300); }
  function badge(text, tone = "") { return `<span class="badge ${tone}">${esc(text)}</span>`; }
  function viewHead(kicker, title, subtitle, actions = "") { return `<div class="page-head"><div><div class="eyebrow">${kicker}</div><h1>${title}</h1><p>${subtitle}</p></div>${actions ? `<div class="head-actions">${actions}</div>` : ""}</div>`; }
  function navTo(next) {
    if (!routes[next]) next = "overview";
    if (state.role === "developer" && ["channels", "budget"].includes(next)) { state.role = "operator"; save(); toast("已切换到平台运营演示视角；这不是实际登录。"); }
    if (!routes[next][1].includes(state.role)) { toast(`请切换到有权查看此演示工作区的视角。`); return; }
    route = next; history.replaceState(null, "", `#${next}`); render(); window.scrollTo(0, 0);
  }
  function renderNav() {
    const items = Object.entries(routes).filter(([, value]) => value[1].includes(state.role));
    $("main-nav").innerHTML = `<div class="nav-group">${items.map(([key, value], index) => `<button type="button" class="nav-item ${route === key ? "active" : ""}" data-nav="${key}" ${route === key ? 'aria-current="page"' : ""}><span class="nav-num">${String(index + 1).padStart(2, "0")}</span>${value[0]}</button>`).join("")}</div>`;
  }
  function render() {
    if (!routes[route]?.[1].includes(state.role)) route = "overview";
    $("role-select").value = state.role;
    $("page-label").textContent = routes[route][0];
    renderNav();
    const views = { overview, catalog, keys, playground, usage, deployments, gpu, jobs, monitor, channels, budget, billing, security };
    $("content").innerHTML = views[route]();
  }

  function overview() {
    const role = state.role;
    const roleContent = {
      developer: ["从模型选择到可追溯调用", "先看模型的接入条件，再申请项目 Key；一次试用应回到同一个请求事件和项目额度。", "模型目录", "catalog"],
      "model-admin": ["把算力转化为可发布的模型服务", "查看资源池、创建私有部署、观察服务状态，再把模型交付给开发者使用。", "创建模型服务", "deployments"],
      operator: ["让多源模型供给可治理、可核对", "管理渠道、审批访问、设定项目预算，并把调用事件带入演示对账。", "进入渠道管理", "channels"]
    }[role];
    const last = state.events.at(-1);
    return `${viewHead("MATRIXCUBE / SERVICE OPERATIONS", `${roleNames[role]}工作台`, "三种角色视角共享同一组本地演示对象；角色切换不是真实身份认证。")}
      <div class="stat-row"><div class="stat"><small>演示模型</small><strong>${allModels().length}</strong><em>含待就绪部署</em></div><div class="stat"><small>虚构资源池</small><strong>${TOTAL_GPU}</strong><em>张卡的界面样本</em></div><div class="stat"><small>项目剩余额度</small><strong>${fmt(remaining())}</strong><em>演示 Token</em></div><div class="stat"><small>模拟请求</small><strong>${state.events.length}</strong><em>非真实调用</em></div></div>
      <div class="split-2-1"><div class="stack"><section class="hero-panel"><div><div class="eyebrow">${roleNames[role].toUpperCase()} JOURNEY</div><h2>${roleContent[0]}</h2><p>${roleContent[1]}</p></div><button class="button" type="button" data-go="${roleContent[3]}">${roleContent[2]} ↗</button></section><div class="steps"><div class="step"><small>01</small><strong>发现</strong><span>能力、来源、可用状态与条件</span></div><div class="step"><small>02</small><strong>授权</strong><span>项目权限与审批可追踪</span></div><div class="step"><small>03</small><strong>执行</strong><span>渠道、服务和优先级可解释</span></div><div class="step"><small>04</small><strong>核对</strong><span>请求、用量、额度与对账相连</span></div></div></div>
      <div class="stack"><section class="panel panel-pad"><div class="panel-title"><div><div class="eyebrow">OPEN ITEMS</div><h2>当前演示状态</h2></div></div><div class="list-row"><div><strong>待审批 Key</strong><small>运营视角处理</small></div>${badge(state.keys.filter((x) => x.status === "pending").length, "purple")}</div><div class="list-row"><div><strong>待就绪服务</strong><small>管理员推进模拟部署</small></div>${badge(state.deployments.filter((x) => x.status === "deploying").length, "warn")}</div><div class="list-row"><div><strong>待对账调用</strong><small>仅演示核对动作</small></div>${badge(state.events.filter((x) => !x.reconciled).length, "purple")}</div></section><section class="panel panel-pad"><div class="panel-title"><div><div class="eyebrow">LAST REQUEST</div><h2>最近请求</h2></div></div>${last ? `<div class="list-row"><div><strong class="mono">${esc(last.id)}</strong><small>${esc(last.modelName)} · ${esc(last.time)}</small></div>${badge("模拟成功", "good")}</div>` : `<div class="empty">尚无调用事件。由开发者视角发起一次模拟调用。</div>`}</section></div></div>
      <div class="notice" style="margin-top:18px">本版演示 MatrixCube 业务控制面与 APISIX、New API、SGLang、KServe、Volcano 等候选组件的预期分工；没有部署这些组件，也不代表选型已锁定。</div>`;
  }

  function catalog() {
    const all = allModels().filter((x) => state.role === "model-admin" || x.status === "ready");
    const visible = all.filter((x) => modelFilter === "all" || (modelFilter === "private" ? x.source === "私有推理" : x.source !== "私有推理"));
    const detail = visible.find((x) => x.id === selectedModel) || visible[0];
    const allowed = detail?.status === "ready" && !!channelFor(detail.id);
    return `${viewHead("MODEL DISCOVERY", "模型目录", "同一目录观察私有与外部模型，区分模型能力、上线状态和授权条件；所有条目均为演示数据。")}
      <div class="toolbar"><div class="filters"><button class="filter ${modelFilter === "all" ? "active" : ""}" data-action="filter-model" data-value="all">全部 ${all.length}</button><button class="filter ${modelFilter === "private" ? "active" : ""}" data-action="filter-model" data-value="private">私有推理</button><button class="filter ${modelFilter === "public" ? "active" : ""}" data-action="filter-model" data-value="public">外部模型</button></div><span class="small-text muted">模型名、价格与上下文长度均为虚构样本</span></div>
      <div class="split-3-2"><div class="model-grid">${visible.map((m) => `<article class="model-card"><div class="model-card-top">${badge(m.source, m.source === "私有推理" ? "purple" : "")}${badge(m.status === "ready" ? (channelFor(m.id) ? "可演示" : "渠道停用") : "部署中", m.status === "ready" && channelFor(m.id) ? "good" : "warn")}</div><h2>${esc(m.name)}</h2><p>${esc(m.family)} · ${esc(m.engine)}。查看详情了解演示接入限制，再进入授权或试用。</p><div class="model-card-foot"><small>${esc(m.context)}</small><button type="button" class="table-action" data-action="select-model" data-id="${esc(m.id)}">查看详情 ↗</button></div></article>`).join("") || `<div class="empty panel">当前筛选下没有模型。</div>`}</div>
      <aside class="panel panel-pad"><div class="panel-title"><div><div class="eyebrow">MODEL PROFILE</div><h2>${esc(detail?.name || "选择模型")}</h2></div></div>${detail ? `<div class="tags"><span class="tag">${esc(detail.family)}</span><span class="tag">${esc(detail.engine)}</span><span class="tag">${esc(detail.source)}</span></div><dl class="detail-kv"><dt>服务状态</dt><dd>${detail.status === "ready" ? (allowed ? "可演示调用" : "渠道不可用") : "部署中"}</dd><dt>来源与推理</dt><dd>${esc(detail.source)} · ${esc(detail.engine)}</dd><dt>上下文</dt><dd>${esc(detail.context)}</dd><dt>参考价格</dt><dd>${esc(detail.price)}</dd><dt>接入要求</dt><dd>${esc(detail.access)}</dd><dt>治理归属</dt><dd>MatrixCube 项目预算与授权</dd></dl><div class="form-actions">${state.role === "developer" ? `<button class="button secondary" data-go="keys">申请访问</button><button class="button" data-action="try-model" data-id="${esc(detail.id)}" ${!allowed ? "disabled" : ""}>进入试用</button>` : `<button class="button secondary" data-go="${state.role === "model-admin" ? "deployments" : "channels"}">查看${state.role === "model-admin" ? "部署" : "渠道"}</button>`}</div>` : ""}<div class="note" style="margin-top:15px">对标模型目录的“选择—详情—接入”路径；不声称真实模型质量、价格或服务保障。</div></aside></div>`;
  }

  function keys() {
    const operator = state.role === "operator";
    const choices = allModels().filter((m) => m.status === "ready");
    return `${viewHead("ACCESS GOVERNANCE", operator ? "Key 申请审批" : "项目访问授权", operator ? "按项目、模型与用途审核本地模拟申请。" : "提交项目 Key 申请；切换运营视角可演示通过或驳回。")}
      <div class="split-2-1"><section class="panel panel-pad"><div class="panel-title"><div><div class="eyebrow">APPLICATIONS</div><h2>演示申请列表</h2></div>${badge(`${state.keys.length} 条`, "purple")}</div><div class="table-wrap"><table><thead><tr><th>项目 / Key 标识</th><th>模型与用途</th><th>状态</th><th>操作</th></tr></thead><tbody>${state.keys.slice().reverse().map((k) => `<tr><td><strong>${esc(k.project)}</strong><small class="mono">${esc(k.label)}</small></td><td>${esc(modelById(k.modelId)?.name || "已下线模型")}<small>${esc(k.purpose)}</small></td><td>${badge(k.status === "approved" ? "已批准" : k.status === "pending" ? "待审批" : k.status === "rejected" ? "已驳回" : "已撤销", k.status === "approved" ? "good" : k.status === "pending" ? "warn" : "bad")}</td><td>${operator && k.status === "pending" ? `<button class="table-action" data-action="approve-key" data-id="${esc(k.id)}">批准</button>　<button class="table-action" data-action="reject-key" data-id="${esc(k.id)}">驳回</button>` : !operator && k.status === "approved" ? `<button class="table-action" data-action="revoke-key" data-id="${esc(k.id)}">撤销演示 Key</button>` : "—"}</td></tr>`).join("")}</tbody></table></div></section>
      <section class="panel panel-pad"><div class="panel-title"><div><div class="eyebrow">REQUEST</div><h2>申请项目 API Key</h2></div></div>${operator ? `<div class="note">申请请切换“开发者”视角。角色切换只是演示入口，不代表真实审批权限。</div>` : `<form id="key-form"><label class="field"><span>所属项目</span><input name="project" value="科研工作台" maxlength="40" required></label><label class="field"><span>访问模型</span><select name="modelId">${choices.map((m) => `<option value="${esc(m.id)}" ${m.id === selectedModel ? "selected" : ""}>${esc(m.name)}</option>`).join("")}</select></label><label class="field"><span>用途</span><textarea name="purpose" required maxlength="160" placeholder="说明业务场景和权限用途"></textarea></label><button class="button" type="submit">提交模拟申请</button></form>`}<div class="note" style="margin-top:16px">这里只生成遮罩标识，不生成可用凭据。真实 Key 的签发、轮换、审计与 IAM 尚未实现。</div></section></div>`;
  }

  function playground() {
    const ready = allModels().filter((m) => m.status === "ready");
    if (!ready.some((m) => m.id === selectedCallModel)) selectedCallModel = ready[0]?.id || "";
    const model = modelById(selectedCallModel);
    const approved = state.keys.filter((k) => k.status === "approved" && k.modelId === selectedCallModel);
    const code = `curl https://maas.example.invalid/v1/chat/completions \\\n+  -H "Authorization: Bearer \${API_KEY}" \\\n+  -H "Content-Type: application/json" \\\n+  -d '{"model":"${esc(selectedCallModel || "demo-model")}","messages":[{"role":"user","content":"你好"}]}'`;
    const isEmbedding = model?.family === "Embedding";
    const codeSample = isEmbedding
      ? [
        "curl https://maas.example.invalid/v1/embeddings",
        "  -H \"Authorization: Bearer ${API_KEY}\"",
        "  -H \"Content-Type: application/json\"",
        "  -d '{\"model\":\"" + esc(selectedCallModel) + "\",\"input\":\"你好\"}'"
      ].join(" " + String.fromCharCode(92) + "\n")
      : code.replaceAll("+  -H", "  -H").replaceAll("+  -d", "  -d");
    return `${viewHead("DEVELOPER PLAYGROUND", "调用工作台", "验证统一 API 的使用路径与异常恢复；回复由本地规则生成，输入不会上传。", badge("未连接真实 API", "warn"))}
      <div class="split-3-2"><section class="panel panel-pad"><div class="panel-title"><div><div class="eyebrow">REQUEST BUILDER</div><h2>构造一次模拟请求</h2></div></div><form id="call-form"><label class="field"><span>模型</span><select id="call-model" name="modelId">${ready.map((m) => `<option value="${esc(m.id)}" ${m.id === selectedCallModel ? "selected" : ""}>${esc(m.name)} · ${esc(m.engine)}</option>`).join("")}</select></label><label class="field"><span>项目 Key</span><select name="keyId">${approved.length ? approved.map((k) => `<option value="${esc(k.id)}">${esc(k.project)} · ${esc(k.label)}</option>`).join("") : `<option value="">无该模型已批准的演示 Key</option>`}</select></label><div class="form-grid" ${isEmbedding ? "hidden" : ""}><label class="field"><span>Temperature</span><select name="temperature"><option>0.2</option><option selected>0.7</option><option>1.0</option></select></label><label class="field"><span>输出上限</span><select name="maxTokens"><option>128</option><option selected>256</option><option>512</option></select></label></div><label class="field"><span>${isEmbedding ? "待向量化文本" : "输入内容"}</span><textarea id="prompt-input" name="prompt" required maxlength="2000">${esc(draftPrompt)}</textarea></label><div class="range-line"><span class="small-text muted">演示估算：本次约 ${Math.max(8, Math.ceil(draftPrompt.length * .72)) + (isEmbedding ? 0 : 64)} Token；剩余 ${fmt(remaining())}</span><button class="button" type="submit" ${callPending ? "disabled" : ""}>${callPending ? "模拟处理中…" : "模拟发起调用"}</button></div></form></section>
      <section class="panel panel-pad"><div class="panel-title"><div><div class="eyebrow">RESPONSE & TRACE</div><h2>响应与轨迹</h2></div>${badge(callPending ? "模拟处理中" : callResult?.ok ? "模拟成功" : callResult?.error ? "模拟失败" : "等待调用", callResult?.ok ? "good" : callResult?.error ? "bad" : "")}</div>${callResult ? `<div class="${callResult.ok ? "response" : "error-box"}">${esc(callResult.text)}</div>${callResult.ok ? `<div class="trace" style="margin-top:20px">${callResult.steps.map(([name, detail]) => `<div class="trace-item"><strong>${esc(name)}</strong><small>${esc(detail)}</small></div>`).join("")}</div><button class="button secondary small" data-go="usage">查看同一 request_id 的用量 ↗</button>` : `<div class="form-actions"><button class="button secondary small" data-go="${callResult.recovery || "keys"}">去处理 ↗</button></div>`}` : `<div class="empty">选择已就绪模型并发起一次模拟请求。缺 Key、预算不足或渠道停用时会给出恢复入口。</div>`}</section></div>
      <section class="panel panel-pad" style="margin-top:18px"><div class="panel-title"><div><div class="eyebrow">CLIENT HANDOFF</div><h2>预期调用形式</h2><p>不可访问的占位域名和凭据变量；不包含真实 Key。</p></div><button class="button ghost small" data-action="copy-code">复制示例</button></div><pre class="code-block" id="code-sample">${codeSample}</pre></section>`;
  }

  function usage() {
    const record = state.events.find((e) => e.id === selectedEvent) || state.events.at(-1);
    return `${viewHead("REQUEST TRACE", "请求与用量", "从一次模拟请求追到渠道、服务、Token 估算与项目额度；这些事件不是正式计费账本。")}
      <div class="stat-row"><div class="stat"><small>模拟请求</small><strong>${state.events.length}</strong></div><div class="stat"><small>演示消耗</small><strong>${fmt(state.consumed)}</strong><em>Token</em></div><div class="stat"><small>剩余额度</small><strong>${fmt(remaining())}</strong><em>Token</em></div><div class="stat"><small>正式账本</small><strong style="font-size:18px">未连接</strong></div></div>
      <div class="split-3-2"><section class="panel panel-pad"><div class="panel-title"><div><div class="eyebrow">EVENT STREAM</div><h2>最近调用</h2></div></div><div class="table-wrap"><table><thead><tr><th>request_id / 时间</th><th>模型</th><th>渠道</th><th>Token</th><th>详情</th></tr></thead><tbody>${state.events.length ? state.events.slice().reverse().map((e) => `<tr><td><strong class="mono">${esc(e.id)}</strong><small>${esc(e.time)}</small></td><td>${esc(e.modelName)}</td><td>${esc(e.channel)}</td><td>${e.tokens}</td><td><button class="table-action" data-action="select-event" data-id="${esc(e.id)}">查看轨迹</button></td></tr>`).join("") : `<tr><td class="table-empty" colspan="5">暂无演示事件。到调用工作台发起一次请求。</td></tr>`}</tbody></table></div></section>
      <section class="panel panel-pad"><div class="panel-title"><div><div class="eyebrow">EVENT DETAIL</div><h2>事件核对</h2></div></div>${record ? `<dl class="detail-kv"><dt>request_id</dt><dd class="mono">${esc(record.id)}</dd><dt>项目</dt><dd>${esc(record.project)}</dd><dt>模型 / 渠道</dt><dd>${esc(record.modelName)}<br>${esc(record.channel)}</dd><dt>Token 估算</dt><dd>${record.input} 输入 + ${record.output} 输出 = ${record.tokens}</dd><dt>预算动作</dt><dd>本地模拟扣减 ${record.tokens} Token</dd><dt>价格版本</dt><dd>SIM-P1 · 虚构规则</dd></dl><div class="notice" style="margin-top:16px">轨迹：APISIX 入口 → MatrixCube 预算规则 → New API 候选渠道 → ${record.private ? (record.engine || "SGLang") : "外部供应方"} → 演示用量事件。</div>` : `<div class="empty">选择请求查看详情。</div>`}</section></div>`;
  }

  function deployments() {
    return `${viewHead("PRIVATE MODEL LIFECYCLE", "模型部署", "用向导配置资源并推进模拟服务状态；SGLang/KServe 适配、镜像、真实模型与 GPU 均未接入。")}
      <div class="stat-row"><div class="stat"><small>演示服务</small><strong>${state.deployments.filter((d) => d.status !== "offline").length}</strong></div><div class="stat"><small>就绪服务</small><strong>${state.deployments.filter((d) => d.status === "ready").length}</strong></div><div class="stat"><small>已分配样本卡</small><strong>${allocatedGpu()}</strong><em>/ ${TOTAL_GPU}</em></div><div class="stat"><small>可分配样本卡</small><strong>${availableGpu()}</strong></div></div>
      <div class="split-3-2"><section class="panel panel-pad"><div class="panel-title"><div><div class="eyebrow">DEPLOYMENTS</div><h2>私有模型服务</h2></div></div><div class="table-wrap"><table><thead><tr><th>服务 / 模型</th><th>推理引擎</th><th>样本资源</th><th>状态</th><th>操作</th></tr></thead><tbody>${state.deployments.map((d) => `<tr><td><strong>${esc(d.name)}</strong><small class="mono">${esc(d.id)}</small></td><td>${esc(d.engine)}</td><td>${esc(hardwareNames[d.hardware || "a"])} · ${d.gpu} 卡</td><td>${badge(d.status === "ready" ? "已就绪·演示" : d.status === "deploying" ? "部署中·演示" : "已下线·演示", d.status === "ready" ? "good" : d.status === "deploying" ? "warn" : "")}</td><td>${d.status === "deploying" ? `<button class="table-action" data-action="ready-deployment" data-id="${esc(d.id)}">推进就绪</button>` : d.status === "ready" ? `<button class="table-action" data-action="offline-deployment" data-id="${esc(d.id)}">模拟下线</button>` : `<button class="table-action" data-action="reopen-deployment" data-id="${esc(d.id)}">重新部署</button>`}</td></tr>`).join("")}</tbody></table></div><div class="note" style="margin-top:17px">上线后模型才可进入开发者目录。新模型创建与状态变化都只保存在当前浏览器。</div></section>
      <section class="panel panel-pad"><div class="panel-title"><div><div class="eyebrow">DEPLOY WIZARD</div><h2>创建演示部署</h2></div></div><form id="deploy-form"><label class="field"><span>服务名称</span><input name="name" maxlength="40" required placeholder="例如：园区科研私有模型"></label><label class="field"><span>目标资源分组</span><select name="hardware"><option value="a">GPU-A · 示例节点 01–04</option><option value="b">NPU-B · 示例节点 05–08</option><option value="c">DCU-C · 示例节点 09–12</option></select><small>仅演示分组占用；各推理引擎与芯片的实际兼容性尚未验证。</small></label><div class="form-grid"><label class="field"><span>推理引擎</span><select name="engine"><option>SGLang</option><option>vLLM</option></select></label><label class="field"><span>申请加速卡数</span><select name="gpu"><option>2</option><option selected>4</option><option>8</option><option>16</option></select></label></div><label class="field"><span>部署策略</span><select name="strategy"><option>先单副本验证再开放</option><option>先灰度再全量（演示）</option></select></label><div class="warning">创建仅模拟资源预留与部署状态。没有硬件兼容性验证、镜像拉取、KServe 对象或推理进程。</div><div class="form-actions"><button class="button" type="submit">创建模拟部署</button></div></form></section></div>`;
  }

  function gpu() {
    const groups = [
      { id: "a", name: "GPU-A · 演示类型", count: 72, nodes: "Node 01–04" },
      { id: "b", name: "NPU-B · 演示类型", count: 72, nodes: "Node 05–08" },
      { id: "c", name: "DCU-C · 演示类型", count: 72, nodes: "Node 09–12" }
    ];
    const visible = groups.filter((g) => selectedNode === "all" || g.id === selectedNode);
    return `${viewHead("CAPACITY GOVERNANCE", "算力资源池", "以 216 张虚构加速卡检验大规模资源池的信息架构；不代表真实纳管数量或永久授权。")}
      <div class="stat-row"><div class="stat"><small>虚构资源总数</small><strong>${TOTAL_GPU}</strong><em>12 个演示节点</em></div><div class="stat"><small>演示已占用</small><strong>${allocatedGpu()}</strong></div><div class="stat"><small>演示可分配</small><strong>${availableGpu()}</strong></div><div class="stat"><small>调度策略</small><strong style="font:600 17px var(--sans)">${esc(state.policy)}</strong></div></div>
      <div class="split-3-2"><section class="panel panel-pad"><div class="panel-title"><div><div class="eyebrow">RESOURCE POOL</div><h2>异构样本分组</h2></div></div><div class="filters" style="margin-bottom:14px"><button class="filter ${selectedNode === "all" ? "active" : ""}" data-action="filter-gpu" data-value="all">全部</button>${groups.map((g) => `<button class="filter ${selectedNode === g.id ? "active" : ""}" data-action="filter-gpu" data-value="${g.id}">${g.id.toUpperCase()} 类</button>`).join("")}</div>${visible.map((g) => `<div class="scenario-row"><div><h3>${g.name}</h3><p>${g.nodes} · 已占用 ${usedByGroup(g.id)} / ${g.count} 张虚构卡</p></div>${badge(`剩余 ${availableByGroup(g.id)} 卡`, "purple")}</div>`).join("")}<div class="note" style="margin-top:17px">资源数据为确定性演示样本，没有采集真实显卡序列号、厂商驱动、拓扑、温度或功耗。</div></section>
      <section class="panel panel-pad"><div class="panel-title"><div><div class="eyebrow">PRIORITY POLICY</div><h2>业务优先级</h2></div></div><form id="policy-form"><label class="field"><span>资源竞争时优先保障</span><select name="policy"><option ${state.policy === "核心业务优先" ? "selected" : ""}>核心业务优先</option><option ${state.policy === "科研任务优先" ? "selected" : ""}>科研任务优先</option><option ${state.policy === "均衡排队" ? "selected" : ""}>均衡排队</option></select></label><p class="small-text muted">此处只改变本地模拟调度规则。实际队列准入、GPU 共享和 Volcano/Kueue 等适配须单独验证。</p><div class="form-actions"><button class="button" type="submit">保存演示策略</button><button class="button secondary" type="button" data-go="jobs">查看训练队列</button></div></form></section></div>`;
  }

  function jobs() {
    const running = state.jobs.filter((j) => j.status === "running").length;
    return `${viewHead("TRAINING & SCHEDULING", "训练与调度", "用可见队列演示任务优先级和资源竞争；不是实际训练、微调或 Volcano 作业。")}
      <div class="split-3-2"><section class="panel panel-pad"><div class="panel-title"><div><div class="eyebrow">JOB QUEUE</div><h2>演示任务</h2></div><button class="button secondary small" data-action="schedule-jobs">模拟调度下一项</button></div><div class="table-wrap"><table><thead><tr><th>任务</th><th>场景优先级</th><th>资源</th><th>状态</th><th>操作</th></tr></thead><tbody>${state.jobs.length ? state.jobs.slice().reverse().map((j) => `<tr><td><strong>${esc(j.name)}</strong><small>${esc(j.created)}</small></td><td>${badge(j.priority === "high" ? "核心业务" : "普通科研", j.priority === "high" ? "purple" : "")}</td><td>${j.gpu} 卡</td><td>${badge(j.status === "running" ? "运行中·模拟" : j.status === "queued" ? "排队中·模拟" : "已完成·模拟", j.status === "running" ? "good" : j.status === "queued" ? "warn" : "")}</td><td>${j.status === "running" ? `<button class="table-action" data-action="finish-job" data-id="${esc(j.id)}">模拟完成</button>` : "—"}</td></tr>`).join("") : `<tr><td class="table-empty" colspan="5">暂无任务。先提交普通与核心业务各一项，可比较调度结果。</td></tr>`}</tbody></table></div><div class="note" style="margin-top:16px">当前策略：${esc(state.policy)}。运行中 ${running} 项，剩余虚构资源 ${availableGpu()} 卡。真实优先级抢占、配额及作业恢复尚未验证。</div></section>
      <section class="panel panel-pad"><div class="panel-title"><div><div class="eyebrow">SUBMIT JOB</div><h2>提交演示训练任务</h2></div></div><form id="job-form"><label class="field"><span>任务名称</span><input name="name" required maxlength="40" placeholder="例如：科研摘要模型微调"></label><div class="form-grid"><label class="field"><span>申请卡数</span><select name="gpu"><option>2</option><option selected>4</option><option>8</option></select></label><label class="field"><span>业务优先级</span><select name="priority"><option value="normal">普通科研</option><option value="high">核心业务</option></select></label></div><button class="button" type="submit">加入模拟队列</button></form></section></div>`;
  }

  function monitor() {
    const requests = state.events.length;
    const alerts = state.alerts.filter((x) => x.status === "open");
    const bars = [32, 45, 51, 41, 68, 60, 75, 58, 83, 68, 72, 90];
    return `${viewHead("OBSERVABILITY", "监控告警", "查看模拟服务与请求信号。图形为静态样本，不来自 Prometheus、SGLang 或真实请求链路。")}
      <div class="stat-row"><div class="stat"><small>模拟请求</small><strong>${requests}</strong></div><div class="stat"><small>就绪服务</small><strong>${state.deployments.filter((d) => d.status === "ready").length}</strong></div><div class="stat"><small>演示告警</small><strong>${alerts.length}</strong></div><div class="stat"><small>真实遥测</small><strong style="font-size:18px">未连接</strong></div></div>
      <div class="split-3-2"><section class="panel panel-pad"><div class="panel-title"><div><div class="eyebrow">SERVICE SIGNALS</div><h2>延迟与错误率设计预览</h2></div>${badge("静态示意", "warn")}</div><div class="mini-bars" aria-label="静态演示柱形图">${bars.map((n, i) => `<span class="${i > 8 ? "hot" : ""}" style="height:${n}%"></span>`).join("")}</div><div class="grid-3" style="margin-top:20px"><div><small class="muted">TTFT P95</small><h3>待真实采集</h3></div><div><small class="muted">失败率</small><h3>待真实采集</h3></div><div><small class="muted">RPM / TPM</small><h3>待真实采集</h3></div></div><div class="note" style="margin-top:17px">不能用这张图判断推理服务性能；联调时应接入实际请求和模型指标。</div></section>
      <section class="panel panel-pad"><div class="panel-title"><div><div class="eyebrow">INCIDENT DEMO</div><h2>告警与恢复路径</h2></div><button class="button secondary small" data-action="inject-alert">注入演示告警</button></div>${state.alerts.length ? state.alerts.slice().reverse().map((a) => `<div class="scenario-row"><div><h3>${esc(a.title)}</h3><p>${esc(a.created)} · ${esc(a.id)}<br>服务：${esc(a.serviceName || "未绑定服务")}（${esc(a.serviceId || "无")}）<br>相关 request_id：${esc(a.requestId || "无关联请求")}</p></div>${a.status === "open" ? `<button class="button small" data-action="resolve-alert" data-id="${esc(a.id)}">标记演示恢复</button>` : badge("已恢复·演示", "good")}</div>`).join("") : `<div class="empty">当前无演示告警。可注入一条模拟事件体验处理。</div>`}</section></div>`;
  }

  function channels() {
    return `${viewHead("NEW API / ROUTING CONCEPT", "渠道与路由", "本页模拟 New API 候选网关的渠道优先级与停用影响；不修改任何真实网关配置。")}
      <div class="route-map" style="margin-bottom:18px"><div><strong>APISIX</strong><small>入口保护候选</small></div><span>→</span><div><strong>MatrixCube</strong><small>项目、预算与授权</small></div><span>→</span><div><strong>New API</strong><small>渠道选择候选</small></div><span>→</span><div><strong>SGLang / vLLM / 外部模型</strong><small>推理服务</small></div></div>
      <section class="panel panel-pad"><div class="panel-title"><div><div class="eyebrow">CHANNELS</div><h2>演示渠道</h2></div></div><div class="table-wrap"><table><thead><tr><th>渠道</th><th>模型类型</th><th>优先级</th><th>状态</th><th>操作</th></tr></thead><tbody>${state.channels.map((c) => `<tr><td><strong>${esc(c.name)}</strong><small class="mono">${esc(c.id)}</small></td><td>${c.type === "private" ? "SGLang 私有推理" : c.type === "vllm" ? "vLLM 私有推理" : "外部模型"}</td><td>${c.priority}</td><td>${badge(c.enabled ? "启用·演示" : "停用·演示", c.enabled ? "good" : "bad")}</td><td><button class="table-action" data-action="toggle-channel" data-id="${esc(c.id)}">${c.enabled ? "模拟停用" : "模拟启用"}</button>　<button class="table-action" data-action="raise-channel" data-id="${esc(c.id)}">优先级 +10</button></td></tr>`).join("")}</tbody></table></div><div class="note" style="margin-top:16px">SGLang 服务按主备优先级选择演示渠道，vLLM 服务使用独立演示渠道；停用对应渠道后可在调用轨迹观察变化。全部停用时请求被阻止。</div></section>`;
  }

  function budget() {
    const ratio = Math.min(100, Math.round((state.consumed / Math.max(1, state.budget)) * 100));
    return `${viewHead("TOKEN OPERATIONS", "预算与服务包", "摩度控制面的项目额度与服务包交互预览；数值是虚构 Token，不是货币、充值余额或真实结算。")}
      <div class="split-3-2"><section class="panel panel-pad"><div class="panel-title"><div><div class="eyebrow">PROJECT BUDGET</div><h2>科研工作台 · 演示额度</h2></div>${badge(ratio >= 80 ? "临近上限" : "可用", ratio >= 80 ? "warn" : "good")}</div><div class="stat-row" style="grid-template-columns:repeat(3,1fr)"><div class="stat"><small>预算上限</small><strong>${fmt(state.budget)}</strong><em>Token</em></div><div class="stat"><small>已消耗</small><strong>${fmt(state.consumed)}</strong><em>Token</em></div><div class="stat"><small>剩余</small><strong>${fmt(remaining())}</strong><em>Token</em></div></div><div class="progress ${ratio >= 80 ? "warn" : ""}"><span style="width:${ratio}%"></span></div><p class="small-text muted" style="margin-top:10px">${ratio}% · 超过剩余额度的模拟调用将被拒绝，调整预算后可重试。</p><div class="note" style="margin-top:18px">此处是项目级 Token 演示额度。政策券、资金预占、退款、价格版本与财务总账尚未连接。</div></section>
      <section class="panel panel-pad"><div class="panel-title"><div><div class="eyebrow">POLICY</div><h2>调整演示上限</h2></div></div><form id="budget-form"><label class="field"><span>月度演示预算（Token）</span><input name="limit" type="number" min="1" max="1000000" value="${state.budget}" required></label><p class="small-text muted">可设成低于一次调用的数值，体验预算不足与恢复。不可设低于已消耗 ${state.consumed} Token。</p><div class="form-actions"><button class="button" type="submit">保存本地预算</button></div></form></section></div>`;
  }

  function billing() {
    const pending = state.events.filter((x) => !x.reconciled && !x.differenceRecorded).length;
    const differences = state.events.filter((x) => x.differenceRecorded).length;
    return `${viewHead("RECONCILIATION / AUDIT", "对账与审计", "由同一批模拟请求生成核对清单。点击对账仅改变本地状态，未生成真实账单、发票或服务商应付。")}
      <div class="stat-row"><div class="stat"><small>演示调用</small><strong>${state.events.length}</strong></div><div class="stat"><small>待核对</small><strong>${pending}</strong></div><div class="stat"><small>已核对</small><strong>${state.events.length - pending - differences}</strong></div><div class="stat"><small>差异待处理</small><strong>${differences}</strong></div></div>
      <section class="panel panel-pad"><div class="panel-title"><div><div class="eyebrow">AUDIT ITEMS</div><h2>按 request_id 核对</h2></div></div><div class="table-wrap"><table><thead><tr><th>request_id</th><th>模型 / 渠道</th><th>平台演示 Token</th><th>供应方演示 Token</th><th>差异</th><th>价格版本</th><th>状态</th><th>操作</th></tr></thead><tbody>${state.events.length ? state.events.slice().reverse().map((e) => `<tr><td class="mono">${esc(e.id)}</td><td>${esc(e.modelName)}<small>${esc(e.channel)}</small></td><td>${e.tokens}</td><td>${e.reportedTokens ?? e.tokens}</td><td>${(e.reportedTokens ?? e.tokens) - e.tokens}</td><td>SIM-P1</td><td>${badge(e.reconciled ? "已核对·演示" : e.differenceRecorded ? "差异待处理" : "待核对·演示", e.reconciled ? "good" : e.differenceRecorded ? "bad" : "warn")}</td><td>${e.reconciled ? "—" : e.differenceRecorded ? `<button class="table-action" data-action="correct-difference" data-id="${esc(e.id)}">模拟更正回单</button>` : (e.reportedTokens ?? e.tokens) === e.tokens ? `<button class="table-action" data-action="reconcile" data-id="${esc(e.id)}">核对一致</button>` : `<button class="table-action" data-action="record-difference" data-id="${esc(e.id)}">登记差异</button>`}</td></tr>`).join("") : `<tr><td class="table-empty" colspan="8">暂无请求。开发者发起模拟调用后，记录会出现在此处。</td></tr>`}</tbody></table></div><div class="note" style="margin-top:16px">供应方回单值也是虚构样本；向量请求刻意模拟 2 Token 差异以演示差异登记。实际财务系统需另行实现事件幂等、预算预占/确认、价格版本、供应商账单对账与可审计的冲正，不能用本地事件表替代。</div></section>`;
  }

  function security() {
    return `${viewHead("TRUST & MAINTENANCE", "安全与升级", "统一认证、补丁响应和升级回滚的产品交互意图；没有真实扫描、漏洞修复或发布。")}
      <div class="grid-2"><section class="panel panel-pad"><div class="panel-title"><div><div class="eyebrow">IDENTITY</div><h2>统一账号接入设计</h2></div>${badge("待联调", "warn")}</div><div class="scenario-row"><div><h3>组织与项目映射</h3><p>外部身份 → 租户 → 项目 → 资源权限</p></div>${badge("设计预览")}</div><div class="scenario-row"><div><h3>审批者职责隔离</h3><p>申请、批准、用量核对分离</p></div>${badge("设计预览")}</div><div class="scenario-row"><div><h3>审计记录</h3><p>谁在何时批准、变更与回退</p></div>${badge("设计预览")}</div><div class="note" style="margin-top:16px">当前顶部角色选择器不是 SSO/RBAC。不能用于真实授权判定。</div></section>
      <section class="panel panel-pad"><div class="panel-title"><div><div class="eyebrow">PATCH DRILL</div><h2>安全修复流程样例</h2></div>${badge(state.patchDemo ? "演练已记录" : "未演练", state.patchDemo ? "good" : "warn")}</div><div class="scenario-row"><div><h3>1. 发现与分级</h3><p>登记组件、影响范围与修复时限</p></div></div><div class="scenario-row"><div><h3>2. 测试与回滚准备</h3><p>固定版本、测试用例和回退镜像</p></div></div><div class="scenario-row"><div><h3>3. 发布与复核</h3><p>验证服务、请求路径及审计证据</p></div></div><button class="button secondary" data-action="patch-drill" style="margin-top:16px">${state.patchDemo ? "重新记录模拟演练" : "记录模拟演练"}</button><div class="warning" style="margin-top:16px">按钮只标记本地演练状态，不会修复软件漏洞或执行部署。</div></section></div>`;
  }

  function showCallError(text, recovery) { callPending = false; callResult = { ok: false, error: true, text, recovery }; render(); toast(text); }
  function submitCall(form) {
    const data = new FormData(form);
    const modelId = String(data.get("modelId") || "");
    const keyId = String(data.get("keyId") || "");
    const prompt = String(data.get("prompt") || "").trim();
    draftPrompt = prompt;
    const model = modelById(modelId);
    const key = state.keys.find((k) => k.id === keyId && k.status === "approved" && k.modelId === modelId);
    if (!model || model.status !== "ready") return showCallError("模型尚未就绪或已下线；请先确认部署状态。", "overview");
    if (!key) return showCallError("当前模型没有可用的已批准演示 Key；请先申请并由运营视角审批。", "keys");
    if (!prompt) return showCallError("请输入调用内容。", "playground");
    const channel = channelFor(modelId);
    if (!channel) return showCallError("该模型的演示渠道已全部停用；请切换平台运营视角恢复渠道。", "channels");
    const input = Math.max(8, Math.ceil(prompt.length * .72));
    const output = model.family === "Embedding" ? 0 : 64;
    const tokens = input + output;
    if (tokens > remaining()) return showCallError(`项目演示额度不足：预计需要 ${tokens} Token，剩余 ${remaining()}；请切换平台运营视角调整预算。`, "budget");
    const epoch = ++callEpoch;
    callPending = true;
    callResult = null;
    render();
    setTimeout(() => {
      if (epoch !== callEpoch) return;
      const requestId = id("sim_req");
      const event = { id: requestId, modelId, modelName: model.name, engine: model.engine, channel: channel.name, project: key.project, input, output, tokens, reportedTokens: tokens + (model.family === "Embedding" ? 2 : 0), private: model.source === "私有推理", time: now(), reconciled: false, differenceRecorded: false };
      state.events.push(event);
      state.events = state.events.slice(-50);
      state.consumed += tokens;
      selectedEvent = requestId;
      save();
      callPending = false;
      const resultText = model.family === "Embedding"
        ? `模拟向量 · ${model.name}\n\n示意输出 [0.12, -0.08, 0.31, …]；不是实际向量计算结果。\n\nrequest_id  ${requestId}\n渠道  ${channel.name}\nToken  ${input} 输入 / 0 输出 · 演示估算`
        : `模拟回复 · ${model.name}\n\n已按预设规则生成演示文字；此内容不是模型推理结果。\n\nrequest_id  ${requestId}\n渠道  ${channel.name}\nToken  ${input} 输入 / ${output} 输出 · 演示估算`;
      callResult = { ok: true, text: resultText, steps: [["APISIX", "入口与请求标识 · 设计路径"], ["MatrixCube", `项目 ${key.project} 授权及预算模拟通过`], ["New API", `选择 ${channel.name} · 本地模拟`], [event.private ? model.engine : "外部供应方", model.family === "Embedding" ? "返回预设向量样例 · 非真实计算" : "返回预设文字 · 非真实推理"], ["用量事件", `${tokens} Token 计入演示额度；正式账本未连接`]] };
      render(); toast(`模拟请求 ${requestId} 已写入用量事件。`);
    }, 700);
  }

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("button");
    if (!button || button.disabled) return;
    if (button.dataset.nav || button.dataset.go) return navTo(button.dataset.nav || button.dataset.go);
    const action = button.dataset.action;
    const targetId = button.dataset.id;
    if (!action) return;
    if (action === "filter-model") { modelFilter = button.dataset.value; selectedModel = allModels().find((m) => modelFilter === "all" || (modelFilter === "private" ? m.source === "私有推理" : m.source !== "私有推理"))?.id || selectedModel; render(); return; }
    if (action === "select-model") { selectedModel = targetId; render(); return; }
    if (action === "try-model") { selectedCallModel = targetId; callResult = null; navTo("playground"); return; }
    if (action === "filter-gpu") { selectedNode = button.dataset.value; render(); return; }
    if (action === "approve-key" || action === "reject-key") {
      if (state.role !== "operator") return;
      const item = state.keys.find((x) => x.id === targetId && x.status === "pending");
      if (!item) return;
      item.status = action === "approve-key" ? "approved" : "rejected";
      if (item.status === "approved") item.label = `demo_••••_${Math.floor(1000 + Math.random() * 9000)}`;
      save(); render(); toast(item.status === "approved" ? "模拟申请已批准。" : "模拟申请已驳回。"); return;
    }
    if (action === "revoke-key") { const item = state.keys.find((x) => x.id === targetId && x.status === "approved"); if (!item) return; item.status = "revoked"; save(); render(); toast("演示 Key 已撤销；后续调用将被阻止。"); return; }
    if (action === "select-event") { selectedEvent = targetId; render(); return; }
    if (action === "ready-deployment" || action === "offline-deployment" || action === "reopen-deployment") {
      const d = state.deployments.find((x) => x.id === targetId); if (!d) return;
      if (action === "reopen-deployment" && d.gpu > availableByGroup(d.hardware || "a")) return toast("目标资源分组的虚构余量不足，无法重新部署。");
      d.status = action === "ready-deployment" ? "ready" : action === "offline-deployment" ? "offline" : "deploying";
      save(); render(); toast(`服务 ${d.name} 已进入“${d.status}”模拟状态。`); return;
    }
    if (action === "schedule-jobs") {
      const queued = state.jobs.filter((x) => x.status === "queued");
      if (!queued.length) return toast("当前无排队任务。");
      const sorted = queued.sort((a, b) => state.policy === "核心业务优先" ? Number(b.priority === "high") - Number(a.priority === "high") : state.policy === "科研任务优先" ? Number(a.priority === "high") - Number(b.priority === "high") : a.order - b.order);
      const next = sorted.find((x) => x.gpu <= availableGpu());
      if (!next) return toast("虚构资源不足，任务继续排队。");
      next.status = "running"; save(); render(); toast(`按“${state.policy}”模拟调度：${next.name} 开始运行。`); return;
    }
    if (action === "finish-job") { const job = state.jobs.find((x) => x.id === targetId && x.status === "running"); if (!job) return; job.status = "done"; save(); render(); toast("任务已模拟完成，资源已释放。"); return; }
    if (action === "inject-alert") { const service = state.deployments.find((x) => x.status === "ready"); const related = state.events.slice().reverse().find((x) => x.modelId === service?.modelId); state.alerts.push({ id: id("sim_alert"), title: "示例：私有模型首 Token 延时异常", serviceId: service?.id || "无就绪服务", serviceName: service?.name || "未绑定服务", requestId: related?.id || "无关联请求", created: now(), status: "open" }); save(); render(); toast("已注入带服务与请求对象的演示告警，无真实故障。"); return; }
    if (action === "resolve-alert") { const a = state.alerts.find((x) => x.id === targetId); if (!a) return; a.status = "resolved"; save(); render(); toast("告警已标为演示恢复。"); return; }
    if (action === "toggle-channel") { const c = state.channels.find((x) => x.id === targetId); if (!c) return; c.enabled = !c.enabled; save(); render(); toast(`${c.name} 已${c.enabled ? "启用" : "停用"}（仅本地模拟）。`); return; }
    if (action === "raise-channel") { const c = state.channels.find((x) => x.id === targetId); if (!c) return; c.priority += 10; save(); render(); toast(`${c.name} 的演示优先级已更新。`); return; }
    if (action === "reconcile" || action === "record-difference") { const record = state.events.find((x) => x.id === targetId); if (!record) return; const delta = Number(record.reportedTokens ?? record.tokens) - Number(record.tokens); if (action === "reconcile" && delta !== 0) return toast("两侧演示用量不一致；请先登记差异。"); if (action === "record-difference" && delta === 0) return toast("两侧演示用量一致，无需登记差异。"); record.reconciled = action === "reconcile"; record.differenceRecorded = action === "record-difference"; save(); render(); toast(record.reconciled ? "已按两侧演示用量核对一致；未形成真实结算。" : "差异已登记为待处理；未形成真实结算。"); return; }
    if (action === "correct-difference") { const record = state.events.find((x) => x.id === targetId && x.differenceRecorded); if (!record) return; record.reportedTokens = record.tokens; record.differenceRecorded = false; save(); render(); toast("演示回单值已模拟更正，请重新核对；没有修改真实账务。"); return; }
    if (action === "patch-drill") { state.patchDemo = true; save(); render(); toast("已记录本地模拟演练；没有执行软件修复。"); return; }
    if (action === "copy-code") {
      const value = $("code-sample")?.textContent || "";
      try { await navigator.clipboard.writeText(value); toast("占位接口示例已复制。"); }
      catch (_) { toast("当前浏览器不允许复制，请手动选取示例代码。"); }
    }
  });

  document.addEventListener("submit", (event) => {
    const form = event.target;
    if (!form.id) return;
    event.preventDefault();
    const data = new FormData(form);
    if (form.id === "key-form") {
      const project = String(data.get("project") || "").trim(), purpose = String(data.get("purpose") || "").trim(), modelId = String(data.get("modelId") || "");
      if (!project || !purpose || modelById(modelId)?.status !== "ready") return toast("请填写项目、用途并选择已就绪模型。");
      state.keys.push({ id: id("key_demo"), label: "待签发演示标识", project, purpose, modelId, status: "pending", created: now() });
      save(); render(); toast("申请已进入演示审批队列。切换平台运营视角处理。"); return;
    }
    if (form.id === "call-form") return submitCall(form);
    if (form.id === "deploy-form") {
      const name = String(data.get("name") || "").trim(), gpuCount = Number(data.get("gpu")), engine = String(data.get("engine") || "SGLang"), hardware = String(data.get("hardware") || "a");
      if (!name || !Number.isInteger(gpuCount) || gpuCount < 1 || !hardwareNames[hardware]) return toast("请填写有效服务配置。");
      if (gpuCount > availableByGroup(hardware)) return toast(`${hardwareNames[hardware]} 虚构余量不足：仅剩 ${availableByGroup(hardware)} 卡。`);
      const dep = { id: id("dep"), modelId: id("private"), name, engine, hardware, gpu: gpuCount, status: "deploying", created: now() };
      state.deployments.push(dep); selectedModel = dep.modelId; save(); render(); toast("模拟部署已创建。请推进就绪后到模型目录查看。"); return;
    }
    if (form.id === "policy-form") { state.policy = String(data.get("policy") || "核心业务优先"); save(); render(); toast("本地模拟优先级策略已保存。"); return; }
    if (form.id === "job-form") {
      const name = String(data.get("name") || "").trim(), gpuCount = Number(data.get("gpu")), priority = String(data.get("priority") || "normal");
      if (!name || !Number.isInteger(gpuCount) || gpuCount < 1) return toast("请填写有效任务配置。");
      state.jobs.push({ id: id("job"), name, gpu: gpuCount, priority, status: "queued", created: now(), order: state.jobs.length });
      save(); render(); toast("任务已加入本地模拟队列。"); return;
    }
    if (form.id === "budget-form") {
      const limit = Number(data.get("limit"));
      if (!Number.isInteger(limit) || limit < state.consumed || limit < 1 || limit > 1000000) return toast(`预算须为 ${Math.max(1, state.consumed)} 至 1,000,000 的整数。`);
      state.budget = limit; save(); render(); toast("项目演示预算已更新。");
    }
  });
  document.addEventListener("change", (event) => {
    if (event.target.id === "role-select") { state.role = event.target.value; callEpoch++; callPending = false; callResult = null; modelFilter = "all"; route = "overview"; save(); navTo("overview"); toast(`已切换到${roleNames[state.role]}演示视角；这不是实际登录。`); }
    if (event.target.id === "call-model") { draftPrompt = $("prompt-input")?.value || draftPrompt; selectedCallModel = event.target.value; callResult = null; render(); }
  });
  document.addEventListener("input", (event) => { if (event.target.id === "prompt-input") draftPrompt = event.target.value; });
  $("reset-demo").addEventListener("click", () => { if (!confirm("仅重置本浏览器中的 v0.2 演示数据，继续吗？")) return; callEpoch++; state = initial(); route = "overview"; modelFilter = "all"; selectedModel = "private-main"; selectedCallModel = "private-main"; selectedEvent = ""; selectedNode = "all"; draftPrompt = "请说明企业私有模型怎样通过统一 API 提供服务。"; callPending = false; callResult = null; save(); navTo("overview"); toast("本地演示已重置。"); });
  window.addEventListener("hashchange", () => { const requested = location.hash.slice(1); if (routes[requested]) navTo(requested); });
  const requested = location.hash.slice(1);
  route = routes[requested]?.[1].includes(state.role) ? requested : "overview";
  render();
})();
