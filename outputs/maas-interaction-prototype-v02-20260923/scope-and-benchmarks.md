# MatrixCube MaaS 交互原型 v0.2 · 范围与对标

本版是本地可点击的业务流程样机，不连接 New API、SGLang、KServe、Volcano、APISIX、GPU、身份系统或账务系统。所有模型、算力、金额、Token 和请求数据均为虚构演示值。基于 2026-09-23 可访问的官方公开文档对标；未登录实测这些产品后台。

| 角色 | 应完成的任务 | 对标依据 | v0.1 | v0.2 验收动作 |
|---|---|---|---|---|
| 开发者 | 选模型、看详情、申请 Key、试用、追溯请求与额度 | [New API Key 管理](https://docs.newapi.ai/en/docs/guide/feature-guide/user/token)、[LiteLLM 管理 UI](https://docs.litellm.ai/docs/proxy/docker_quick_start)、[Microsoft Foundry 部署与 Playground](https://learn.microsoft.com/en-us/azure/foundry/how-to/deploy-models-managed) | 两个模型与一次模拟调用 | 模型详情→申请→运营审批→文本或 Embedding 模拟调用→同一 request_id 用量与预算变化；缺 Key、额度不足可恢复 |
| 模型管理员 | 看资源池、创建 SGLang 服务、观察健康、提交训练任务 | [Xinference 模型生命周期](https://inference.readthedocs.io/en/latest/models/index.html)、[Microsoft Foundry 部署监控](https://learn.microsoft.com/en-us/azure/foundry/how-to/deploy-models-managed) | 仅组件边界说明 | 部署向导选择资源分组→模拟就绪→开发者目录可见；未就绪模型不可申请；训练任务按优先级进入模拟队列；告警关联服务与请求 |
| 平台运营 | 管渠道、审批、预算、价格、用量与对账 | [New API 渠道管理](https://docs.newapi.ai/en/docs/guide/console/channel-management)、[百炼预算管理](https://help.aliyun.com/zh/model-studio/budget-management)、[百炼监控告警](https://help.aliyun.com/zh/model-studio/model-telemetry) | 模拟审批与事件表 | 调整渠道优先级/停用→调用路径变化；设置项目额度→用量扣减；账单事件→差异登记、模拟更正与重核 |

界面保留 v0.1 的 Moedu 标识、紫色强调色与高密度控制台基线。角色切换只为演示不同工作区，不是 SSO 或 RBAC。资源池显示 216 张虚构卡用于检验“大于 200 卡”界面信息架构，不证明真实纳管能力或永久授权。

## 本轮完成门槛

- 三条角色路径在浏览器内可重复执行，且关键对象标识跨页一致。
- 至少覆盖未授权、预算不足、渠道停用、部署配置不足等失败/恢复状态。
- 桌面和 390px 移动端无页面级横向溢出；无 console/page error。
- 所有页面显著标注“本地模拟”，不得把可点击流程称为真实集成。

## 不包含

真实模型推理与流式协议、GPU/Kubernetes/调度器、真实身份和审批、资金账本、发票、漏洞修复、升级回滚、生产环境性能与安全验收。相关界面只是产品交互意图，后续仍须联调及业务规则验证。
