# 主题

当前真实代码入口：

- 主题选择页：`src/apps/themes/ThemesScreen.tsx` -> `ThemesScreen`
- 主题选项和类型：`src/themes/themeOptions.ts`
- 主题状态：`src/store.ts` -> `useAppStore.theme` / `setTheme`
- 软件头像覆盖：`src/shell/appIconOverrides.ts` -> 默认小手机头像、上传头像和恢复默认图标的解析工具
- 基础全局样式：`src/index.css`
- 独立主题视觉：`src/themes/pastel/index.css`、`src/themes/gothic/index.css`、`src/themes/guofeng/index.css`、`src/themes/celtic-paladin/index.css`

当前主题：

- `pastel`：奶油手绘。完整视觉覆盖在 `src/themes/pastel/index.css`，不要被其它主题改动影响。
- `gothic`：P5R 红黑。完整视觉覆盖在 `src/themes/gothic/index.css`。
- `guofeng`：古风手札。宣纸米白、墨色文字、朱砂点印、黛青淡纹，完整视觉覆盖在 `src/themes/guofeng/index.css`。
- `celtic-paladin`：凯尔特手札。羊皮纸底、深林绿、橡木墨线和细金边，完整视觉覆盖在 `src/themes/celtic-paladin/index.css`。

维护边界：

- 主题只改视觉变量、样式覆盖和主题页文案，不改聊天、通知、锁屏、查手机、主动事件的数据逻辑。
- 软件头像属于主题页外观设置：可以上传自定义头像、切换到小手机默认头像，或恢复软件原本图标；不改变聊天或其他 App 数据。
- 新主题优先放在 `src/themes/` 下，避免继续把完整主题视觉堆进 `src/index.css`。
- 每个主题应覆盖手机壳背景、锁屏、桌面图标、Dock、顶部状态/通知入口、卡片、按钮、输入框、微信/QQ 聊天变量和主题页预览文案。
- 主题颜色通过 CSS 变量统一控制，纹样只放边框、分隔线和按钮/图标角落，不遮挡内容。
