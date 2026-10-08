# MatrixCube MaaS 原型事实边界

核对日期：2026-09-23。以下仅用于确定交互原型中组件的职责，不表示本地已经部署这些开源服务。

- [New API 官方仓库](https://github.com/QuantumNous/new-api)说明其提供模型聚合、渠道路由、Key、用量和 Web 控制台。[v1.0.0-rc.38 发布说明](https://github.com/QuantumNous/new-api/releases/tag/v1.0.0-rc.38)明确新增 SGLang 渠道；该发布仍提示不推荐生产使用。原型展示这一渠道关系，但不假定它已通过摩度环境的兼容性测试。
- [SGLang 官方快速入门](https://github.com/sgl-project/sglang/blob/main/docs/docs/get-started/quickstart.mdx)说明其提供 OpenAI 兼容 API。原型把它放在私有模型推理引擎层；模型回复为本地模拟文本，不是 SGLang 实际推理输出。
- [KServe Runtime 概览](https://kserve.github.io/website/docs/model-serving/generative-inference/overview)说明模型服务运行时和部署能力。SGLang 与 KServe 的具体打包/ServingRuntime 适配仍待 PoC，原型只表示预期部署管理关系。
- [Apache APISIX 官方文档](https://apisix.apache.org/docs/apisix/plugins/ai-proxy-multi/)列出入口网关、认证、限流、请求追踪和 AI 代理相关能力。原型中的入口层为拟议架构，不表示真实 APISIX 路由已配置。
- [Volcano 官方仓库](https://github.com/volcano-sh/volcano)定位为云原生批任务系统。原型把它用于训练/批处理调度视图，不把单次在线推理请求放入 Volcano 队列。

摩度业务控制面、审批、预算、正式用量账本和结算是拟建产品职责，不由以上某一开源项目自动提供。原型中所有组织、Key、模型、计量、响应及状态均为显式标注的演示数据；没有真实密钥、模型服务、GPU、账单或生产连接。
