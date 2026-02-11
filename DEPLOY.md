# Mirror 部署指南

## 构建

```bash
npm install
npm run build
```

构建产物位于 `dist/` 目录。

## 环境变量

### 推荐方式（API Key 不暴露）

部署到 **Vercel** 时：

1. 在 Vercel 项目 Settings → Environment Variables 中添加：
   - `GEMINI_API_KEY` = 你的 Gemini API Key
2. **不要** 配置 `VITE_GEMINI_API_KEY`
3. 前端会通过 `/api/gemini` 代理调用，API Key 仅存在于服务端，不会被打包进 JS

获取 Key：https://aistudio.google.com/apikey

### 可选方式（本地开发直连）

若本地开发希望直连 Gemini（不依赖代理）：

- 配置 `VITE_GEMINI_API_KEY`
- 否则在 `npm run dev` 下无代理时 AI 会回退到兜底/MOCK 模式

### 其他平台（纯静态托管）

若部署到 GitHub Pages、OSS 等**无 Serverless API** 的平台：

- 需配置 `VITE_GEMINI_API_KEY`，否则 AI 功能将使用兜底
- 注意：Key 会暴露在前端，仅适合 Demo，不建议用于正式生产

## 部署平台

### Vercel（推荐）

1. 连接 Git 仓库
2. 构建命令：`npm run build`
3. 输出目录：`dist`
4. 环境变量：`GEMINI_API_KEY`（不设置 `VITE_GEMINI_API_KEY`）

API 路由 `api/gemini.ts` 会自动部署为 Serverless Function。

### Netlify / 静态托管

1. 构建命令：`npm run build`
2. 输出目录：`dist`
3. 无 `/api/gemini` 时，需配置 `VITE_GEMINI_API_KEY`（Key 会暴露，仅 Demo）

### 本地预览

```bash
npm run preview
```

本地测试代理：`vercel dev` 可同时运行前端与 `/api/gemini`。

## 生产清单

- [x] 开发调试入口（模拟高心率、周末模式）已隐藏
- [x] 本地分析埋点已移除
- [x] 控制台敏感日志已弱化
- [x] .env 已加入 .gitignore
- [x] API Key 通过服务端代理保护（Vercel 部署时）
- [ ] 视需配置 favicon 与 PWA 图标
