# 产品事实与拟议集成边界

核对日期：2026-10-02。下列来源是产品官方文档，证明有相应公开流程或接口，不证明本原型已经连接这些产品。

| 组件 | 官方依据 | 本原型采用的职责 | 尚待验证 |
| --- | --- | --- | --- |
| GPUStack | [架构](https://docs.gpustack.ai/latest/architecture/)、[快速入门](https://docs.gpustack.ai/latest/quickstart/)、[OpenAPI 入口](https://docs.gpustack.ai/latest/cli-reference/start/) | 模型部署、实例状态和内部模型入口的拟议权威来源 | 实际版本、管理 API 字段、鉴权、事件/轮询、目标 GPU 适配 |
| SGLang | [官方文档](https://docs.sglang.ai/) | GPUStack 管理下的模型推理进程 | 目标模型、显卡、镜像与性能实机验证 |
| New API | [GPUStack 集成说明](https://docs.gpustack.ai/latest/integrations/integrate-with-newapi/)、[渠道管理](https://docs.newapi.ai/en/docs/guide/console/channel-management)、[Key](https://docs.newapi.ai/en/docs/guide/feature-guide/user/token)、[用量日志](https://docs.newapi.ai/en/docs/guide/feature-guide/user/log) | 对外渠道、Key、统一调用入口和调用日志的拟议权威来源 | 与 GPUStack 的实际连通、模型映射、路由切换、日志字段和用量准确性 |

原型中的摩度业务层承担组织、项目、申请审批、预算检查、跨系统对象关联和综合审计。这些是需要开发的目标能力，不是上述开源组件已经合成的一套系统。门户业务对象 ID 与组件 ID、请求 `correlation_id`、用量事件之间的映射都需要服务端适配、幂等、失败补偿和真实回执验证。任何演示用量或费用都不是正式账本。

关于原生控制台：GPUStack 和 New API 各自保留专业管理界面；普通用户拟议从摩度统一门户完成高频任务。原型中的控制台按钮不含 URL、登录会话或凭据，也不代表 SSO 已实现。
