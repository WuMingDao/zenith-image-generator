<div align="center">

# Zenith Image Generator

**现代化 AI 文生图 Web 应用**

支持多 AI 提供商的深色模式图片生成器，<br/>
批量生成，一键部署到 Cloudflare Pages。

[English](./README.md) · [更新日志](./CHANGELOG.md) · [在线演示](https://zenith-image-generator.pages.dev)

![Dark Mode UI](https://img.shields.io/badge/UI-Dark%20Mode-1a1a1a)
![Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020)
![React](https://img.shields.io/badge/React-19-61DAFB)
![Hono](https://img.shields.io/badge/Hono-4-E36002)

</div>

---

## 功能特性

- **多 AI 提供商** - Gitee AI、HuggingFace Spaces
- **深色模式 UI** - Gradio 风格毛玻璃效果
- **灵活尺寸** - 多种宽高比 (1:1, 16:9, 9:16, 4:3 等)
- **4x 放大** - RealESRGAN 集成
- **安全存储** - API Key 使用 AES-256-GCM 加密
- **Flow 模式** - 可视化批量生成画布 (实验性)

## 快速开始

### 前置要求

- Node.js 18+ / pnpm 9+
- [Gitee AI API Key](https://ai.gitee.com)

### 一键部署

[![部署到 Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020?style=for-the-badge&logo=cloudflare)](https://dash.cloudflare.com)

> 连接 GitHub 仓库 → 设置 root 为 `apps/web` → 部署！

### 本地开发

```bash
git clone https://github.com/WuMingDao/zenith-image-generator.git
cd zenith-image-generator
pnpm install

# 终端 1
pnpm dev:api

# 终端 2
pnpm dev:web
```

打开 `http://localhost:5173`

📖 **[完整开发指南](./CONTRIBUTING.md)**

## 文档

| 文档 | 描述 |
|------|------|
| [贡献指南](./CONTRIBUTING.md) | 本地配置、局域网访问、开发 |
| [部署指南](./docs/zh/DEPLOYMENT.md) | Cloudflare、Vercel、Netlify 教程 |
| [API 参考](./docs/zh/API.md) | 接口、参数、代码示例 |

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19, Vite, Tailwind CSS, shadcn/ui |
| 后端 | Hono (TypeScript) |
| 部署 | Cloudflare Pages + Functions |

## 许可证

MIT

## 致谢

- [Gitee AI](https://ai.gitee.com) - z-image-turbo 模型
- [shadcn/ui](https://ui.shadcn.com) - UI 组件
- [Hono](https://hono.dev) - Web 框架
