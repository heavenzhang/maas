# 项目工作规则

默认使用简体中文，事实、模拟结果与待验证能力分别说明。保留用户已有文件和修改，不覆盖无关成果、不强推、不做破坏性清理。

仓库唯一指定目的地为 `https://github.com/heavenzhang/maas`。主干为 `main`；所有多阶段任务记录稳定 ID、目标、范围、验收和下一步，并从已核实的主干创建独立 `codex/` 分支及工作区。

当前仓库为交互原型和研究资料。沿用 `outputs/` 原目录，最新版本为 `maas-integration-prototype-v03-20261002`；不得将演示 Key、模拟 Token、费用、调度状态或本地测试描述成真实组件能力。

提交仅包含本任务源码、测试、项目文档和必要小型资产。`tmp/`、生成截图、数据库、缓存、机器状态与凭据留在 Git 之外。对私有资料和原始招标附件，不因存在于本机就自动公开提交。

默认源码交付包含提交、合入实际主干、推送及远端 SHA 核实，遵守审查、保护和 CI。当前没有生产部署对象，Git 同步任务不增加部署或公网暴露授权。后续发布需核实环境、版本、回滚及真实用户路径。

本地原型验收使用 `npm run check` 和 `npm test`；真实集成另行验证登录、权限、持久化、管理接口、模型推理与计量。单机 NVIDIA 测试不能替代 D300 或六节点验收。

多智能体工作须明确互斥写入范围和接口；主智能体负责整体验收、主干集成和部署。仅报告可确认的执行与模型调度事实。

<!-- git-project-sync:start -->
For any task that changes this repository or resumes another agent's work, first read
`.agents/skills/git-project-sync/SKILL.md` and use `.agent-sync.json` as the
repository coordination config. Remote refs and commit SHAs define code state;
handoff prose and generated artifacts are supporting evidence only.
Require a user-supplied Git URL via `--remote` for every project-sync command;
verify it matches the config and checkout fetch/push URLs before saving work.
Read `.agent-sync/project-map.md`, `.agent-sync/plan.md`, and the current
branch record in `.agent-sync/tasks/` before continuing another agent's work.
<!-- git-project-sync:end -->
