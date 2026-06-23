# 状态终端主题说明

## 参考来源

- 参考文件：`D:/regex-动态状态栏与附属面板解析.json`
- 提取风格：浅色磨砂玻璃、蓝紫强调色、半透明卡片、柔和渐变背景、信息面板式层级。

## 已实现

- 新增主题 ID：`status-terminal`
- 主题入口：`src/themes/themeOptions.ts`
- 主题样式：`src/themes/status-terminal/index.css`
- 桌面覆盖：手机壳、桌面背景、图标、Dock、时间卡片、通知入口、按钮和输入框。
- App 覆盖：微信、QQ、浏览器、小红书、AI 上下文、后台日志的基础面板与变量。
- 移动端导出：已刷新 `mobile-export/web-content.js`。

## 未实现

- 没有复刻参考 JSON 里的状态面板脚本和数据解析逻辑。
- 没有修改聊天、AI 请求、日志写入或持久化数据结构。
- 没有新增暗色版本；当前主题按浅色状态面板处理。

## 测试

- `npx tsx src/themes/themeOptions.test.ts`
- `npx tsx src/themes/status-terminal/statusTerminalTheme.test.ts`
- `npx tsx src/apps/appsStructure.test.ts`
- `npm run lint`
- `npm run build`
- `powershell -ExecutionPolicy Bypass -File mobile-export\refresh-web.ps1`

## 截图

- 红米 K60 尺寸模拟：`qa-status-terminal-redmi-k60.png`
