# 产品与技术事实边界

核对日期：2026-09-23。本文件记录交互对标和拟议组件职责，不表示软件已部署或选型最终确定。

- [New API 渠道管理文档](https://docs.newapi.ai/en/docs/guide/console/channel-management)描述渠道、优先级、权重等配置；[Key 文档](https://docs.newapi.ai/en/docs/guide/feature-guide/user/token)描述访问凭据的使用与限制。本原型借鉴其“渠道—Key—调用”对象关系，但无真实 New API 连接。
- [SGLang 官方文档](https://docs.sglang.ai/)描述模型推理服务；本原型将其呈现为私有模型服务候选，不生成真实推理结果，也未验证与 New API 的版本兼容性。
- [vLLM 官方文档](https://docs.vllm.ai/en/latest/)作为另一推理引擎参考。原型为 vLLM 演示服务单列渠道，尚未验证目标芯片、网关适配或性能。
- [KServe 文档](https://kserve.github.io/website/docs/model-serving/generative-inference/overview)说明服务运行时与部署职责；原型里的“部署中/就绪”是本地模拟，不代表 KServe 已执行。
- [Volcano 官方仓库](https://github.com/volcano-sh/volcano)定位为云原生批任务调度；原型中的训练任务优先级为设计验证，不是实际调度结果。
- [Apache APISIX AI Proxy 文档](https://apisix.apache.org/docs/apisix/plugins/ai-proxy-multi/)提供 API 网关层的相关能力；轨迹中出现 APISIX 仅表示拟议边界。
- [Xinference 模型文档](https://inference.readthedocs.io/en/latest/models/index.html)、[Microsoft Foundry 部署与监控](https://learn.microsoft.com/en-us/azure/foundry/how-to/deploy-models-managed)、[阿里云百炼预算管理](https://help.aliyun.com/zh/model-studio/budget-management)用于校准“模型目录—部署—可观测—预算”的操作任务。对标仅来自可访问的公开文档，未登录这些产品后台实测。

摩度业务控制面所需的组织、审批、预算、统一资源视图、正式用量账本和对账，不可从上述某个开源项目“已具备”直接推出。原型中所有数值及状态是虚构演示值，后续需明确数据源、权限策略、接口契约与验收指标。
