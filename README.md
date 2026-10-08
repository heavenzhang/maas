# 摩度 MaaS / MatrixCube

摩度 MaaS 的研究、交互原型与后续集成开发记录。指定 Git 仓库为 <https://github.com/heavenzhang/maas>，主干为 `main`。

当前阶段是交互原型与方案验证：尚未部署或接入真实 GPUStack、SGLang、New API，也没有生产服务。演示账号、部署状态、Key、Token 和费用均为模拟数据，不作为硬件性能或投标能力证据。

## 当前入口

- [集成透视原型 v0.3](outputs/maas-integration-prototype-v03-20261002/README.md)：首选阅读和演示入口，展示模型部署、渠道发布、授权、调用、用量和故障路径。
- [多角色交互原型 v0.2](outputs/maas-interaction-prototype-v02-20260923/README.md)：保留模型、任务、账单和多角色流程探索。
- [早期原型](outputs/maas-interaction-prototype-20260923/README.md)：保留最初的交互设计。
- [定位与需求基线报告](outputs/maas-positioning-20260923/report.html)、[来源记录](outputs/maas-positioning-20260923/source-notes.md)、[验证及限制](outputs/maas-positioning-20260923/validation.md)：属于 2026-09-23 的研究快照，项目活跃度、版本和兼容性须在实施前重新核实。

打开 v0.3 的 `index.html` 可演示纯前端流程。各版本具体行为与能力限制以对应目录的 README 和 `product-facts.md` 为准。

## 本地验证

使用 Node.js 20 或以上版本，在仓库根目录运行：

```bash
npm ci
npx playwright install chromium
npm run check
npm test
```

`npm test` 验证 v0.3 的浏览器本地模拟路径和移动端布局。旧版测试脚本保留在各自目录，其 HTTP 服务准备要求见对应 README。已安装 Playwright 的受控工作环境也可用 `PLAYWRIGHT_MODULE` 指向模块位置，无需把本机绝对路径写入源码。

临时附件、PDF 提取页、调试文件和自动生成截图不纳入 Git。原始资料与本机测试依赖不会随 clone 分发。

后续方向沿用 `GPUStack + SGLang + New API` 首期组合：先开发门户集成后端并验证 Linux 单 GPU 的真实调用，再验证目标 D300 硬件；单机 NVIDIA 测试不能替代 D300 或六节点验收。
