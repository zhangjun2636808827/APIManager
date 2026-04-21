# API Manager

API Manager 是一个基于 Tauri 2、React、TypeScript、Tailwind CSS 和 shadcn/ui 构建的 Windows 桌面工具，用于统一管理多个大模型 API 配置，并通过当前选中的 API 进行聊天和访问 provider 控制台页面。

## 功能概览

- 管理多个 API 配置
- 支持 OpenAI-compatible 协议
- 支持 Anthropic API 协议
- 每个 API 可独立保存 OpenAI-compatible 与 Anthropic 配置
- 配置字段包含名称、provider 类型、Base URL、API Key、默认模型、备注、控制台网址
- 支持测试连接与拉取模型列表
- 支持基于当前选中 API 的聊天
- 聊天支持流式输出和停止回复
- 支持在应用内查看 provider 控制台网址
- 支持调用系统默认浏览器打开控制台网址

## 技术栈

- Tauri 2
- React 18
- TypeScript
- Vite
- Tailwind CSS
- shadcn/ui 风格组件
- Tauri HTTP Plugin
- Tauri Shell Plugin

## 项目结构

```text
.
├── src/                         # 前端 React 源码
│   ├── app/                     # 应用布局、路由、Provider
│   ├── components/              # 通用 UI 与业务组件
│   ├── lib/                     # 工具函数
│   ├── modules/                 # 业务模块与 provider 适配器
│   ├── pages/                   # 页面组件
│   ├── styles/                  # 全局样式
│   └── types/                   # TypeScript 类型定义
├── src-tauri/                   # Tauri / Rust 桌面端工程
│   ├── capabilities/            # Tauri 权限配置
│   ├── icons/                   # 应用图标
│   ├── src/                     # Rust 入口代码
│   ├── Cargo.toml
│   └── tauri.conf.json
├── package.json
├── package-lock.json
├── tailwind.config.ts
├── vite.config.ts
└── README.md
```

## 本地开发

### 环境要求

- Node.js 18 或更高版本
- npm
- Rust 工具链
- Windows WebView2 Runtime
- Tauri 2 所需系统依赖

### 安装依赖

```powershell
npm install
```

### 启动开发环境

```powershell
npm run tauri:dev
```

### 前端构建检查

```powershell
npm run build
```

### 打包桌面应用

在开发电脑上执行：

```powershell
npm install
npm run package:windows
```

等价命令：

```powershell
npm run tauri:build
```

打包完成后会生成两个重点产物。

推荐分发 NSIS 安装包：

```text
src-tauri\target\release\bundle\nsis\*.exe
```

如果只想复制主程序，也可以使用：

```text
src-tauri\target\release\api-manager.exe
```

推荐优先把 NSIS 安装包发给另一台电脑，而不是只复制 `api-manager.exe`。安装包更符合 Windows 软件分发方式，也更容易处理安装路径和快捷方式。

完整说明见 [Windows 打包与分发说明](docs/PACKAGING.md)。

## Windows 打包和安装流程

### 1. 开发电脑准备环境

只需要开发电脑安装这些环境：

- Node.js 18 或更高版本
- npm
- Rust 工具链
- Tauri 2 所需 Windows 构建依赖
- Windows WebView2 Runtime

另一台运行软件的电脑不需要安装 Node.js、npm、Rust 或 Tauri。

### 2. 开发电脑安装依赖

在项目根目录运行：

```powershell
npm install
```

### 3. 开发电脑执行打包

在项目根目录运行：

```powershell
npm run package:windows
```

如果想使用 Tauri 原生命令，也可以运行：

```powershell
npm run tauri:build
```

### 4. 找到打包产物

打包成功后，安装包位于：

```text
src-tauri\target\release\bundle\nsis\
```

通常文件名类似：

```text
API Manager_0.1.0_x64-setup.exe
```

主程序位于：

```text
src-tauri\target\release\api-manager.exe
```

### 5. 分发给另一台电脑

推荐把这个安装包复制到另一台电脑：

```text
src-tauri\target\release\bundle\nsis\*.exe
```

另一台电脑双击安装包即可安装运行，不需要安装开发环境。

### 6. 另一台电脑直接运行 exe

如果不想安装，也可以尝试复制这个文件：

```text
src-tauri\target\release\api-manager.exe
```

然后在另一台电脑上双击运行。

注意：直接运行主程序时，如果目标电脑缺少 Microsoft Edge WebView2 Runtime，应用可能无法启动。Windows 10/11 大多数环境通常已经具备该运行时；如果没有，需要单独安装 WebView2 Runtime。

### 7. 打包验证

建议在开发电脑完成打包后先验证：

```powershell
src-tauri\target\release\api-manager.exe
```

如果主程序可以启动，再把 NSIS 安装包复制到另一台电脑测试安装。

### 8. 发布到 GitHub 的建议

不要把打包产物提交到 Git 仓库：

```text
src-tauri/target/
dist/
node_modules/
```

如果要公开发布安装包，推荐使用 GitHub Releases 上传：

```text
src-tauri\target\release\bundle\nsis\*.exe
```

源码仓库只保留代码、配置和文档；安装包作为 Release 附件发布。

## 配置说明

应用内的 API 配置由用户在界面中填写，当前阶段不需要在仓库中提交任何真实 API Key。

每个 API 配置主要包含：

- 名称
- provider 类型：OpenAI-compatible 或 Anthropic
- Base URL
- API Key
- 默认模型
- 备注
- 网站网址 / 控制台网址

## 安全注意事项

不要把任何真实密钥、令牌、证书或本地私有配置提交到 GitHub。

禁止提交的内容包括：

- `.env`、`.env.local`、`.env.production` 等环境变量文件
- OpenAI、Anthropic、Ollama 网关或其它 provider 的真实 API Key
- Tauri 签名私钥，例如 `TAURI_SIGNING_PRIVATE_KEY`
- Windows 代码签名证书，例如 `.pfx`、`.p12`
- SSH 私钥、TLS 私钥、`.pem`、`.key`、`.crt`、`.cer`
- 本地构建产物，例如 `dist/`、`src-tauri/target/`
- 依赖目录，例如 `node_modules/`
- IDE 本地配置、系统缓存、日志文件

如果后续需要提供配置示例，请使用 `.env.example`，并只填写占位符：

```env
VITE_EXAMPLE_API_BASE_URL=https://api.example.com/v1
VITE_EXAMPLE_API_KEY=replace-with-your-own-key
```

## GitHub 上传前检查

上传前建议执行：

```powershell
git status --short
```

确认不要出现以下内容：

```text
node_modules/
dist/
src-tauri/target/
.env
*.key
*.pem
*.pfx
*.p12
```

如果这些文件已经被加入暂存区，需要先从 Git 索引中移除，但保留本地文件：

```powershell
git rm -r --cached node_modules dist src-tauri/target
```

如果误加入了密钥文件，请先移除索引并轮换对应密钥：

```powershell
git rm --cached .env
```

## License

当前项目暂未指定开源许可证。上传公开仓库前，建议根据发布目标补充 `LICENSE` 文件。
