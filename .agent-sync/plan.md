# Development Plan

## Outcome and scope

建设将 GPUStack、SGLang、New API 串联起来的摩度 MaaS 门户，逐步实现统一身份、模型供给、授权审批、调用与用量审计。当前阶段是原型和研究资料；本次任务 `MAAS-GIT-20261008` 仅负责 Git 归档、同步协议和后续接续，不包含真实部署、采购或生产发布。

## Milestones

| Milestone | Status | Acceptance evidence |
| --- | --- | --- |
| M0 原型及研究源码归档 | complete | 初始导入提交 `5d0a79cf025acc166020ef550a3619f3b35deeed` 已推送 `main`；临时文件及生成截图已排除 |
| M1 Git 接续协议绑定并交付主干 | in-progress | 项目地图、计划、分支记录和 vendored skill 已编写；待任务分支 handoff 门禁及最终主干远端核实 |
| M2 v0.3 本地模拟验收 | complete | 2026-10-08 `npm run check` 与 `npm test` 通过；覆盖边界见 `acceptance-matrix.md` |
| M3 Linux 单 GPU 真实链路 | planned | 门户集成后端、GPUStack 部署、New API 渠道与真实调用均待实现；需真实授权和 Token 用量核对 |
| M4 统一身份、审批及审计持久化 | planned | 项目权限、审批、凭据管理与真实请求关联需实现并使用测试身份验收 |
| M5 D300 单机兼容与性能验收 | planned | 需真实型号/显存、驱动、运行时和可用后端；不得用 NVIDIA 结果替代 |
| M6 六台 D300 集群验收 | planned | 依赖 M5；验证实际拓扑、并行策略、吞吐、延迟及故障恢复 |

## Current priorities

- [x] 核实目标仓库为空、默认主干 `main`、当前账号可推送。
- [x] 保存三版原型及正式研究产物，保留现有布局；生成 `.gitignore`。
- [x] 为 v0.3 测试移除本机硬编码路径，并锁定 Playwright 依赖。
- [x] 实测当前 v0.3 模拟路径，检查初始暂存文件中的常见凭据模式。
- [x] 推送首个主干提交，为技能绑定提供可核实基线。
- [x] 创建独立任务工作区，补齐地图、计划、项目规则与任务记录。
- [ ] 推送并核实 `codex/maas-git-sync-20261008`，通过 handoff 门禁。
- [ ] 同步最新 `main`，合入并推送；核实最终远端主干 SHA 与本地一致。

本次唯一写入者与集成负责人为主智能体。任务状态见 `.agent-sync/tasks/codex-maas-git-sync-20261008-b572c643.md`。没有调用子智能体或外部模型；不推定模型用量或耗时收益。

## Acceptance and release gates

1. Git 交付必须包含指定远端的主干成果、有效地图与计划、已提交的分支记录；本地 commit 或任务分支 push 不能替代主干交付。
2. 原型代码验收与真实集成分开：本地 Chromium 通过仅证明浏览器模拟路径。身份、接口、模型、账单与 D300 能力均需后续实测。
3. 此任务没有生产环境、后端构建和部署对象，生产发布不适用；不新增公网服务。
4. 大文件、附件、缓存、日志、数据库、真实凭据不纳入 Git；现有本地资料保留，不做清理。

## Decisions and open questions

- 首期组合沿用 GPUStack + SGLang + New API。优先以自有门户和集成后端串联用户及业务流程，原生控制台作为管理入口；不在本次归档扩大界面改造范围。
- 起步环境方案为管理节点约 8–12 vCPU、32 GB 内存、500 GB SSD；推理节点约 16 核 CPU、128 GB 内存、2 TB NVMe 与一张 NVIDIA GPU。这是既有讨论中的开发测试估算，尚无实机容量证据，采购前须按目标模型、上下文及并发重新核实。
- 管理节点可先无 GPU，完整模型链路需要真实推理节点；RTX 5090 的单机测试不能代表 D300、异构多卡或六节点性能。
- 真实 D300 后端与 SGLang 的兼容性尚未确认。实施前重新检查固定版本的支持矩阵，并决定是否使用厂商适配 vLLM/Custom 后端。
- 新任务的具体实施入口：先固定 GPUStack/New API/SGLang 版本与 API 契约，设计门户后端适配层；随后在获授权的 Linux 测试环境跑通一次真实 OpenAI 兼容调用。
