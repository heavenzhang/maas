<!-- git-project-sync-task:version=1 -->
<!-- git-project-sync-task:branch=codex/maas-git-sync-20261008 -->
<!-- git-project-sync-task:base=5d0a79cf025acc166020ef550a3619f3b35deeed -->
<!-- git-project-sync-task:status=in-progress -->

# Task: MAAS-GIT-20261008 首次 Git 归档与同步绑定

## Objective

按用户 2026-10-08 的“提交并推送”请求，将已有原型、正式研究产物和接续资料保存到 `https://github.com/heavenzhang/maas` 的 `main`。不进行真实组件部署，不公开临时附件，不修改历史原型业务逻辑。

## Acceptance criteria

- [x] 明确指定 URL，核实本地原无仓库且远端为空。
- [x] 保存当前三版原型、正式报告、必要资产与依赖锁文件。
- [x] 初始 `main` 提交和远端 SHA 一致。
- [x] 从该基线建立独立任务工作区；bind 门禁通过并完成项目地图、计划和项目规则。
- [ ] 完整 task 分支通过远端 handoff 门禁。
- [ ] 合入 `main` 并推送，最终核实本地与远端主干相同、工作区干净。

## Completed

- 初始源码与资料导入已保存为基线提交 `5d0a79cf025acc166020ef550a3619f3b35deeed` 并推送主干。
- `.gitignore` 排除 `tmp/`、生成浏览器截图、报告诊断/失败截图、依赖和常见凭据文件；这些本地文件未被删除。
- v0.3 测试改为加载项目 Playwright，支持 `PLAYWRIGHT_MODULE`；根 `package.json` 和锁文件支持跨机复测，未改业务行为。
- 项目地图、共享计划、同步配置、项目 AGENTS 和 vendored skill 已在当前分支写入。
- 空仓库尚无可验证主干时，先 clone 用户指定仓库并导入源码推送 `main`；随后才在干净独立工作区运行 bind。首次绑定任务记录按技能脚本的分支路径和元数据格式手工建立，将由 handoff 门禁验证；未伪称首次绑定前的 start/task-init 门禁已通过。

## Verification

- `git ls-remote` 与 GitHub 仓库 API：起步远端无 refs，默认分支 `main`，当前用户可推送。
- 初始暂存 34 个文件扫描常见 GitHub Token、私钥、API Key、AWS Key 和数据库密码 URI 模式：未命中。该模式检查不声称绝对发现全部敏感信息；额外暂存仅包含 README、已审阅的依赖文件和测试入口修改。
- 三版 `app.js` 的 `node --check` 通过。
- 最新 v0.3 在当前本机 Chromium 的 `npm test` 通过：部署/发布/拒绝/审批/调用/用量/恢复/失败/预算拒绝/刷新持久化/390px 布局，零浏览器错误和零意外网络请求。使用已配置 Playwright 模块；没有将其本机路径写入源码。
- 初始 `git diff --cached --check` 通过；`main` 的初始远端 SHA 与上述基线一致。
- 指定 URL 的 `project-sync.mjs bind` 通过：仓库 fetch/push URL、任务 HEAD、远端 main 和干净工作区一致。
- 独立工作区 `npm ci --ignore-scripts --no-audit --no-fund`、`npm run check && npm test` 均通过，测试直接使用锁文件安装的 Playwright，无需原机器源码中的绝对路径；浏览器使用已安装的 Chromium。
- 完整任务分支的 handoff 与最终 main 的 observe/远端核实待完成，不能以以上局部结果替代。

## Blockers and unknowns

- 当前 Git 归档没有外部阻断，剩余为 task 推送、门禁和主干集成。
- GPUStack、New API、SGLang、统一身份、计费后端与 D300 均未真实接入；生产发布不适用。
- 旧版全部浏览器路径本次未重跑，研究内容为历史快照；飞书材料未导出到本仓库。详细边界见项目地图。
- 单智能体执行，主智能体兼任实现/审阅/集成负责人；没有模型切换或并发调度事实，用量与收益未知。

## Next step

先推送当前 task 分支并以此文件记录的 base SHA 执行 handoff，再同步并合入主干，核实远端 main 后补齐完成状态。后续开发从最新 `origin/main` 新建工作区，固定三组件版本及管理 API 契约。
