# Project Map

## Project identity

- 项目：摩度 MaaS / MatrixCube，面向模型部署、API 供给与治理的统一门户。
- 唯一指定 Git 目标：`https://github.com/heavenzhang/maas`；主干 `main`；任务分支前缀 `codex/`，详见 `.agent-sync.json`。
- 最新入口：`outputs/maas-integration-prototype-v03-20261002/index.html`。当前是纯前端原型，状态保存在浏览器；真实后端与组件接口尚未实现。
- 初始源码导入基线：`5d0a79cf025acc166020ef550a3619f3b35deeed`。

## Locations

| Category | Repository path | What belongs there |
| --- | --- | --- |
| Working rules | `AGENTS.md` | 项目约束、授权边界、交付及验收规则 |
| Git binding | `.agent-sync.json` | 仓库、主干和任务分支约定 |
| Project plan | `.agent-sync/plan.md` | 共享目标、里程碑、依赖和下一步 |
| Task handoffs | `.agent-sync/tasks/` | 一条任务分支对应一份接续记录 |
| Product source | `outputs/maas-integration-prototype-v03-20261002/{index.html,app.js,styles.css}` | 当前 v0.3 原型源码；没有生产后端 |
| Historical source | `outputs/maas-interaction-prototype-20260923/`、`outputs/maas-interaction-prototype-v02-20260923/` | 前两版原型、品牌资产和流程探索，保留现有目录 |
| Tests | 各原型目录的 `test-prototype.cjs`；根目录 `package.json`、`package-lock.json` | 浏览器本地模拟验收；默认 `npm test` 只运行 v0.3 |
| Specifications and decisions | v0.3 的 `product-facts.md`、`acceptance-matrix.md`；v0.2 的 `scope-and-benchmarks.md` | 组件职责、拟议集成契约、交互范围与验收边界 |
| Research | `outputs/maas-positioning-20260923/{source-notes.md,validation.md,artifact.json,build_artifact.mjs,report.html}` | 2026-09-23 定位及需求基线快照；不能当作当前兼容性证据 |
| Operations and releases | v0.3 的 `execution-record.md`；根目录 `README.md` | 历史原型执行记录与本地运行方法；暂无真实部署、生产发布、回滚或运维手册 |
| Source assets | 前两版原型的 `assets/`；各版本 `brand-spec.md` | 小型品牌图片及来源说明 |
| Sync protocol | `.agents/skills/git-project-sync/` | 随 clone 分发的同步技能和门禁脚本 |

## Validation and environments

- Node.js 20+；使用 `npm ci` 安装锁定依赖，用 `npx playwright install chromium` 准备浏览器。
- `npm run check`：检查三版原型 JavaScript 语法。
- `npm test`：检查 v0.3 的模拟部署、发布、授权、调用、用量、故障、预算拒绝、持久化和移动端布局。通过不代表真实身份、模型推理或计费已验收。
- 历史版本脚本需要本地 HTTP 服务，按各自 README 配置；本次 Git 导入未重新验收旧版全部业务路径。
- 截图在本地 `evidence/` 生成并忽略；临时附件与 PDF 提取页在本地 `tmp/`，不随 Git 分发。没有为这些文件建立远端制品存储。
- 用户曾要求更新飞书材料，但本仓库当前没有可核实的飞书文档导出及对应版本映射，不声称飞书材料已完整保存到 Git。
- GPUStack、New API、SGLang 通过上游项目后续部署；本仓库尚无第三方源码副本、镜像或部署配置。不存在已核实的测试/生产运行实例。

## Handoff reading order

1. 阅读本地图和 `.agent-sync/plan.md`。
2. 阅读当前任务分支对应的 `.agent-sync/tasks/` 记录；主干可先读 `codex-maas-git-sync-20261008-b572c643.md` 了解首次导入边界。
3. 对用户指定 Git URL 核实远端 SHA，再阅读目标模块源码和测试。新任务从最新 `origin/main` 建立独立工作区，避免写入其他任务工作区。
