/* MatrixCube MaaS interaction prototype. Everything below is local mock state. */
(function () {
  "use strict";

  const STORAGE_KEY = "matrixcube-maas-prototype-v1";
  const models = [
    {
      id: "private",
      name: "示例·企业私有文本模型",
      type: "私有推理 / SGLang",
      tag: "主演示路径",
      description: "展示私有模型以 SGLang 提供兼容接口，经 New API 渠道进入统一服务目录。",
      facts: ["文本生成", "统一 API", "部署适配待 PoC"],
      runtime: "SGLang → New API"
    },
    {
      id: "public",
      name: "示例·外部通用模型",
      type: "外部模型 / New API",
      tag: "对照路径",
      description: "展示第三方授权模型经模型网关接入，与私有模型共享项目授权及调用入口。",
      facts: ["文本生成", "供应方渠道", "真实授权未接入"],
      runtime: "供应方 → New API"
    }
  ];
  const demoKey = {
    id: "demo-key-01",
    display: "demo_••••_4172",
    project: "科研工作台",
    purpose: "预置的私有模型演示权限",
    model: "private",
    status: "approved",
    created: "演示预置"
  };
  const initialState = () => ({ version: 1, keys: [demoKey], events: [] });
  let state = readState();
  let reviewMode = false;
  let currentFilter = "all";
  let toastTimer;
  let callEpoch = 0;

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (parsed && parsed.version === 1 && Array.isArray(parsed.keys) && Array.isArray(parsed.events)) return parsed;
    } catch (_) { /* storage may be unavailable in some browsers */ }
    return initialState();
  }
  function saveState() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* demo remains usable in memory */ }
  }
  function safeText(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }
  function uid(prefix) {
    const random = globalThis.crypto?.randomUUID?.().slice(0, 8) || Math.random().toString(36).slice(2, 10);
    return `${prefix}_${random}`;
  }
  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 3100);
  }
  function navigate(name) {
    const target = document.getElementById(`view-${name}`);
    if (!target) return;
    document.querySelectorAll(".page").forEach((page) => {
      const active = page === target;
      page.classList.toggle("active", active);
      page.hidden = !active;
    });
    document.querySelectorAll(".nav-item").forEach((item) => {
      const active = item.dataset.nav === name;
      item.classList.toggle("active", active);
      item.setAttribute("aria-current", active ? "page" : "false");
    });
    const label = document.querySelector(`[data-nav="${name}"]`)?.textContent?.replace(/^\d+/, "").replace("↗", "").trim() || name;
    document.getElementById("current-section").textContent = label;
    history.replaceState(null, "", `#${name}`);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  function renderCatalog() {
    const visible = models.filter((model) => currentFilter === "all" || model.id === currentFilter);
    document.getElementById("model-grid").innerHTML = visible.map((model) => `
      <article class="model-card">
        <div class="model-top"><span class="model-type">${model.type}</span><span class="model-tag">${model.tag}</span></div>
        <h2>${model.name}</h2><p>${model.description}</p>
        <div class="model-facts">${model.facts.map((fact) => `<span>${fact}</span>`).join("")}</div>
        <div class="model-bottom"><small>${model.runtime}</small><button type="button" data-choose-model="${model.id}">在工作台试用 ↗</button></div>
      </article>`).join("");
    document.querySelectorAll("[data-filter]").forEach((item) => item.classList.toggle("selected", item.dataset.filter === currentFilter));
  }
  function statusLabel(status) {
    return ({ approved: "已批准 · 演示", pending: "待审批 · 演示", rejected: "已驳回 · 演示" })[status] || "未知";
  }
  function renderKeys() {
    const list = document.getElementById("key-list");
    if (!state.keys.length) {
      list.innerHTML = '<div class="review-note">暂无演示申请。左侧提交一份即可体验审批。</div>';
    } else {
      list.innerHTML = state.keys.slice().reverse().map((key) => `
        <div class="key-row">
          <div><strong>${safeText(key.project)}</strong><small>${safeText(key.display || "审批后生成模拟标识")} · ${safeText(key.created)}</small><p>${safeText(key.purpose)} · ${key.model === "private" ? "SGLang 私有模型" : "外部模型"}</p></div>
          <div class="key-actions">${reviewMode && key.status === "pending" ? `<button type="button" data-key-action="approve" data-key-id="${safeText(key.id)}">批准</button><button type="button" data-key-action="reject" data-key-id="${safeText(key.id)}">驳回</button>` : `<span class="status-text ${safeText(key.status)}">${statusLabel(key.status)}</span>`}</div>
        </div>`).join("");
    }
    document.getElementById("review-toggle").setAttribute("aria-pressed", String(reviewMode));
    document.getElementById("review-note").textContent = reviewMode
      ? "审批者视角仅为模拟操作，不对应真实用户权限；批准后可在调用工作台使用演示标识。"
      : "当前为申请者视角。可切换到审批视角体验通过或驳回；这不对应真实 IAM 权限。";
    renderCallKeys();
  }
  function renderCallKeys() {
    const model = document.getElementById("call-model").value;
    const select = document.getElementById("call-key");
    const approved = state.keys.filter((key) => key.status === "approved" && key.model === model);
    select.innerHTML = approved.length
      ? approved.map((key) => `<option value="${safeText(key.id)}">${safeText(key.project)} · ${safeText(key.display)}</option>`).join("")
      : '<option value="">暂无该模型的已批准演示 Key，请前往访问授权</option>';
  }
  function renderUsage() {
    document.getElementById("event-count").textContent = String(state.events.length);
    document.getElementById("usage-rows").innerHTML = state.events.length
      ? state.events.slice().reverse().map((event) => `<tr><td>${safeText(event.id)}</td><td>${event.model === "private" ? "New API → SGLang" : "New API → 外部渠道"}</td><td>模拟成功</td><td>${safeText(event.inputTokens)} / ${safeText(event.outputTokens)}</td><td>${safeText(event.time)}</td></tr>`).join("")
      : '<tr><td class="table-empty" colspan="5">还没有演示调用。到「调用工作台」发起一次请求即可看到事件。</td></tr>';
  }
  function renderAll() { renderCatalog(); renderKeys(); renderUsage(); }

  document.querySelectorAll("[data-nav], [data-go]").forEach((item) => {
    item.addEventListener("click", () => navigate(item.dataset.nav || item.dataset.go));
  });
  document.querySelectorAll("[data-filter]").forEach((item) => {
    item.addEventListener("click", () => { currentFilter = item.dataset.filter; renderCatalog(); });
  });
  document.getElementById("model-grid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-choose-model]");
    if (!button) return;
    document.getElementById("call-model").value = button.dataset.chooseModel;
    renderCallKeys();
    navigate("playground");
  });
  document.getElementById("review-toggle").addEventListener("click", () => { reviewMode = !reviewMode; renderKeys(); });
  document.getElementById("key-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const project = String(form.get("project") || "").trim();
    const purpose = String(form.get("purpose") || "").trim();
    const model = String(form.get("model") || "private");
    if (!project || !purpose) return showToast("请填写项目和申请用途。 ");
    state.keys.push({ id: uid("demo-key"), display: "审批后生成模拟标识", project, purpose, model, status: "pending", created: new Date().toLocaleString("zh-CN", { hour12: false }) });
    saveState();
    event.currentTarget.querySelector('[name="purpose"]').value = "";
    renderKeys();
    showToast("演示申请已提交。切换审批视角继续体验。 ");
  });
  document.getElementById("key-list").addEventListener("click", (event) => {
    const action = event.target.closest("[data-key-action]");
    if (!action || !reviewMode) return;
    const key = state.keys.find((item) => item.id === action.dataset.keyId);
    if (!key || key.status !== "pending") return;
    key.status = action.dataset.keyAction === "approve" ? "approved" : "rejected";
    if (key.status === "approved") key.display = `demo_••••_${Math.floor(1000 + Math.random() * 9000)}`;
    saveState(); renderKeys();
    showToast(key.status === "approved" ? "模拟审批已通过，可在调用工作台选择此 Key。" : "模拟申请已驳回。 ");
  });
  document.getElementById("call-model").addEventListener("change", renderCallKeys);
  document.getElementById("call-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const model = document.getElementById("call-model").value;
    const keyId = document.getElementById("call-key").value;
    const prompt = document.getElementById("prompt-input").value.trim();
    const key = state.keys.find((item) => item.id === keyId && item.status === "approved" && item.model === model);
    if (!key) { showToast("当前模型缺少已批准的演示 Key，请先到访问授权申请。 "); navigate("access"); return; }
    if (!prompt) { showToast("请输入调用内容。 "); return; }
    const submit = document.getElementById("call-submit");
    const response = document.getElementById("response-body");
    const badge = document.getElementById("response-status");
    const thisCall = ++callEpoch;
    submit.disabled = true;
    badge.textContent = "模拟处理中";
    badge.classList.add("active");
    response.classList.remove("has-result");
    response.textContent = "正在本地模拟请求流转……\n没有向任何模型服务发送内容。";
    document.getElementById("trace-list").innerHTML = "";
    setTimeout(() => {
      if (thisCall !== callEpoch) return;
      const id = uid("sim_req");
      const inputTokens = Math.max(8, Math.ceil(prompt.length * .72));
      const outputTokens = model === "private" ? 66 : 58;
      const eventRecord = { id, model, inputTokens, outputTokens, time: new Date().toLocaleString("zh-CN", { hour12: false }) };
      state.events.push(eventRecord);
      state.events = state.events.slice(-30);
      saveState(); renderUsage();
      response.classList.add("has-result");
      response.textContent = model === "private"
        ? `模拟回复 · SGLang 私有推理路径\n\n企业可以将获授权的私有模型部署为统一 API 服务；MatrixCube 管理项目和业务规则，New API 负责渠道接入，SGLang 承担推理执行。\n\n此段文字由原型预设规则生成，并非真实模型输出。\n\nrequest_id  ${id}`
        : `模拟回复 · 外部模型渠道路径\n\n外部授权模型与私有模型可共享一个项目入口，但供应方授权、价格和可用性需要单独管理。\n\n此段文字由原型预设规则生成，并非真实模型输出。\n\nrequest_id  ${id}`;
      const steps = [
        ["APISIX", "入口校验与 request_id 注入 · 模拟"],
        ["MatrixCube", "项目 Key 与预算规则通过 · 模拟"],
        ["New API", model === "private" ? "选择 SGLang 渠道 · 模拟" : "选择外部授权渠道 · 模拟"],
        [model === "private" ? "SGLang" : "上游模型", "返回预设演示内容 · 非真实推理"],
        ["用量事件", `${inputTokens} 输入 / ${outputTokens} 输出 token · 模拟估算`]
      ];
      document.getElementById("trace-list").innerHTML = steps.map(([name, detail]) => `<div class="trace-row"><strong>${name}</strong><span>${detail}</span></div>`).join("");
      badge.textContent = "模拟调用成功";
      submit.disabled = false;
      showToast(`已生成模拟请求 ${id}；可在用量事件中查看。`);
    }, 850);
  });
  document.getElementById("copy-snippet").addEventListener("click", async () => {
    const content = document.getElementById("code-snippet").textContent;
    try {
      if (!navigator.clipboard?.writeText) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(content);
      showToast("接口形态示例已复制；域名和 Key 均为占位符。 ");
    } catch (_) {
      const helper = document.createElement("textarea");
      helper.value = content; helper.style.position = "fixed"; helper.style.opacity = "0";
      document.body.appendChild(helper); helper.select();
      const copied = document.execCommand("copy"); helper.remove();
      showToast(copied ? "接口形态示例已复制；域名和 Key 均为占位符。 " : "当前浏览器未允许复制，请手动选择代码。 ");
    }
  });
  document.getElementById("reset-demo").addEventListener("click", () => {
    if (!window.confirm("只重置此浏览器中的原型演示申请与调用记录，继续吗？")) return;
    callEpoch++;
    state = initialState(); reviewMode = false; saveState(); renderAll();
    document.getElementById("call-submit").disabled = false;
    document.getElementById("response-status").textContent = "等待调用";
    document.getElementById("response-status").classList.remove("active");
    document.getElementById("response-body").textContent = "选择模型并发起一次模拟请求，这里将展示回复、request_id 和每一层的职责。";
    document.getElementById("trace-list").innerHTML = "";
    navigate("overview"); showToast("本地演示状态已重置。 ");
  });

  renderAll();
  const requested = location.hash.replace("#", "");
  navigate(document.getElementById(`view-${requested}`) ? requested : "overview");
})();
