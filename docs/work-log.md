# 小手机工作记录

每次修改项目都要在这里追加记录。记录只写本次真实发生的事情，不写未来愿望。

## 2026-08-13 潮汐邮局结构化重设计

- 范围：只重做 `tidal-post-office` 的专属桌面身份、布局坐标和预览表现，保留其它主题与并行任务改动。
- 原因：第一版完整但视觉结构仍接近通用小手机，仅靠色彩、纹理与角标不足以形成独立主题识别。
- 内容：新增信封锚徽标与 `ROUTE 09` 邮路铭牌；为桌面两页提供独立应用坐标；用 24 枚海事邮戳字标替代潮汐主题中的通用图标；把图床改成横向“漂流投递窗”，把时间卡改成到件凭条，把 Dock 改成邮袋标签栏；同步强化通知到件票、微信/QQ 邮路抬头与气泡暗记、主题卡缩略整机和机身顶部航线铭牌。
- 验证：`desktopLayout.test.ts`、`tidalPostOfficeTheme.test.ts`、`themesScreen.test.ts`、`themeOptions.test.ts`、`npm run lint` 与 `npm run build` 通过，源码无直接 `randomUUID` 调用；构建仅保留既有的大 chunk 提示。应用内浏览器在 `http://127.0.0.1:3013/`、390×844 下抽查锁屏、桌面两页、Dock、主题卡、通知中心、微信与 QQ，页面宽度保持 390 且无横向溢出。当前没有导入角色，微信/QQ 仅确认真实空状态和主题外壳，没有伪造会话气泡截图；结果仍不替代实体手机验收。

## 2026-08-09 潮汐邮局独立整机主题

- 范围：只扩展整机主题选项、主题入口、潮汐邮局专属 CSS、主题测试与维护文档；保留微信/QQ 会话数据、回复拆泡方式、独立气泡皮肤和其它整机主题不变。
- 原因：已有“潮汐邮票”只是一套微信/QQ 气泡外观，用户需要在主题页单独出现一张可切换的“潮汐邮局”完整整机主题卡。
- 内容：新增 `tidal-post-office` 主题 ID、主题卡和根级主题类；专属样式覆盖手机壳、锁屏、桌面、邮票齿孔图标、海玻璃 Dock、通知、通用卡片/按钮/输入框、微信和 QQ 的跟随主题气泡及主题页缩略预览。配色使用深海蓝绿、海玻璃绿、旧天蓝、羊皮纸、珊瑚粉和氧化铜，装饰限制在背景、边框和角标，不覆盖动态内容。
- 验证：`npx tsx src/themes/themeOptions.test.ts`、`npx tsx src/apps/themes/themesScreen.test.ts`、`npx tsx src/themes/tidal-post-office/tidalPostOfficeTheme.test.ts`、`npm run lint` 与 `npm run build` 通过；构建仅保留既有的大 chunk 提示。应用内浏览器在 390×844 下确认主题卡可单独选择且刷新后保留，根节点应用 `theme-tidal-post-office`；锁屏、桌面、通知、微信和 QQ 无横向溢出。当前测试数据未导入角色，聊天房间气泡仅完成 CSS 结构门禁，没有冒充真实会话截图验证。

## 2026-08-07 预设页紧凑交互与删除修复

- 原因：预设管理页继承手写字体，两个选择区长期展开，当前选择反馈不明显；条目卡过高，删除藏在展开编辑器内并依赖 WebView 不稳定的系统确认框。
- 内容：预设页固定使用正常系统中文字体；“手机整体风格”和“软件预设”默认折叠并显示当前值；选中项改成深色高亮、白字和勾选/圆点反馈；条目卡改成紧凑行，点击正文展开编辑，右侧常显删除按钮，排序按钮收进展开区；所有删除改成页面内红色确认条，不再调用 `window.confirm`。当前导入预设增加“删除预设”，软件恢复操作改成文字按钮。
- 稳定性：新增条目放到列表顶部并立即展开，避免 159 条分页时新增后看不到；删除临时新条目后条目数和开启数能准确恢复。
- 验证：82 个 TypeScript/TSX 测试、类型检查、生产构建和离线 WebView 刷新通过；本地页面确认系统中文字体、两个折叠区、黑底白字选中态、紧凑条目和右侧删除键。实际新增临时条目后从 159/61 变为 160/62，页面内确认删除后恢复 159/61；整个 `Monster_Hone_v1.4` 预设的删除确认只打开后取消，用户预设未删除。未打 APK。

## 2026-08-07 预设条目管理迁回“预设”App

- 原因：完整的酒馆条目编辑器误放在微信“我 > 设置”，和桌面已有的“预设”App职责重复，用户也不容易找到。
- 内容：酒馆 JSON/TXT 导入、粘贴导入、条目总数/开启数、搜索、筛选、新增、编辑、角色身份、开关、排序、删除和发送预览全部迁到桌面“预设”App的微信分类；微信设置只保留当前预设选择、条目摘要、“去预设 App 管理条目”入口及上下文、温度、最大长度、RP 长短。迁移沿用原 `chatPresetEntries` 状态，已导入数据无需重导。
- 修正：恢复微信默认预设或全部默认预设时会同步清空旧结构化条目，避免界面显示默认预设但请求仍偷偷发送旧条目。
- 性能：条目列表默认只渲染前 30 条，可每次继续显示 30 条；搜索和开关统计仍覆盖全部条目，避免 159 条预设一次性铺满页面造成明显卡顿。
- 验证：82 个 TypeScript/TSX 测试、`npm run lint` 和生产构建通过；本地页面确认预设 App 显示 `Monster_Hone_v1.4`、159 条/开启 61 条，条目搜索正常；微信设置只保留摘要和跳转入口，原条目状态未改动。未调用真实聊天 API，未打 APK。

## 2026-08-07 酒馆式聊天预设条目管理

- 原因：原导入器只把酒馆预设中判定为开启的内容拼成一个大文本框，条目名称、关闭项、顺序和角色身份无法在小手机内查看或调整；并且 Monster Hone 的真实开关保存在 `prompt_order[].order`，与部分 `prompts[].enabled` 不一致，旧逻辑会读错。
- 内容：新增结构化 `chatPresetEntries`，persist 71→72；导入时完整保留最多 500 个条目的名称、内容、system/user/assistant 身份、酒馆顺序和实际开关。微信设置新增条目总数/开启数、搜索、开启/关闭筛选、新增、展开编辑、角色选择、显式保存、上下移动和二次确认删除；只读发送预览只组合已开启且有正文的条目。切换回内置预设会退出结构化条目模式，不影响旧纯文本预设兼容。
- 发送：结构化条目不再只作为一个系统大文本发送；ChatScreen 按条目顺序生成独立 system/user/assistant 消息，关闭项和空占位不会进入请求。小手机自身的人设、RP 长短、生活动作和上下文规则仍由基础系统消息注入。
- 实测：重新导入 `D:\Monster_Hone_v1.4.json` 后，页面显示预设名 `Monster_Hone_v1.4`、159 条、开启 61 条，其中 49 条含正文会实际发送；开关从 61→62→61 可恢复，搜索“思维链测试·改”只显示一个条目，展开后可见角色、保存和删除操作。刷新页面后 159/61 状态仍保留，页面无横向溢出和控制台错误。
- 验证：81 个 TypeScript/TSX 测试全部通过；`npm run lint`、`npm run build` 通过。未调用真实聊天 API，未打 APK。

## 2026-08-07 聊天截断、短 RP 与长 RP 修复

- 原因：用户确认接口后台已经返回完整正文，实际问题是小手机把回复拆成多条后使用延迟逐条写入；页面切换、WebView 暂停或异常格式会让后续气泡没有落库，最终只剩“最”或 `[` 之类片段。短气泡连发本身是正常的短 RP，不应被统一改成单气泡。
- 截断修复：AI 完整回复先完成解析和图片动作准备，再通过新增的 `addMessages()` 在一次状态更新中保存全部气泡，移除每条消息保存前 420–1400ms 的人工等待。JSON 数组、代码围栏、对象式 `messages/replies/content` 和未配平数组行都能提取正文，单独的 `[`/`]` 不再显示；闭合或未闭合 `<think>` 内容会被过滤。`reasoning_content` 不再作为正文兜底，接口只有思维内容而无最终正文时会明确报错，不把原生思维链显示给用户。
- RP 分类：微信设置把原“气泡方式”改为“RP 长短”，提供“自动选择短 / 长 RP”“短 RP（多条短气泡）”“长 RP（完整单气泡）”。短 RP 保留两到四条真人式短气泡并禁止长段括号旁白；长 RP 在单个气泡中保留完整正文和自然分段，只允许情节需要时低频出现一小段括号动作/心理描写；自动模式按情境选择。三种模式都使用同一套完整落库逻辑。
- 兼容修复：默认最大回复长度由 520 提升到 1200，v70 旧默认迁移到 1200且自定义值不变；OpenAI 兼容地址支持域名、`/v1`、Gemini `/v1beta/openai` 和完整 `/chat/completions`；数组式正文、空正文和 `finish_reason=length` 均有明确处理；主动生图关闭且模型只输出图片动作时补可见文字，避免整轮静默。
- 验证：78 个 TypeScript/TSX 测试和 5 个 Node 后端/移动桥测试通过；`npm run lint`、`npm run build`、`mobile-export/refresh-web.ps1` 通过。本地页面确认默认最大回复长度为 1200，RP 下拉框完整显示三个分类和说明，页面无横向溢出、控制台无 error/warn。未调用用户真实聊天 API，未产生接口费用，未打 APK。

## 记录格式

## 2026-06-23 TTS 设置页收起音色区

- 范围：只改设置页 TTS 展示策略、TTS preset helper 测试、项目大纲和本工作记录；未改 TTS 请求构造、store 持久化版本、聊天或电话业务逻辑。
- 原因：小屏 TTS 页默认露出 `Voice ID`、音色预设和各供应商示例按钮，看起来像模型选择外又多了一堆必须配置的东西。
- 内容：`settingsTtsPresets.ts` 新增 `shouldShowTtsVoiceControls()`，默认返回 false；`SettingsScreen` 通过该策略隐藏 `音色 / Voice ID`、`音色预设` 和“保存当前音色为预设”，保留提供商、接口、API Key、拉取 TTS 模型、模型选择、TTS 开关和试听；底层默认 voice 与旧自定义音色预设数据仍保留兼容。
- 文档：同步 `PROJECT_OUTLINE.md` 和本工作记录。
- 验证：`npx tsx src/apps/settings/settingsTtsPresets.test.ts` 先因 `shouldShowTtsVoiceControls` 未导出失败，补实现后通过；`npx tsx src/apps/settings/settingsSelfCheck.test.ts` 通过；`rg -n "crypto\.randomUUID|randomUUID" src package.json vite.config.ts` 无命中；`npm run build` 通过，仅保留 Vite chunk 体积提示；`powershell -ExecutionPolicy Bypass -File mobile-export\refresh-web.ps1` 通过并刷新离线 WebView；in-app browser 390x844 打开 `http://127.0.0.1:3000/`，进入设置 -> TTS 语音后确认页面保留 `TTS 模型` 和 `拉取 TTS 模型`，且不再出现 `Voice ID`、`音色预设`、`保存当前音色为预设`、`OpenAI Alloy`、`Doubao BV001 legacy`。`npm run lint` 当前被非本轮问题挡住：`src/apps/wechat/ai/wechatAi.test.ts` 引用未导出的 `resolveGroupReplyPartSpeaker`。

## 2026-06-23 朋友圈发布入口收起

- 范围：只改微信朋友圈发布入口、朋友圈按钮样式、朋友圈逻辑测试和相关文档；未改 QQ、聊天 API、store 持久化版本或其他 App。
- 原因：朋友圈打开后直接显示自己的发布框很奇怪，真实使用节奏应该是先看好友动态，需要发时再点加号/发朋友圈。
- 内容：`WeChatMoments` 新增发布器开关，进入朋友圈默认隐藏 `MomentComposer`；头部新增“发朋友圈”按钮，展开后显示发布器，发表成功后自动收起；`momentsLogic.ts` 新增发布入口文案 helper 并补测试；CSS 补充朋友圈头部双按钮布局。
- 文档：同步 `PROJECT_OUTLINE.md`、`docs/wechat.md` 和本工作记录。
- 验证：`npx tsx src/apps/user-info/userProfileUi.test.ts` 先因缺少 `normalizeUserAvatarReaderResult` 导出失败，补实现后通过；`npx tsx src/apps/user-info/userProfilePrompt.test.ts` 通过；`npx tsx src/apps/appsStructure.test.ts` 通过；`rg -n "crypto\.randomUUID|randomUUID" src package.json vite.config.ts` 无命中；`npm run lint` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示；Playwright 390x844 打开 `http://127.0.0.1:3000/`，解锁并进入 User 信息页，给头像文件输入设置 1x1 PNG 后确认 `userAvatar` 写为 `data:image/png;base64,...`，且页面头像渲染为图片。

## 2026-06-23 User 信息头像点击更换

- 范围：只改 User 信息页头像上传交互、User 信息 UI helper 和相关文档；未改多玩家档案结构、聊天回复逻辑、QQ 首页结构或持久化版本。
- 原因：User 信息里的头像只能展示，不能直接点击更换。
- 内容：`UserInfoScreen` 增加隐藏图片文件输入和头像按钮，点击头像即可选择本地图片；FileReader 读取成功后写入全局 `userAvatar`，微信、QQ 等读取玩家头像的位置会跟随更新；`userProfileUi.ts` 新增头像读取结果归一化 helper，并补充测试。
- 文档：同步 `PROJECT_OUTLINE.md`、`docs/life-system-framework.md` 和本工作记录。
- 验证：`npx.cmd tsx src\apps\wechat\moments\wechatMoments.test.ts` 通过；`npx.cmd tsx src\apps\wechat\wechatModules.test.ts` 通过；`npm.cmd run lint` 通过；`npm.cmd run build` 通过，保留既有 Vite chunk 体积提示；`powershell -ExecutionPolicy Bypass -File mobile-export\refresh-web.ps1` 首次被 Windows `EPERM` 卡在旧 `dist/default-software-avatar-logo.png` 构建产物，删除该构建产物后重试通过并刷新 `mobile-export/web-content.js`；`rg -n "crypto\.randomUUID|randomUUID" src package.json vite.config.ts` 无命中；浏览器 390x844 验证进入微信朋友圈默认没有发布器，点“发朋友圈”才展开，发表后自动收起并显示新动态，截图保存到 `qa-screenshots/wechat-moments-compose-toggle-390x844.png`，随后已删除验收用测试动态。

## 2026-06-23 TTS 豆包默认音色修正

- 范围：只改设置页 TTS 服务商默认值、内置音色预设 helper、TTS 请求构造、store 迁移和对应测试；不改聊天、电话、语音播放 UI 或角色卡。
- 原因：设置页切到豆包时会自动填入 `zh_female_cancan_uranus_bigtts`，并高亮“豆包 灿灿”，看起来像所有角色都默认使用同一个豆包人声音色。
- 内容：新增 `src/apps/settings/settingsTtsPresets.ts` 集中维护 TTS 服务商默认值和音色预设；豆包 provider 默认 Voice ID 改为空，placeholder 改为提示用户填写豆包音色 ID 或点击示例预设；“豆包 灿灿”改成示例预设命名，不再作为默认；`tts.ts` 去掉豆包新版空 voiceId 时自动回退到 `zh_female_cancan_uranus_bigtts` 的行为；`src/store.ts` persist version 升到 62，并在迁移时清理旧版自动默认的豆包 cancan Voice ID。
- 文档：同步 `PROJECT_OUTLINE.md` 和本工作记录。
- 验证：`npx tsx src/apps/settings/settingsTtsPresets.test.ts` 先因 helper 缺失失败，补实现后通过；`npx tsx src/tts.test.ts` 先失败于空豆包 voiceId 仍回退到 cancan，修正后通过；`npx tsx src/storeTtsMigration.test.ts` 先因迁移 helper 缺失失败，补实现后通过；`npx tsx src/apps/settings/settingsSelfCheck.test.ts` 通过；`rg -n "crypto\.randomUUID|randomUUID" src package.json vite.config.ts` 无命中；`npm run lint` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示；Playwright 390x844 打开 `http://127.0.0.1:3000/`，进入设置 -> TTS 语音，点击豆包后确认 Voice ID 为空、placeholder 提示填写豆包音色 ID 或点击示例预设，且控制台无 error；另模拟 version 61 旧 localStorage 中保存豆包 cancan，加载后确认 persist version 升到 62 且 `ttsConfig.voiceId` 迁移为空。

```md
## YYYY-MM-DD 标题

- 范围：改了哪些模块或文件。
- 原因：为什么要改。
- 内容：实际做了什么。
- 文档：同步了哪些文档。
- 验证：跑了哪些命令，结果如何。
- 后续：还剩什么明确事项。
```

## 2026-05-10 生活系统框架和文档规则

- 范围：新增总框架文档和工作记录规则，更新项目维护流程。
- 原因：后续小手机要先有文档框架，再按模块逐步实现；每次修改都需要留下可追踪记录。
- 内容：新增 `docs/life-system-framework.md`，定义手机壳层、生活 App 层、生活事件层、角色记忆层、主动事件层；新增 `docs/work-log.md` 作为每次修改的记录入口。
- 文档：同步 `CLAUDE.md` 和 `PROJECT_OUTLINE.md` 的文档维护要求。
- 验证：`npm run lint` 通过；`npm run build` 通过，保留 Vite chunk 体积提示。
- 后续：下一轮如果开始实现，应先从生活事件结构或锁屏通知中心二选一写具体设计。

## 2026-05-10 App 壳第一刀拆分

- 范围：手机壳桌面 App 目录和 `src/App.tsx` 顶层依赖。
- 原因：`src/App.tsx` 仍是巨型入口，后续锁屏、通知中心和生活事件接入前，需要先从低风险的纯目录数据开始拆。
- 内容：新增 `src/shell/appCatalog.tsx`，把桌面分页图标和 Dock 图标从 `src/App.tsx` 抽出；新增 `src/shell/appCatalog.test.ts`，校验目录数量、分页、Dock 顺序和 screen 去重；`src/App.tsx` 改为从 shell catalog 导入目录数据。
- 文档：新增 `docs/superpowers/plans/2026-05-10-app-shell-split.md`，同步 `PROJECT_OUTLINE.md`。
- 验证：`npx tsx src/shell/appCatalog.test.ts` 通过；全部 `src/**/*.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，保留 Vite chunk 体积提示；源码中未发现 `crypto.randomUUID` / `randomUUID` 直调。
- 后续：下一刀可拆 `FeatureScreen` 路由，或继续拆 `Desktop` / `AppIcon` / `Draggable` 到 `src/shell/`。

## 2026-05-10 每个软件独立文件夹

- 范围：微信、B站、小红书、电话四个已成型软件的目录结构。
- 原因：用户明确要求每个软件是一个文件夹，后续扩展音乐、QQ、备忘录升级时也要遵守 `src/apps/<软件名>/` 的组织方式。
- 内容：新增 `src/apps/appsStructure.test.ts`；移动微信到 `src/apps/wechat/`，B站到 `src/apps/bilibili/`，小红书到 `src/apps/xiaohongshu/`，电话到 `src/apps/phone/`；软件相关测试也跟随移动；更新 `src/App.tsx` 和 `src/store.ts` import。
- 文档：新增 `docs/superpowers/plans/2026-05-10-app-folder-layout.md`，同步 `PROJECT_OUTLINE.md`、`docs/wechat.md`、`docs/bilibili-plan.md` 和相关 `模块/*/README.md`。
- 验证：`npx tsx src/apps/appsStructure.test.ts` 通过；全部 `src/**/*.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，保留 Vite chunk 体积提示；源码中未发现 `crypto.randomUUID` / `randomUUID` 直调。
- 后续：下一轮拆未成型软件时，按同样规则建立 `src/apps/music/`、`src/apps/memo/`、`src/apps/qq/` 等目录，不再把软件代码直接放在 `src/` 根目录。

## 2026-05-10 每个软件独立文件夹第二轮

- 范围：继续整理 `src/App.tsx` 中残留的软件屏幕和 `src` 根目录小剧场逻辑。
- 原因：用户要求本轮协调“每个软件一个文件夹”，且不改业务逻辑，只做目录整理、import 修正、测试修正和文档同步。
- 内容：新增 `src/apps/theater/`、`src/apps/calendar/`、`src/apps/diary/`、`src/apps/memo/`、`src/apps/browser/`、`src/apps/qq/`、`src/apps/video/`、`src/apps/settings/`、`src/apps/themes/`、`src/apps/presets/`、`src/apps/logs/`、`src/apps/ai-context/`、`src/apps/contacts/`、`src/apps/shared/` 和 `src/apps/system/`；把小剧场、日历、日记、查手机、备忘录、浏览器、微信聊天/气泡、QQ入口、视频通话、设置/主题/预设/日志/AI上下文/通讯录入口从 `src/App.tsx` 拆出；把 `src/theaterLogic.ts` 和测试移动到 `src/apps/theater/`；更新相关 import 和 `src/apps/appsStructure.test.ts`。
- 文档：同步 `PROJECT_OUTLINE.md` 和本工作记录；新增执行计划 `docs/superpowers/plans/2026-05-10-app-folder-layout-round2.md`。
- 验证：`npx tsx src/apps/appsStructure.test.ts` 通过；全部 `src/**/*.test.ts` 通过，保留 zustand persist 在 Node 测试环境 storage unavailable 提示；`npm run lint` 通过；`npm run build` 通过，保留 Vite chunk 体积提示；源码中未发现 `crypto.randomUUID` / `randomUUID` 直调。
- 后续：若后续要把 `src/apps/system/SystemScreens.tsx` 进一步拆成每个系统工具自己的完整实现，可以在不改行为的前提下继续细拆；本轮先保证所有入口都有独立 `src/apps/<app-name>/` 文件夹。

## 2026-05-10 微信聊天内部继续拆分

- 范围：微信/QQ 共用聊天入口内部结构。
- 原因：上一轮已经把微信整体移出 `src/App.tsx`，但 `src/apps/wechat/WeChatApp.tsx` 仍同时承担四页签外壳、聊天列表、聊天房间和消息气泡，后续微信优化前需要继续降耦合。
- 内容：新增 `src/apps/wechat/chat/ChatList.tsx` 和 `src/apps/wechat/chat/ChatScreen.tsx`；`src/apps/wechat/WeChatApp.tsx` 只保留微信四页签外壳；`src/apps/qq/QQScreen.tsx` 改为复用 `src/apps/wechat/chat/ChatList.tsx`；`src/App.tsx` 改为从 `src/apps/wechat/chat/ChatScreen.tsx` 导入聊天房间；更新 `src/apps/appsStructure.test.ts`。
- 文档：同步 `PROJECT_OUTLINE.md`、`docs/wechat.md` 和本工作记录。
- 验证：后续统一跑结构测试、全部 `src/**/*.test.ts`、`npm run lint`、`npm run build` 和 randomUUID 检查。
- 后续：可以继续把 `Bubble`、消息长按工具、生活卡片发送动作从 `ChatScreen.tsx` 内拆成更小文件，但不建议和新功能同一轮混做。

## 2026-05-10 QQ 拆分前调研

- 范围：只调研 QQ 模块入口、聊天复用关系和后续 `src/apps/qq/` 最小拆分边界。
- 原因：用户要求先确认 QQ 是否仍复用 `ChatList` 或 `App.tsx` 内部逻辑，并且不要复制微信整套代码。
- 内容：确认当前没有 `src/apps/qq/`；`src/shell/appCatalog.tsx` 只登记 QQ 桌面图标；`src/App.tsx` 的 `FeatureScreen` 对 `screen === "qq"` 直接渲染 `<ChatList channel={screen} />`；`ChatScreen`、`Bubble` 和 `src/store.ts` 的聊天 actions 仍由 `channel: "wechat" | "qq"` 共用。
- 文档：更新 `模块/QQ/README.md`，写明 QQ 当前复用现状、不可复制微信代码的边界，以及下一步只抽 `QQApp` / `QQChatList` 的最小方案。
- 验证：运行 `rg` 和分段读取确认 `src/App.tsx`、`src/store.ts`、`src/shell/appCatalog.tsx`、`src/apps/` 结构；本次未改业务代码，未运行 lint/build。
- 后续：真正实现时先新增 `src/apps/qq/QQApp.tsx` 并只搬 QQ 列表入口，`ChatScreen`、`Bubble`、聊天 store actions 先保留在 `src/App.tsx` / `src/store.ts`。

## 2026-05-10 音乐模块目录准备

- 范围：音乐模块入口和 `src/apps/music/` 目录结构。
- 原因：用户要求本轮只负责音乐模块，先确认 `MusicScreen` 是否仍在 `src/App.tsx`，如果已有则仅拆到 `src/apps/music/` 并保持行为不变。
- 内容：确认 `MusicScreen` 已是完整音乐页而非占位；新增 `src/apps/music/MusicScreen.tsx`，把既有音乐 UI、搜索、歌单、历史、一起听、char 创作和唱歌/TTS 入口从 `src/App.tsx` 移入；`src/App.tsx` 改为 import 并在 `FeatureScreen` 中继续分发；更新 `src/apps/appsStructure.test.ts` 检查音乐目录。
- 文档：同步 `PROJECT_OUTLINE.md`、`docs/music-plan.md`、`模块/音乐/README.md`。
- 验证：`npx tsx src/apps/appsStructure.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，保留 Vite chunk 体积提示。
- 后续：下一步音乐只做小拆分，优先抽无状态工具和子视图；不要在同一轮新增播放器状态或重做交互。

## 2026-05-10 相册模块独立目录

- 范围：只整理相册模块，新增 `src/apps/gallery/`，没有修改微信、日历、备忘录、音乐业务逻辑。
- 原因：把 `GalleryScreen` 和相册 UI、照片分组/筛选/标签/可读范围相关逻辑从 `src/App.tsx` 移到相册自己的目录。
- 内容：新增 `src/apps/gallery/GalleryScreen.tsx`、`src/apps/gallery/galleryLogic.ts`、`src/apps/gallery/galleryLogic.test.ts`；`src/App.tsx` 只保留 `GalleryScreen` import 和 `gallery` 路由；`src/apps/appsStructure.test.ts` 增加 gallery 目录校验；保持 `GalleryPhoto` 和 `galleryTags` 数据结构不变。
- 文档：更新 `docs/gallery-design.md`、`模块/相册/README.md`、`PROJECT_OUTLINE.md`，并追加本记录。
- 验证：`npx tsx src/apps/appsStructure.test.ts` 通过；`npx tsx src/apps/gallery/galleryLogic.test.ts` 通过；全量 `src/**/*.test.ts(x)` 通过；`npm run lint` 通过；`npm run build` 通过，保留 Vite chunk 体积提示。
- 后续：相册后续新增功能继续落在 `src/apps/gallery/`，只有状态结构变化时再同步 `src/store.ts` persist migrate。

## 2026-05-10 生活事件时间线基础结构

- 范围：只做生活事件时间线基础结构，未改锁屏、通知中心、查手机、微信聊天优化或主动事件逻辑。
- 原因：先给微信、电话、日记、日历、相册、音乐、小红书、B站后续写入高价值生活事件提供统一数据结构、持久化字段和读写工具。
- 内容：新增 `src/lifeEvents.ts`，定义 `LifeEvent`、`LifeEventDraft`、事件 app/type 枚举、`buildLifeEvent`、`normalizeLifeEvents`、`getLifeEventTimeline` 和 `isHighValueChatLifeEventInput`；新增 `src/lifeEvents.test.ts` 覆盖归一化、读取筛选、高价值聊天门槛和 store 写入去重；`src/store.ts` 新增 `lifeEvents`、`addLifeEvent`、`deleteLifeEvent`，同一 `app + sourceId` 更新原事件，当前 persist version 为 44 并迁移旧状态。
- 文档：同步 `PROJECT_OUTLINE.md`、`docs/life-system-framework.md` 和本工作记录。
- 验证：先运行 `npx tsx src/lifeEvents.test.ts` 失败，原因是 `src/lifeEvents` 尚不存在；实现后 `npx tsx src/lifeEvents.test.ts` 通过（保留 Node 环境中 zustand storage unavailable 提示）；`npx tsx src/apps/appsStructure.test.ts` 通过；全量 `src/**/*.test.ts` 跑到非本轮范围的 `src/shell/appCatalog.test.ts` 时停止，原因是当前桌面目录已有 16 个 App 而测试仍期望 15 个；`npm run lint` 停在非本轮范围的 `src/apps/active-events/ActiveEventsScreen.tsx` JSX namespace 和 props `key` 类型错误；`npm run build` 通过，保留 Vite chunk 体积提示；源码中未发现 `crypto.randomUUID` / `randomUUID` 直调。
- 后续：各 App 后续接入时只写高价值节点，不要把每条普通聊天或普通浏览行为都写入生活事件。

## 2026-05-10 查手机按角色读取升级

- 范围：只改查手机读取和展示；未改生活事件时间线、锁屏、通知中心、微信聊天优化或主动事件逻辑，也未改其他 App 写入逻辑。
- 原因：查手机需要按选中 char 展示 TA 自己手机里的最近聊天、日记、相册、日历、备忘、浏览器、小红书和音乐摘要，而不是展示用户手机里哪些内容能给角色看。
- 内容：新增 `src/apps/peek/peekLogic.ts` 和 `src/apps/peek/peekLogic.test.ts`，把查手机跨 App 角色手机规则抽成纯逻辑；`src/apps/diary/PeekScreen.tsx` 改为角色切换 + 摘要行展示；`src/apps/appsStructure.test.ts` 增加 `src/apps/peek/` 结构检查。读取规则包括：聊天只读该 char 会话并按角色手机口吻展示；日记/日历/相册/备忘/小红书/音乐只读取明确属于该角色的记录；浏览器使用现有浏览记录作为 TA 手机浏览摘要；没有明确记录时生成角色手机痕迹摘要，不把用户日记、用户相册或用户备忘当成角色手机内容。
- 文档：同步 `PROJECT_OUTLINE.md`、`docs/life-system-framework.md`、`docs/diary-plan.md`、`模块/日记/README.md` 和本工作记录。
- 验证：按 TDD 先运行 `npx tsx src/apps/peek/peekLogic.test.ts` 失败，原因是 `src/apps/peek/peekLogic` 尚不存在；实现后该测试通过。`npx tsx src/apps/appsStructure.test.ts` 通过；全部 `src/**/*.test.ts` 通过，保留 Node 环境中 zustand storage unavailable 提示；`npm run lint` 失败在非本轮范围的 `src/apps/active-events/ActiveEventsScreen.tsx` JSX namespace 和 props `key` 类型错误；`npm run build` 通过，保留 Vite chunk 体积提示；`rg -n "randomUUID|crypto\.randomUUID" src` 未发现源码直调；本地 dev server 跑在 `http://127.0.0.1:3002/` 且 HTTP 200，Browser 插件初始化超时，未完成浏览器内可视冒烟。
- 后续：如果后续把查手机改为优先读生活事件时间线，需要先稳定 LifeEvent 可读范围，再用 `peekLogic.ts` 替换底层数据来源。

### 2026-05-10 查手机视角修正

- 范围：修正上一条查手机实现的产品语义，仍只改查手机读取/展示与文档。
- 原因：查手机应当是查角色自己的手机，不是查用户手机；上一版误把“char 可读范围”作为主语。
- 内容：`peekLogic.ts` 改为优先展示明确属于该角色的记录；没有明确记录时生成 TA 手机里的聊天、日记、相册、日历、备忘、浏览器、小红书和音乐痕迹摘要；测试改为拒绝用户日记、用户相册、用户备忘和其他角色内容进入当前角色手机。
- 文档：同步 `PROJECT_OUTLINE.md`、`docs/life-system-framework.md`、`docs/diary-plan.md`、`模块/日记/README.md` 和本工作记录。
- 验证：`npx tsx src/apps/peek/peekLogic.test.ts` 先失败在用户日记被读进角色手机，修正后通过；`npx tsx src/apps/appsStructure.test.ts` 通过；全部 `src/**/*.test.ts` 通过，保留 Node 环境中 zustand storage unavailable 提示；`npm run lint` 通过；`npm run build` 通过，保留 Vite chunk 体积提示；`rg -n "randomUUID|crypto\.randomUUID" src` 未发现源码直调；`http://127.0.0.1:3002/` HTTP 200。

## 2026-05-10 主动事件手动刷新入口

- 范围：只做主动事件第一版手动入口和纯逻辑；没有修改生活事件时间线规则、锁屏、通知中心、查手机、微信聊天优化。
- 原因：需要一个低风险的“刷新今日生活”入口，让系统基于已有聊天、日记、日历、相册、音乐等数据生成少量主动事件建议。
- 内容：新增 `src/apps/active-events/activeEventsLogic.ts` 和测试，按 6 小时冷却、最多 3 条建议、真实 `sourceIds` 生成发消息、写日记、推荐歌、发动态或创建后台提醒建议；新增 `src/apps/active-events/ActiveEventsScreen.tsx`，只在手动点击时生成预览，确认后才写入微信消息、char 日记、音乐聆听记录、朋友圈动态或后台记录，并同步写入 `lifeEvents`；`src/store.ts` 新增 `activeEventLastRefreshAt` 和 setter，当前 persist version 为 44；桌面第二页新增“今日生活”入口并更新结构测试。
- 文档：同步 `docs/life-system-framework.md`、`PROJECT_OUTLINE.md` 和本工作记录。
- 验证：按 TDD 先运行 `npx tsx src/apps/active-events/activeEventsLogic.test.ts` 失败，原因是主动事件逻辑模块尚不存在；实现后通过。`npx tsx src/apps/active-events/activeEventsStore.test.ts` 先失败于缺少 `setActiveEventLastRefreshAt`，实现后通过。`npx tsx src/apps/appsStructure.test.ts` 通过；全部 `src/**/*.test.ts` 通过，保留 Node 环境中 zustand storage unavailable 提示；`npm run lint` 通过；`npm run build` 通过，保留 Vite chunk 体积提示；`rg -n "crypto\.randomUUID|randomUUID" src package.json vite.config.ts` 未发现直调。
- 后续：后续若要接入 AI 生成文案，仍应保持手动触发和确认写入；自动低频调度需另开一轮设计。

## 2026-05-10 微信聊天语音未读红点

- 范围：只改微信/QQ 共用聊天房间里的通用语音消息能力，未改 QQ 专属逻辑，未改生活事件时间线、锁屏、通知中心、查手机或主动事件。
- 原因：继续优化微信聊天体验，选择“语音条未读红点”作为小闭环，避免把 `ChatScreen.tsx` 继续堆大。
- 内容：新增 `src/apps/wechat/chat/voiceUnread.ts` 和 `voiceUnread.test.ts`，定义模型语音未听判断和播放后标记；新增 `src/apps/wechat/chat/VoiceMessageBubble.tsx`，承接语音条播放态、转文字按钮和未听红点 UI；`ChatScreen.tsx` 只负责接线；`src/store.ts` 增加 `voicePlayedAt` 可选字段和 `markVoiceMessagePlayed` action，persist version 升到 44 并迁移旧聊天消息。
- 文档：同步 `docs/wechat.md`、`PROJECT_OUTLINE.md` 和本工作记录。
- 验证：先运行 `npx tsx src/apps/wechat/chat/voiceUnread.test.ts` 失败，原因是 `voiceUnread` 模块尚不存在；实现后该测试通过。`npx tsx src/apps/appsStructure.test.ts` 通过；全部 `src/**/*.test.ts` 通过，保留 Node 环境中 zustand storage unavailable 提示；`npm run lint` 通过；`npm run build` 通过，保留 Vite chunk 体积提示；`rg "crypto\.randomUUID|randomUUID" src` 未发现源码直调。
- 后续：语音条后续可继续做更细的触摸反馈；多选/转发、图片理解、收藏分类和角色独立预设仍可作为后续独立小闭环。

## 2026-05-10 微信界面主题收敛

- 范围：只改微信界面颜色来源和微信组件 class；未改 QQ 专属逻辑，未改生活事件时间线、锁屏、通知中心、查手机或主动事件。
- 原因：微信内部部分入口图标、文字、箭头、按钮、生活卡片和红点仍使用固定红黄蓝绿，和外层奶油/哥特主题不协调。
- 内容：`src/index.css` 的 `--wechat-*` 变量改为从外层 `--phone-bg`、`--phone-text`、`--panel-bg`、`--accent` 派生；微信入口方块、我页图标、未读红点、语音红点、生活卡片、撤回/收藏工具和输入栏按钮统一吃微信主题变量；`WeChatChats`、`WeChatContacts`、`WeChatMe` 去掉硬编码文字/箭头色；`ChatScreen` 微信聊天背景和发送按钮改由主题 class 控制。
- 文档：同步 `docs/wechat.md` 和本工作记录。
- 验证：`npx tsx src/apps/wechat/chat/voiceUnread.test.ts` 通过，保留 Node 环境中 zustand storage unavailable 提示；`rg "crypto\.randomUUID|randomUUID" src` 未发现源码直调。`npx tsx src/apps/appsStructure.test.ts`、`npm run lint`、`npm run build` 当前均失败在非本轮范围的 `src/apps/peek/peekLogic` 缺失，导致 `src/apps/diary/PeekScreen.tsx` 无法解析 `../peek/peekLogic`；因此未能启动可用页面做浏览器视觉烟测。
- 后续：恢复全量验证前，需要先补回或修复查手机模块的 `src/apps/peek/peekLogic`。

## 2026-05-10 锁屏和通知中心最小版本

- 范围：只改手机壳层锁屏、通知中心、桌面/Dock 角标和通知派生工具；未改生活事件时间线、查手机、微信聊天优化或主动事件业务逻辑。
- 原因：让小手机进入项目时先呈现真实手机壳体验，并从现有 App 数据生成最小可用提醒。
- 内容：新增 `src/shell/notifications.ts` 和 `src/shell/notifications.test.ts`，从 `chatSessions.unread`、未接/未接通电话、`calendarEvents.reminderAt`、`memos.reminderAt` 派生通知和 App 角标；`src/App.tsx` 新增 `LockScreen`、`NotificationCenter`、`NotificationCard`，通知点击只进入对应 App 入口；`src/index.css` 增加锁屏、通知中心、通知卡片和角标样式，保持奶油手绘和哥特玻璃主题风格。
- 文档：同步 `PROJECT_OUTLINE.md`、`docs/life-system-framework.md` 和本工作记录。
- 验证：`npx tsx src/shell/notifications.test.ts` 先因模块缺失失败，落地后通过；`npx tsx src/apps/appsStructure.test.ts` 通过；全量 `src/**/*.test.ts` 中仅 `src/shell/appCatalog.test.ts` 失败，原因是当前工作区已有 `active-events` 桌面图标导致测试仍期望 15 个桌面 App、实际 16 个；`npm run lint` 失败于现有 `src/apps/active-events/ActiveEventsScreen.tsx` 的 `JSX` 命名空间和 JSX `key` 类型问题；`npm run build` 通过，保留 Vite chunk 体积提示；`rg -n "crypto\.randomUUID|randomUUID" src` 无命中；Codex in-app browser 没有可用 `iab` 实例，视觉烟测未能执行。
- 后续：如果继续做通知，应先决定是否把生活事件时间线并入通知来源；若要恢复全量验证，需要先处理现有 `active-events` 与 app catalog 测试不一致的问题。

## 2026-05-10 通知入口位置调整

- 范围：只改手机壳层通知入口显示规则和样式。
- 原因：桌面顶部居中的通知入口遮挡主界面，需要减少存在感，并且进入其他 App 后不应继续显示。
- 内容：`src/App.tsx` 改为只在 `activeScreen === 'desktop'` 时渲染通知入口和通知中心；`src/index.css` 把通知入口缩小为左上角小胶囊，减少遮挡。
- 文档：追加本工作记录。
- 验证：`npx tsx src/shell/notifications.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，保留 Vite chunk 体积提示；`rg -n "crypto\.randomUUID|randomUUID" src` 无命中。
- 后续：若仍觉得桌面左上角占位明显，可进一步改成第二页的系统 App 图标入口。

## 2026-05-11 查手机二级界面

- 范围：只改查手机读取、展示和共享 UI 类型声明；未改生活事件时间线、锁屏、通知中心、微信聊天优化或主动事件。
- 原因：查手机首页摘要不够，点进每个模块应能看到类似角色手机 App 的具体界面。
- 内容：`src/apps/peek/peekLogic.ts` 为每个查手机模块输出详情条目 `items`，生成态也提供可进入的角色手机痕迹；`src/apps/diary/PeekScreen.tsx` 改成首页模块按钮 + 二级详情页，聊天像聊天卡片，相册像照片格子，日记/日历/备忘/浏览器/小红书/音乐显示列表卡片；`src/apps/shared/AppPrimitives.tsx` 补 `Panel` 的 `key` 类型声明以通过现有 JSX 用法。
- 文档：同步 `PROJECT_OUTLINE.md`、`docs/life-system-framework.md`、`docs/diary-plan.md`、`模块/日记/README.md` 和本工作记录。
- 验证：`npx tsx src/apps/peek/peekLogic.test.ts` 先失败在详情条目不存在，补 `items` 后通过；`npx tsx src/apps/appsStructure.test.ts` 通过；全部 `src/**/*.test.ts` 通过，保留 Node 环境中 zustand storage unavailable 提示；`npm run lint` 通过；`npm run build` 通过，保留 Vite chunk 体积提示；`rg -n "randomUUID|crypto\.randomUUID" src` 未发现源码直调；`http://127.0.0.1:3002/` HTTP 200。
- 后续：如果需要更像原生 App，可继续给每个二级页做独立导航栏和更贴近微信/相册/浏览器的视觉细节。

## 2026-05-11 预设 App 统一管理各软件提示词

- 范围：只改预设页、各软件提示词读取点和 `src/store.ts` 预设字段；未改各 App 的核心生成流程。
- 原因：玩家需要在“预设”App 里集中查看和自由修改微信/QQ、浏览器、小红书、B站、电话、音乐写歌等软件预设，而不是分散在各 App 内部。
- 内容：`src/apps/system/SystemScreens.tsx` 的 `PresetsScreen` 改为按软件分卡片编辑预设名称和内容，并保留微信内置聊天预设套用；`src/store.ts` 新增 `defaultSoftwarePresets` 以及 `xiaohongshuPreset*`、`bilibiliPreset*`、`phonePreset*`、`musicPreset*` 字段，persist version 升到 45；`BilibiliScreen` 改读 B站专属预设；`XiaohongshuApp` 刷新生成时把小红书预设传入生成逻辑；`PhoneScreen` 电话回复读电话预设；`MusicScreen` char 写歌读音乐预设；`AppPrimitives.Panel` 类型兼容 JSX key。
- 文档：同步 `PROJECT_OUTLINE.md` 和本工作记录。
- 验证：`npm run lint` 通过；全部 `src/**/*.test.ts` 通过，保留 Node 环境中 zustand storage unavailable 提示；`npm run build` 通过，保留 Vite chunk 体积提示；`rg -n "crypto\.randomUUID|randomUUID" src` 无命中。
- 后续修正（2026-08-07）：导入与完整条目管理已经统一迁到桌面“预设”App；微信“我”里不再保留重复编辑器。

## 2026-05-11 P5R 红黑主题调整

- 范围：只改红黑主题视觉和主题选项文案；奶油手绘主题变量未修改。
- 原因：原红色主题偏灰、偏玻璃；用户希望参考 `D:/zip (2).zip` 的主题变量、粗边框和卡片化语言，做得更接近 P5R 的黑白高对比和鲜红斜切感。
- 内容：`src/index.css` 将 `.theme-gothic` 调整为红色主视觉、黑白斜切、白色半调点阵和粗黑边硬卡片；桌面图标、Dock、时间卡片、锁屏背景、按钮阴影统一使用黑/白/红；锁屏时隐藏红黑主题手机壳伪状态栏，避免和锁屏自己的时间/WiFi 重叠；`src/App.tsx` 和 `src/apps/system/SystemScreens.tsx` 将该主题显示名改为 `P5R 红黑`。
- 文档：追加本工作记录。
- 验证：`npx tsx src/apps/appsStructure.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，保留 Vite chunk 体积提示；`rg -n "crypto\.randomUUID|randomUUID" src` 无命中；生成截图 `qa-screenshots/57-p5r-red-theme-reference-lock.png`。
- 后续：如果还想更像“怪盗菜单”，下一步可单独做主题页/桌面图标的斜切排版，但仍应避免影响奶油主题。

### 2026-05-11 红黑主题收敛修正

- 原因：上一版过度使用点阵、粗斜条和白色块，视觉噪音过强。
- 内容：`src/index.css` 在红黑主题末尾追加收敛覆盖：减少点阵密度，改成大面积黑底 + 两条红色斜切；卡片、按钮、Dock 和图标统一为黑底白边红阴影，去掉大面积白色卡片和过度倾斜。
- 验证：`npm run lint` 通过；`npm run build` 通过，保留 Vite chunk 体积提示；生成截图 `qa-screenshots/58-p5r-red-theme-calm-lock.png`。

## 2026-05-11 古风手札主题与主题目录

- 范围：只改主题系统视觉、主题文案和主题目录说明；未改聊天、通知、锁屏、查手机、主动事件的数据逻辑。
- 原因：新增古风主题，并按要求把主题资源迁到独立目录，避免继续把完整主题堆在业务入口或全局 CSS 里。
- 内容：新增 `src/themes/themeOptions.ts` 管理主题 ID、类型和主题页预览文案；新增 `src/themes/guofeng.css`，为 `guofeng` 主题覆盖手机壳背景、锁屏、桌面图标、Dock、通知入口、通知卡片、通用卡片/按钮/输入框、微信/QQ 聊天变量和生活卡片视觉；`src/main.tsx` 导入独立主题 CSS；`src/store.ts` 从主题目录复用 `ThemeType`。
- 文档：同步 `PROJECT_OUTLINE.md` 和 `模块/主题/README.md`，记录 `src/themes/` 作为主题系统目录。
- 验证：`npm run lint` 通过；`npm run build` 通过，保留 Vite chunk 体积提示；本地 dev server 跑在 `http://127.0.0.1:3004/`，生成截图 `qa-screenshots/59-guofeng-lock.png`、`qa-screenshots/60-guofeng-desktop.png`、`qa-screenshots/61-guofeng-wechat-chat.png`、`qa-screenshots/62-guofeng-themes.png`。
- 后续：如继续新增主题，优先新增 `src/themes/<theme>.css` 并只在 `themeOptions.ts` 登记文案和 ID。
## 2026-05-11 古风主题方向修正

- 范围：只改主题展示文案和主题说明文档；未改业务逻辑或持久化数据结构。
- 原因：上一版文案和方向过于西式奇幻感，不符合“古风”预期。
- 内容：`src/themes/themeOptions.ts` 将 `guofeng` 说明改为宣纸米白、墨色文字、朱砂点印、黛青淡纹；`模块/主题/README.md` 同步主题定位。
- 验证：后续随本轮统一运行 `npm run lint` 和 `npm run build`。

## 2026-05-11 古风软件器物化加强

- 范围：只加强古风主题视觉和主题目录说明；未改聊天、通知、锁屏、查手机、主动事件的数据逻辑；奶油主题未改动。
- 原因：上一版古风辨识度仍偏弱，桌面软件只是通用图标换色，不像古风变体。
- 内容：`src/App.tsx` 为桌面和 Dock 图标补 `data-screen` 视觉钩子；`src/themes/guofeng.css` 将古风主题软件图标改为书札/器物/印章字标，例如微信为“简”、音乐为“笛”、日记为“卷”、预设为“印”、主题为“染”，并补宣纸格线、手札印章和更明确的朱砂点印；移除不符合当前目标的旧主题登记和导入。
- 文档：同步 `PROJECT_OUTLINE.md` 和 `模块/主题/README.md`，主题页只保留奶油、P5R 红黑、古风手札。
- 验证：`npm run lint` 通过；`npm run build` 通过，保留 Vite chunk 体积提示；本地 dev server 跑在 `http://127.0.0.1:3005/`，生成截图 `qa-screenshots/68-guofeng-wechat-list-fresh.png`、`qa-screenshots/71-guofeng-themes-three-only.png`、`qa-screenshots/72-guofeng-desktop-final.png`。

## 2026-05-11 三主题全软件截图与微信输入 QA

- 范围：对奶油、P5R 红黑、古风手札三套主题做全软件截图和微信输入冒烟；奶油主题只检查不调整，P5R 和古风只做视觉修正。
- 原因：需要确认三个主题下每个桌面软件、Dock 软件、锁屏、桌面和微信文字/语音输入都能正常打开和显示。
- 内容：P5R 假状态栏限制在桌面显示，避免压住各软件标题和返回按钮；古风补齐浏览器、小红书、B站等独立样式软件的宣纸/朱砂/黛青视觉覆盖；移除和三主题目标冲突的旧主题入口、导入和空目录。
- 验证：`npm run lint` 通过；`npm run build` 通过，保留 Vite chunk 体积提示；本地 dev server 跑在 `http://127.0.0.1:3005/`；通过真实桌面点击打开每个软件并生成 `qa-screenshots/full-theme-qa-2026-05-11-v2/` 共 84 张截图，QA 汇总在 `qa-screenshots/full-theme-qa-2026-05-11-v2/qa-report.json`。
- 微信：三套主题均从桌面点开微信、进入测试联系人聊天、发送文字、打开加号面板、切换语音条并发送语音文字；`textSent`、`plusPanelOpened`、`voiceModeOpened`、`voiceSent` 均为 true。

## 2026-05-11 NAI 生图、相册去重和凯尔特主题恢复

- 范围：新增共享 NAI 生图能力、微信/小红书生图入口、相册去重和 `generated` 来源、凯尔特主题视觉；未改聊天、通知、锁屏、查手机、主动事件的数据结构和写入规则。
- 原因：用户需要用 NAI API 验证小红书、微信和 char 主动发图链路，并恢复优化凯尔特主题，同时修正微信键盘呼出后聊天记录保持可见。
- 内容：新增 `src/lib/naiImage.ts`，支持 NovelAI 图片接口、PNG/ZIP 返回解析和超时错误；`SettingsScreen` 接入生图配置和测试按钮；`ChatScreen` 增加微信加号菜单 AI 生图、char `[image prompt="..."]` 动作、聚焦/visualViewport 滚到底；`XiaohongshuApp` 发布页增加 NAI 封面生成并同步相册；`store.ts` persist version 升到 46，新增 `imageGenerationConfig`、`image` 日志类型、相册 URL 去重和 `generated` 来源；`App.tsx` 42 教程补作者/平台/性质/适用人群文案；新增 `src/themes/celtic-paladin/index.css` 并恢复主题选项。
- 文档：同步 `PROJECT_OUTLINE.md`、`模块/主题/README.md` 和本工作记录。
- 验证：临时使用用户提供的 NAI key 直连 `https://image.novelai.net/ai/generate-image` 成功，返回二进制图片包并解出 `qa-screenshots/nai-api-test-2026-05-11/nai-connectivity.png`；`npx tsx src/apps/wechat/ai/wechatAiMessages.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，保留 Vite chunk 体积提示；本地 dev server 跑在 `http://127.0.0.1:3005/`；凯尔特主题和 AI UI 截图在 `qa-screenshots/celtic-and-ai-2026-05-11/`。
- QA 记录：真实 NAI 直连成功；微信用户侧 AI 生图在浏览器中成功写入图片气泡；小红书生图、char 微信 `[image]` 发图用拦截的 NAI PNG 响应验证 UI/store 链路成功；主动事件刷新生成 3 条建议；微信输入框 focus 后消息列表保持底部可见。

## 2026-05-11 生图设置归位、锁屏壁纸和社区验证配置

- 范围：只改扩展设置、锁屏展示、相册壁纸入口、默认主题和社区验证配置；未改聊天、通知、查手机或主动事件业务逻辑。
- 原因：生图应集中在设置页统一配置；玩家需要从相册替换锁屏壁纸；新用户默认主题应为奶油手绘；没有自定义锁屏时需要内置小人图；社区验证需要记录 Discord 回调和身份组。
- 内容：`src/lib/naiImage.ts` 增加 `promptPreset` 通用正向提示串并在请求前拼接；`SettingsScreen` 的生图页明确作为全局 NAI 配置入口，补通用正向提示串；新增社区验证页，保存回调地址、目标社区和 `类脑/旅程/世界树` 身份组；`store.ts` persist version 升到 47，默认主题改为 `pastel`，新增 `communityVerificationConfig`；`LockScreen` 在没有用户壁纸时展示内置小人锁屏图；`GalleryScreen` 详情页增加“设为锁屏/默认锁屏”。
- 文档：同步 `PROJECT_OUTLINE.md` 和本工作记录。
- 验证：`npm run lint` 通过；`npx tsx src/apps/wechat/ai/wechatAiMessages.test.ts` 通过；`npm run build` 通过，保留 Vite chunk 体积提示；生成截图 `qa-screenshots/settings-wallpaper-community-2026-05-11/`，报告在同目录 `qa-report.json`。

## 2026-05-11 社区验证门禁修正和默认锁屏资产归位

- 范围：只改启动门禁和默认锁屏资产读取；不改聊天、通知、查手机、主动事件业务逻辑。
- 原因：社区验证不能只是配置项，未验证时不应直接进入小手机；默认锁屏不应由代码临时画图，应读取玩家提供的内嵌图片资产。
- 内容：`App` 启动时先读取 `communityVerificationConfig.requiredGroups` 与 `verifiedGroups`，未满足 `类脑/旅程/世界树` 等必需身份组时渲染社区验证门，不进入锁屏/桌面；门禁可读取当前 URL 的 `groups/discord_groups/roles` 参数，也可粘贴 Discord 返回的身份组文本验证。默认锁屏图片改为优先读取 `/default-lock-wallpaper.png`，如果项目未放该图片则只显示主题背景，不再代码绘制小人。
- 文档：同步 `PROJECT_OUTLINE.md` 和本工作记录。
- 验证：`npm run lint` 通过；生成截图 `qa-screenshots/community-gate-2026-05-11/community-gate.png`，确认新档首屏显示社区验证并列出身份组。
## 2026-05-14 锁屏、相册、预设与 char 主动整理

- 范围：只调整锁屏视觉、相册上传/入口体验、预设管理、小剧场默认世界书导入、char 主动入口和凯尔特主题视觉；不改微信/通知/查手机/主动事件的数据写入规则。
- 原因：锁屏需要按主题呈现不同气质；相册上传流程过杂；玩家需要把 `D:\useruser (3).json` 默认带入小剧场；预设需要多条目并区分 system/user/assistant；char 主动需要独立软件入口；凯尔特主题需要更明确的西幻手札风格。
- 内容：新增 `src/apps/theater/defaultUseruserWorldBook.ts` 并接入小剧场默认世界书；相册首页改为“相簿 + 标签 + 选择照片”的轻量导入规则；预设支持每个软件多条目、当前启用条目和发送身份；桌面第二页新增 `char主动` 软件；古风、P5R、凯尔特西幻和奶油默认锁屏各自有主题化默认样式；凯尔特主题改为羊皮纸、银蓝符文、深林绿和细金属边。
- 验证：`npm run lint` 通过；`npm run build` 通过，保留 Vite chunk 体积提示；`npx tsx src/apps/gallery/galleryLogic.test.ts`、`npx tsx src/apps/theater/theaterLogic.test.ts`、`npx tsx src/apps/appsStructure.test.ts` 均通过；手机视口 390x844 生成 QA 截图 `qa-screenshots/theme-gallery-preset-v11-2026-05-14-clean/`，覆盖四个主题锁屏、相册、预设、小剧场、char 主动和桌面第二页；真实滑动翻页测试可从第一页左滑到第二页。

## 2026-05-14 整机验收、返回适配与 APK v12

- 范围：修正全屏软件返回入口，刷新移动端 WebView 内容，并完成四主题、三尺寸、全软件整机验收。
- 原因：微信、小红书、B站和浏览器是自定义全屏软件，缺少统一外层返回入口时会出现“点进去回不来”的手机端问题；同时需要确认微信输入、相册、AI 上下文和桌面翻页在不同手机尺寸下都能使用。
- 内容：`src/App.tsx` 为微信、小红书、B站、浏览器增加 shell 级悬浮返回键；`src/index.css` 补齐返回键样式并跟随主题变量；默认锁屏不再请求缺失的 `/default-lock-wallpaper.png`，没有玩家壁纸时只使用主题化锁屏背景；`mobile-export/app.json` Android `versionCode` 升到 12；刷新 `mobile-export/web-content.js` 和 `mobile-export/web.html`。
- 验证：`npm run lint` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示；`node scripts/qa-v12.mjs` 通过，报告为 276 项检查、0 失败，覆盖 360x740、390x844、430x932，四主题，桌面滑动翻页、21 个软件入口/返回、微信文字/语音输入、相册与 AI 上下文联动。
- 打包：EAS Android preview 构建成功，build id `19ef86d7-89b1-44a2-a133-855f27c773b7`；APK 下载为 `小手机-v12-整机验收返回适配.apk`，SHA256 `405361C8DC2064A49E828F5FA56256B8BD090325B52115A25E9D3A9A5AB46D13`。
## 2026-05-29 移除启动社区验证门禁

- 范围：只改小手机启动门禁、移动端按钮可访问名称和项目维护说明；未改聊天、通知、查手机、主动事件或社区验证设置页的数据结构。
- 原因：本轮需要去掉进入小手机前的验证拦截，方便直接进入手机模式做各区域和聊天链路测试。
- 内容：`src/App.tsx` 不再读取 `communityVerificationConfig` 计算 Discord/后门验证状态，也不再在未验证时渲染 `CommunityGate`；应用启动后直接进入锁屏流程。巡检发现相册等页面的图标返回键没有可访问名称后，补齐公共 Header、相册/音乐 Header 和微信输入区加号/发送按钮的 `aria-label`。`PROJECT_OUTLINE.md` 同步记录社区验证配置仍保留为旧数据兼容和设置项，但不再作为启动门禁。
- 文档：同步 `PROJECT_OUTLINE.md` 和本工作记录。
- 验证：`npm run lint` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示；`rg -n "crypto\.randomUUID|randomUUID" src` 无命中；本地 dev server 跑在 `http://localhost:3000/`。390x844 视口确认首屏直接进入锁屏、无社区验证门禁；22 个桌面/Dock 入口均可打开并返回，无 `小手机界面崩了`，页面控制台无 error；DeepSeek 设置页成功拉取 2 个模型并选中 `deepseek-v4-flash`，微信聊天发送测试消息后收到 DS 回复 `DS聊天正常。`；复查相册返回键与微信加号/发送按钮已有可访问名称。
- 后续：如果发布包也要彻底移除社区验证设置页和后端接口，可单独清理 `CommunityGate`、`api/community/backdoor/*` 和设置页社区配置。
## 2026-05-30 古风锁屏印章和全软件手机视口复测

- 范围：只改古风主题锁屏默认背景印章；未改业务状态、聊天逻辑、模型配置或软件入口。
- 原因：锁屏右上角印章把“手机手札”四个字塞进竖排小框里，手机视口下文字重叠，看起来不自然。
- 内容：`src/themes/guofeng/index.css` 将默认锁屏印章收敛为两字“手札”，并明确竖排 `34px x 48px`、居中、无内边距，避免高优先级锁屏规则和通用锁屏印章规则叠加后挤字。
- 文档：追加本工作记录。
- 验证：390x844 视口截图 `qa-screenshots/mobile-smoke-2026-05-30/01-guofeng-lock-seal-fixed-390x844.png` 确认印章不再重叠；同视口依次打开微信、QQ、相册、日历、日记、备忘录、查手机、小红书、B站、小剧场、音乐、浏览器、预设、AI上下文、报错、char主动、数据备份、User信息、电话、设置、通讯录、主题，均可进入并返回，无 `小手机界面崩了`，页面控制台无 error；`npm run lint` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示；`rg -n "crypto\.randomUUID|randomUUID" src` 无命中。

## 2026-05-30 生成链路手机视口复测和提示词清洗

- 范围：复测各软件生成/刷新入口，并只修复生成展示中的内部提示词外露和按钮可访问名称；未改模型配置、API key、持久化结构或真实生图额度逻辑。
- 原因：手机视口复测发现小红书、B站和微信朋友圈生成成功但会把角色卡全文、`<character_design_complex>`、发布风格和预设提示片段露到用户正文/状态里。
- 内容：`src/apps/xiaohongshu/xiaohongshuLogic.ts` 增加生成内容清洗，过滤角色卡、提示词和小红书预设说明；`src/apps/bilibili/bilibiliLogic.ts` 将角色卡刷新词收敛为公开短关键词，避免完整角色卡进入标题和状态；`src/apps/wechat/moments/momentsLogic.ts` 对新旧朋友圈内容增加展示层兜底清洗；`src/apps/phone/PhoneScreen.tsx` 补齐电话模块 Header 返回按钮 `aria-label`；`src/App.tsx` 给通知中心关闭按钮补 `aria-label`。
- QA：390x844 视口跑通微信 DS 聊天请求回复、小红书刷新世界、B站刷新、浏览器搜索页生成、小剧场生成、日记生成、电话听回复、char 主动刷新、微信朋友圈刷一下；均未卡在生成中。生图/音乐类真实外部生成未额外消耗额度，只确认已配置入口不影响主流程。
- 截图：`qa-screenshots/generation-smoke-2026-05-30/` 保存本轮关键截图，包含 `08-wechat-ds-reply-390x844.png`、`10-xhs-refresh-sanitized-390x844.png`、`11-bilibili-refresh-sanitized-390x844.png`、`12-moments-refresh-sanitized-390x844.png`。
- 验证：`npm run lint` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示；最终复测确认小红书、B站、朋友圈不再出现 `<character...>`、角色卡字段、发布风格或小红书预设说明等内部文本。

## 2026-06-15 微信重复回复、NAI 代理、char 主动生图和多玩家档案

- 范围：只改微信/QQ 共用聊天触发、微信 AI 生图动作提示、NAI 生图代理、char 主动建议、多玩家 User 信息档案、相关文档和测试；未改角色卡解析、查手机、主题视觉或 Discord 社区验证逻辑。
- 原因：外部反馈指出文字聊天像“点了没用/一直重复”，角色主动功能不会主动生图，且需要记录并实现多 user / 多玩家角色设定；同时补上可由服务端托管 NAI key 的代理入口，避免把 key 写进 APK。
- 内容：`src/apps/wechat/chat/wechatInteraction.ts` 让文字和语音也默认触发回复，并继续用 `getReplyHistoryMessages` 排除待回复消息，避免重复塞入 AI 历史；`src/apps/wechat/ai/wechatAi.ts` 明确 `[image prompt="..."]` 的低频主动发图场景；`src/apps/active-events/activeEventsLogic.ts` 新增 `send_image` 建议，`ActiveEventsScreen` 在用户确认后调用 NAI、写入微信图片消息并保存相册；`src/lib/naiImage.ts` 支持识别 `/api/nai/generate-image` 代理并允许服务端托管 key；新增 `api/nai/generate-image.js` 和 `vercel.json` CORS 配置；`src/store.ts` persist version 升到 54，增加 `userProfiles`、`activeUserProfileId` 和玩家档案增删改切换 actions；`UserInfoScreen` 增加多玩家档案列表。
- 文档：同步 `PROJECT_OUTLINE.md`、`docs/life-system-framework.md`、`docs/wechat.md`、`docs/小手机配置与使用教程.md` 和本工作记录。
- 验证：新增并通过 `npx tsx src/apps/wechat/chat/wechatInteraction.test.ts`、`npx tsx src/apps/wechat/ai/wechatAi.test.ts`、`npx tsx src/apps/active-events/activeEventsLogic.test.ts`、`npx tsx src/lib/naiImage.test.ts`；`npx tsx src/apps/user-info/userProfilePrompt.test.ts` 和 `npx tsx src/apps/appsStructure.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示；`rg -n "crypto\.randomUUID|randomUUID" src package.json vite.config.ts` 无命中；本地 dev server 跑在 `http://127.0.0.1:3000/`，390x844 视口确认锁屏、桌面第二页、User 信息页和 char 主动页可打开。
- 后续：真实 NAI token 不写入仓库；部署代理时把 key 配到服务端 `NAI_API_KEY` 或 `NOVELAI_API_KEY`。如果 APK 内置 WebView 要使用代理，需要在设置页填写完整公网代理地址，而不是相对路径。

## 2026-06-15 API 未连接提示与 NAI 本机复测

- 范围：只改微信聊天 API 未连接提示、电话 API 未连接提示、微信 AI 固定兜底清理、相关文档和测试；不改 NAI 请求参数、角色卡解析、主题或持久化结构。
- 原因：外部反馈指出玩家在没有真正连上 API 时会看到固定回复，容易误以为已经接入 API；同时需要用本地环境复测 NovelAI 生图是否能真实返回图片。
- 内容：`src/apps/wechat/ai/wechatAi.ts` 新增 `getWeChatApiConnectionIssue` 并删除旧 `fallbackWeChatReply`；`ChatScreen` 在发送角色回复前检查接口地址和模型，缺失时写错误日志并显示重试条，不再写固定本地回复；`PhoneScreen` 新增 `getPhoneApiConnectionIssue`，电话缺少 API 或请求失败时只显示原因，不再追加本地固定台词；同步 `docs/wechat.md`、`docs/小手机配置与使用教程.md`、`PROJECT_OUTLINE.md` 和本工作记录。
- NAI 复测：临时使用用户提供的 NAI key 只作为当前进程环境变量直连 `https://image.novelai.net/ai/generate-image`，没有写入仓库或配置文件。Node fetch、`Test-NetConnection image.novelai.net -Port 443` 和 `curl.exe -I https://image.novelai.net/ai/generate-image --connect-timeout 15` 均在本机到 `image.novelai.net:443` 连接阶段超时；本轮没有生成出真实图片，结论是当前本机网络连不到 NovelAI 图片域名，不能证明 key 或模型可用。
- 验证：`npx tsx src/apps/wechat/ai/wechatAi.test.ts`、`npx tsx src/apps/phone/phoneViews.test.ts`、`npx tsx src/apps/wechat/chat/wechatInteraction.test.ts`、`npx tsx src/lib/naiImage.test.ts`、`npm run lint` 和 `npm run build` 均通过，构建仅保留 Vite chunk 体积提示；本地 dev server `http://127.0.0.1:3000/` 返回 200，并用 390x844 视口打开小手机锁屏，页面未崩溃，仅保留一个既有 404 资源错误。

## 2026-06-15 API 错误码直显、NAI 多次复测和通知避让

- 范围：只改 API 错误展示、NAI 本机复测记录、桌面/锁屏通知避让样式、相关文档和测试；不改角色卡解析、NAI key 保存方式、模型参数或主动事件业务规则。
- 原因：需要把服务商实际返回的 400/401/429/500 等错误码直接放到报错里，而不是只显示未连接或泛化失败；同时继续多次测试 NovelAI 生图，并修正部分手机上通知按钮/通知层靠上遮住软件的问题。
- 内容：新增 `src/lib/httpErrors.ts` 和测试，统一把 HTTP 响应整理成 `HTTP xxx` 文本；微信/QQ 聊天失败重试条会用红色码块显示实际 `HTTP 400` 等错误码；通用聊天、电话、音乐聊天、设置拉模型、系统设置拉模型、NAI 生图和旧 App 内部请求均改为抛出实际 HTTP 状态码。`src/index.css`、`src/themes/guofeng/index.css` 和 `src/themes/gothic/index.css` 按 `env(safe-area-inset-top/bottom)` 调整通知按钮、通知中心、锁屏通知栈和桌面顶部避让，降低小屏/刘海屏遮挡。
- NAI 多次复测：临时使用用户提供的 NAI key 作为当前进程环境变量，连续 5 次直连 `https://image.novelai.net/ai/generate-image`。5 次均未拿到 HTTP 400/500 等服务端状态码，全部在连接阶段失败：`UND_ERR_CONNECT_TIMEOUT`，提示 `Connect Timeout Error (attempted address: image.novelai.net:443, timeout: 10000ms)`；结果保存到 `qa-screenshots/nai-multi-2026-06-15/nai-multi-results.json`。随后 DNS 能解析 `image.novelai.net`，但 `Test-NetConnection image.novelai.net -Port 443` 连续 2 次 `TcpTestSucceeded: false`。
- 验证：`npx tsx src/lib/httpErrors.test.ts`、`npx tsx src/lib/naiImage.test.ts`、`npx tsx src/apps/phone/phoneViews.test.ts`、`npm run lint` 和 `npm run build` 均通过，构建仅保留 Vite chunk 体积提示；本地 dev server `http://127.0.0.1:3000/` 返回 200；用 360x640 和 390x844 两个手机视口打开桌面，通知按钮与前 8 个软件入口矩形重叠数为 0，截图保存为 `qa-screenshots/api-nai-local-2026-06-15/desktop-notification-360x640.png` 和 `desktop-notification-390x844.png`。

## 2026-06-19 QQ 消息入口、联系人主页和四页签骨架

- 范围：只改 QQ 入口、QQ 逻辑测试、QQ 专属样式和 QQ 文档；未改微信、日记、相册、音乐、小红书、B站、电话或主动事件业务逻辑。
- 原因：QQ 导入角色后缺少清晰的 QQ 发消息入口，整体结构也需要贴近现实 QQ 的“消息 / 频道 / 联系人 / 动态”。
- 内容：`QQScreen` 增加四个 QQ 页签；“消息”页保留最近聊天和 QQ 私聊入口；“联系人”页展示已导入角色，点击头像进入 QQ 个人主页；QQ 个人主页新增“发 QQ 消息”，调用 `openChat(characterId, "qq")` 进入共享聊天房间。`qqLogic.ts` 增加 QQ 页签和资料页摘要工具，`qqLogic.test.ts` 覆盖页签和主页文案；`src/index.css` 增加 `.qq-*` 范围样式。
- 文档：同步 `PROJECT_OUTLINE.md`、`模块/QQ/README.md` 和本工作记录。
- 验证：`npx tsx src/apps/qq/qqLogic.test.ts` 通过；`npx tsx src/apps/appsStructure.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示。浏览器插件因本机策略阻止访问 `http://127.0.0.1:3000`，本轮未做可视化点击验收。

## 2026-06-19 QQ 现实界面外观调整

- 范围：只改 QQ 入口和 QQ 专属样式；未改聊天发送引擎、微信、其他 App 或持久化结构。
- 原因：需要参考现实移动 QQ，把小手机里的 QQ 从普通顶部页签改成更像 QQ 的消息首页和底部导航。
- 内容：`QQScreen` 撤掉顶部页签，改为底部“消息 / 频道 / 联系人 / 动态”导航；顶部改为蓝色 QQ 风格顶栏、在线头像、加号和圆角搜索；消息页保留“新朋友 / 群聊 / 空间”快捷入口和白底消息列表；联系人页增加“好友 / 群聊 / 设备 / 通讯录”分段；频道和动态页改为 QQ 风格入口骨架。`src/index.css` 只追加和调整 `.qq-*` 规则。
- 验证：`npx tsx src/apps/qq/qqLogic.test.ts` 通过；`npx tsx src/apps/appsStructure.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示。

## 2026-06-19 QQ 顶栏和消息页反馈修正

- 范围：只改 QQ 入口和 QQ 专属样式；未改聊天发送引擎、微信、其他 App 或持久化结构。
- 原因：蓝色顶栏与小手机整体风格不统一，白色返回键在浅背景下不清楚，消息页顶部“新朋友 / 群聊 / 空间”快捷卡不符合现实 QQ 的主消息页结构。
- 内容：`QQScreen` 移除消息页顶部三张快捷卡，保留右上角加号作为添加入口；`src/index.css` 把 QQ 顶栏收敛为白底、深色返回键、蓝色加号和蓝色选中态，降低大面积蓝色占比并提升返回键可读性。
- 验证：`npx tsx src/apps/qq/qqLogic.test.ts` 通过；`npx tsx src/apps/appsStructure.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示。

## 2026-06-19 QQ 主界面拆分和消息页修正

- 范围：只改 QQ 入口、QQ 组件拆分、QQ 专属样式和 QQ 文档；未改聊天发送引擎、微信、其他 App 或持久化结构。
- 原因：QQ 主界面需要按“消息 / 频道 / 联系人 / 动态”拆成独立文件，消息页优先完善；顶栏不应硬编码 Q，应该跟随 User 信息头像和昵称；底部导航不应在手机底部留下空隙。
- 内容：新增 `QQHeader.tsx`、`QQMessages.tsx`、`QQContacts.tsx`、`QQChannels.tsx`、`QQDynamic.tsx`、`QQProfile.tsx`；`QQScreen.tsx` 瘦身为 QQ 外壳和导航分发；`qqLogic.ts` 增加 `buildQqHeaderSummary`，让顶栏读取 `userName/userAvatar`；消息页行改为更接近 QQ 的名字/时间/预览布局；`.qq-home-screen` 改为 header/content/bottom-nav 三段 flex 布局，修正底部留白。
- 文档：同步 `PROJECT_OUTLINE.md`、`模块/QQ/README.md` 和本工作记录。
- 验证：`npx tsx src/apps/qq/qqLogic.test.ts` 通过；`npx tsx src/apps/appsStructure.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示。

## 2026-06-19 QQ 消息页搜索和右上角菜单

- 范围：只改 QQ 消息页、QQ 顶栏、QQ 逻辑测试和 QQ 专属样式；未改聊天发送引擎、微信、其他 App 或持久化结构。
- 原因：消息页需要继续贴近现实 QQ：顶部搜索应能过滤消息和好友，右上角加号应展开常见入口，而不是只作为跳转按钮。
- 内容：`qqLogic.ts` 增加 `filterQqHomeRows` 和 `QQ_TOP_ACTIONS`；`QQHeader.tsx` 的搜索框改为真实输入，右上角加号展开“加好友 / 发起群聊 / 扫一扫 / 创建频道”；`QQScreen.tsx` 把搜索结果传给 `QQMessages`；`QQMessages.tsx` 支持搜索无结果空状态；`src/index.css` 增加 QQ 顶栏菜单和搜索输入样式。
- 验证：`npx tsx src/apps/qq/qqLogic.test.ts` 通过；`npx tsx src/apps/appsStructure.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示。

## 2026-06-19 QQ 聊天 API 语境和主题跟随

- 范围：只改共享聊天 prompt 的 channel 分支、QQ 主题变量样式和相关文档；未改 API 配置、持久化结构、微信四页签或其他 App。
- 原因：QQ 不需要复刻官方界面，而是要符合小手机各主题和字体；QQ 接入 API 后应像微信一样可聊天，但系统提示词不能继续要求“微信气泡/微信消息”。
- 内容：`src/apps/wechat/ai/wechatAi.ts` 增加 `buildChatSystemPrompt(channel)`，微信保持原文案，QQ 使用 QQ 消息语境；`ChatScreen` 按 `activeChannel` 选择 QQ/微信提示词、回复风格文案、日志标题、生图相册标签和购物备注；`src/index.css` 的 QQ 首页背景、顶栏、搜索框改为优先使用主题变量和小手机字体。
- 文档：同步 `PROJECT_OUTLINE.md`、`模块/QQ/README.md` 和本工作记录。
- 验证：`npx tsx src/apps/wechat/ai/wechatAi.test.ts` 通过；`npx tsx src/apps/qq/qqLogic.test.ts` 通过；`npx tsx src/apps/appsStructure.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示。

## 2026-06-19 旧交接目录和空占位页清理

- 范围：只清理已完成模块的旧交接资料和未接入占位页；未改运行时业务逻辑、状态结构、样式或持久化迁移。
- 原因：微信、日记、日历、音乐等模块已经有真实入口和模块文档，根目录 `下一轮-*` 与音乐 `NEXT_HANDOFF` / `CURRENT_SPEC` 会误导后续维护；`src/pages/*` 只是返回 `null` 的旧占位页，真实入口已经统一在 `src/apps/*`。
- 内容：删除 `下一轮-微信聊天/`、`下一轮-日历/`、`下一轮-日记/`、`模块/音乐/NEXT_HANDOFF.md`、`模块/音乐/CURRENT_SPEC.md` 和 `src/pages/*` 占位文件；`PROJECT_OUTLINE.md` 移除旧引用，并明确后续软件入口优先放在 `src/apps/<app-name>/`；`src/App.tsx` 文件头同步去掉 `src/pages/*` 占位说明；`src/shell/appCatalog.test.ts` 同步当前桌面目录，更新 18 个桌面 App、`char-active` 和 `user-info` 断言。
- 文档：同步 `PROJECT_OUTLINE.md` 和本工作记录。
- 验证：`npx tsx src/shell/appCatalog.test.ts` 通过；全部 33 个 `.test.ts` 文件逐个通过；`npm run lint` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示；`rg -n "crypto\.randomUUID|randomUUID" src package.json vite.config.ts` 无命中；确认 `下一轮-微信聊天/`、`下一轮-日历/`、`下一轮-日记/`、`src/pages/`、`模块/音乐/NEXT_HANDOFF.md` 和 `模块/音乐/CURRENT_SPEC.md` 均已不存在。

## 2026-06-19 App 壳第一轮拆分

- 范围：只拆 `src/App.tsx` 中的软件分发和数据备份页；未改业务状态、持久化结构、聊天/日历/相册/音乐等模块逻辑。
- 原因：`src/App.tsx` 仍承担手机壳、桌面、锁屏、通知中心、功能分发和备份页等职责，需要先抽低耦合部分，降低入口文件体积。
- 内容：新增 `src/shell/FeatureRouter.tsx`，集中维护 `Screen` 到各 `src/apps/*` 屏幕组件的映射；新增 `src/apps/backup/BackupScreen.tsx`，把数据备份 UI 从 `App.tsx` 移出；新增 `src/shell/LockScreen.tsx` 和 `src/shell/NotificationCenter.tsx`，把锁屏、通知中心和通知卡片 UI 从 `App.tsx` 移出；新增 `src/shell/Desktop.tsx`，把桌面分页、Dock、图标、小组件、拖拽布局、图床入口和桌面教程从 `App.tsx` 移出；新增 `src/shell/GlobalMusicAudio.tsx`，把全局隐藏 audio 元素从 `App.tsx` 移出；删除 `App.tsx` 里已经重复且未使用的本地 `Header` / `Panel` / `Row` / `Empty` 等 primitive 定义，后续统一使用 `src/apps/shared/AppPrimitives.tsx`；`App.tsx` 改为调用拆出的壳层组件；`src/apps/appsStructure.test.ts` 增加 backup、FeatureRouter、Desktop、GlobalMusicAudio、LockScreen 和 NotificationCenter 结构断言；同步 `PROJECT_OUTLINE.md`。
- 文档：同步 `PROJECT_OUTLINE.md` 和本工作记录。
- 验证：全部 33 个 `.test.ts` 文件逐个通过；`npx tsx src/apps/appsStructure.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示；`rg -n "crypto\.randomUUID|randomUUID" src package.json vite.config.ts` 无命中。拆分后 `src/App.tsx` 为 971 行，新文件为 `Desktop.tsx` 425 行、`FeatureRouter.tsx` 75 行、`BackupScreen.tsx` 97 行、`LockScreen.tsx` 56 行、`NotificationCenter.tsx` 68 行、`GlobalMusicAudio.tsx` 55 行。

## 2026-06-19 User 信息切换和删除确认
- 范围：只改 User 信息页的玩家档案切换视觉、点击区域和删除确认；未改 store 持久化结构、聊天逻辑、QQ 或其他 App。
- 原因：当前玩家档案切换状态不够明显，点击区域偏小；删除按钮直接删除，容易误触。
- 内容：`UserInfoScreen` 恢复可读中文文案；当前档案行改成蓝色边框、浅蓝背景、蓝色圆点和“当前”标识；未选档案显示“切换”标识，并把整行切换按钮加高加宽；删除按钮扩大点击区域，点击后先弹出“确定删除”确认，只有确认后才调用 `deleteUserProfilePreset`；新增 `userProfileUi.ts` 管理删除确认文案和判断。
- 验证：`npx tsx src/apps/user-info/userProfileUi.test.ts` 通过；`npx tsx src/apps/user-info/userProfilePrompt.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示。

## 2026-06-19 User 信息浅蓝选中态和手机内删除确认
- 范围：只改 User 信息页玩家档案选中态和删除确认方式；未改 store 持久化结构、QQ 或其他 App。
- 原因：选中态需要使用“发送给 AI”按钮同款浅蓝，而不是偏亮蓝；删除确认不能依赖浏览器原生弹窗，避免小手机/WebView 内不可用。
- 内容：`UserInfoScreen` 的当前档案行改为 `var(--accent)` 浅蓝底、黑色边框和白色状态胶囊；点击垃圾桶后只在手机页面内显示确认卡片，必须点“确认删除”才调用 `deleteUserProfilePreset`，点“取消”或切换/新增档案会收起确认；`userProfileUi.ts` 保留确认标题、文案和档案展示名 helper。
- 验证：`npx tsx src/apps/user-info/userProfileUi.test.ts` 通过；`npx tsx src/apps/user-info/userProfilePrompt.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示。


## 2026-06-19 默认软件头像和移动导出图标修正

- 范围：只改主题页软件头像切换、软件头像覆盖 helper、移动端导出图标资产和相关文档；未改聊天、通知、锁屏、查手机、主动事件或持久化结构。
- 原因：主题页里的默认软件头像和移动导出包默认头像不一致；移动导出资产仍是旧金发人物图。
- 内容：`src/shell/appIconOverrides.ts` 新增默认小手机头像识别 helper；`ThemesScreen` 的每个软件头像行新增手机图标按钮，可直接切换到小手机默认头像；用 `public/default-software-avatar-logo.png` 重新生成 `mobile-export/assets/icon.png`、`adaptive-icon.png`、`favicon.png` 和 `app-cover-source.png`，移除旧金发人物图标。
- 文档：同步 `PROJECT_OUTLINE.md`、`模块/主题/README.md` 和本工作记录。
- 验证：`npx tsx src/shell/appIconOverrides.test.ts` 先因缺少 helper 失败，补实现后通过；`npx tsx src/storeAppIconOverrides.test.ts` 通过；`powershell -ExecutionPolicy Bypass -File mobile-export/refresh-web.ps1` 通过并刷新离线 WebView；`npm run lint` 通过；`npm run build` 通过，仅保留既有 Vite chunk 体积提示；`rg -n "crypto\.randomUUID|randomUUID" src package.json vite.config.ts` 无命中；已目检移动端导出图标，且 `app-cover-source.png` 与 `public/default-software-avatar-logo.png` 哈希一致；本地 `http://127.0.0.1:3001/` 390x844 浏览器冒烟确认主题页 23 个软件行均有 3 个头像按钮，点击默认头像按钮会把该软件头像写为 `/default-software-avatar-logo.png`。
- 后续：无。

## 2026-06-20 42 教程折叠目录和软件说明细化

- 范围：只改桌面 42 教程内容、教程弹窗交互、相关样式和导出 WebView；未改软件业务逻辑、持久化结构或模型配置。
- 原因：原教程一打开就是长文本且软件功能说明不够细；需要先显示目录，点击章节后再出现详情，并介绍每个软件的用途和使用方式。
- 内容：`src/shell/desktopGuide.ts` 改为 7 个带 `id` 和 `summary` 的教程章节，覆盖作者信息、新手上手、桌面与组件、聊天和角色、生活软件、创作和工具、数据安全；补充微信、QQ、通讯录、电话、User信息、相册、日记、日历、备忘录、小红书、B站、音乐、小剧场、浏览器、预设、主题、设置、AI上下文、报错、char主动、数据备份和记账的用途说明；`Desktop` 的 42 弹窗改为两层交互，目录页只显示章节按钮，点章节后切换为详情页并提供“返回目录”；`src/index.css` 增加教程目录按钮、详情页返回按钮和空提示样式。
- 文档：同步 `PROJECT_OUTLINE.md` 和本工作记录。
- 验证：`npx tsx src/shell/desktopGuide.test.ts` 先因旧教程只有 4 章失败，改完后通过；`npm run lint` 通过；`powershell -ExecutionPolicy Bypass -File mobile-export/refresh-web.ps1` 通过并刷新离线 WebView；`npm run build` 通过，仅保留既有 Vite chunk 体积提示；本地 `http://127.0.0.1:3001/` 390x844 浏览器冒烟确认 42 弹窗先显示 7 个章节，点“生活软件”后目录按钮隐藏、只显示 1 个详情页和 1 个“返回目录”按钮，详情包含音乐和记账说明，点返回后 7 个目录按钮恢复。
- 后续：无。

## 2026-06-20 AI 上下文发送预览折叠详情

- 范围：只改 AI 上下文浏览界面、上下文预览统计 helper 和测试；未改上下文生成内容来源、store 持久化结构、微信/QQ 聊天发送逻辑或其他 App。
- 原因：原发送预览只能看到每个来源的大概行，长内容时难以确认实际发了什么；生成内容一直展开也不利于浏览；预算只显示字符总数，不够明确。
- 内容：新增 `src/apps/ai-context/aiContextPreview.ts`，提供预算统计、估算 token、预览行 key 和详情摘要 helper；`AIContextScreen` 改为独立可读界面，顶部显示精确字符数、估算 tokens、预算占比、剩余/超出字数和 60000 字硬上限剩余；发送预览每个来源默认折叠，点击后显示该来源实际进入上下文的完整片段；生成内容改为可折叠全文；写入后台记录时同步记录字符数、估算 tokens 和预算占用。
- 验证：`npx tsx src/apps/ai-context/aiContextPreview.test.ts` 先因模块缺失失败，补实现后通过；`npx tsx src/apps/appsStructure.test.ts` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示。`npm run lint` 当前失败在既有非本轮文件：`src/apps/wechat/chat/wechatInteraction.test.ts` 参数数量不匹配，以及 `src/lib/naiImage.test.ts` 引用 `buildNaiRequestHeaders`、`evaluateImageGenerationGate`、`hashPrompt` 缺失导出。
## 2026-06-20 聊天默认回复取消、NAI 生图限流记录和移动端键盘修复

- 范围：只改微信/QQ 共用聊天房间、NAI 生图共享工具、主动事件确认生图、HTTP 错误格式化、NAI 代理环境变量和相关文档；未改 QQ 首页、User 信息页和 AI 上下文页。
- 原因：用户反馈聊天/功能会重复，重点确认后根因在聊天层：手动 AI 生图成功后仍把“图片：prompt”放入自动回复队列，角色提示词又允许低频主动发图，容易形成“发图后又重复回复/再发图”的循环感；同时 HTTP 429/500 错误展示不够靠前，移动端 Android 键盘会遮挡输入框。
- 内容：`src/apps/wechat/chat/wechatInteraction.ts` 支持区分手动生成图片，不再自动触发回复；`ChatScreen.tsx` 取消手动 AI 生图后的自动回复队列，聊天 API 未配置时只报错不生成默认本地回复，重试条显示完整 `HTTP xxx` 错误，并修正 `visualViewport` 键盘 lift 计算；`src/lib/naiImage.ts` 增加浏览器型 NAI headers、prompt hash、每角色/频道/用户冷却、每日额度、失败重试、重复 prompt/相似 prompt gate；`ActiveEventsScreen.tsx` 的主动生图也走同一 gate；`src/store.ts` 新增 `generatedImageRecords` 和 `recordGeneratedImage`，persist version 升到 55；`api/nai/generate-image.js` 优先使用 `NAI_TOKEN` 并发送 NovelAI 所需请求头；`.env.example` 增加 `NAI_TOKEN`。
- 日志/保存：成功或失败都会记录 image_id、bot_id、character_id、guild_id、channel_id、user_id、trigger_type、prompt_hash、storage_url/galleryPhotoId、created_at、width、height、model、status；图片本体保存为聊天图片消息和系统相册 data URL，服务端代理仍透传二进制响应，不把 token 写入代码。
- 文档：同步 `PROJECT_OUTLINE.md`、`docs/wechat.md` 和本工作日志。
- 验证：`npx tsx src/apps/wechat/chat/wechatInteraction.test.ts` 通过；`npx tsx src/lib/httpErrors.test.ts` 通过；`npx tsx src/lib/naiImage.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，仅保留既有 Vite chunk 体积警告；`rg -n "crypto\.randomUUID|randomUUID" src api server mobile-export` 无命中。
- 后续：本轮没有真实调用 NAI token 消耗额度；需要在有服务器环境变量 `NAI_TOKEN` 的部署环境中做一次小图端到端实测，确认 NovelAI 当前额度、Cloudflare 和 Discord/聊天发送链路。

## 2026-06-20 42 教程作者信息反馈入口

- 范围：只改桌面 42 教程作者信息文案、相关断言和导出 WebView；未改软件业务逻辑、持久化结构或模型配置。
- 原因：作者信息页需要明确反馈位置。
- 内容：`src/shell/desktopGuide.ts` 的作者信息详情新增“反馈：无名小手机的帖子下面或者世界树社区。”；`desktopGuide.test.ts` 同步断言反馈文案包含无名小手机和世界树社区。
- 验证：`npx tsx src/shell/desktopGuide.test.ts` 先因缺少反馈文案失败，补文案后通过；`powershell -ExecutionPolicy Bypass -File mobile-export\refresh-web.ps1` 通过并刷新离线 WebView；本地 `http://127.0.0.1:3001/` 390x844 浏览器冒烟确认作者信息详情显示反馈文案。`npm run lint` 当前失败在既有非本轮引用：`src/shell/FeatureRouter.tsx` 找不到 `../apps/voice/VoiceCallScreen`。
- 后续：无。

## 2026-06-21 浏览器页返回键遮挡修复

- 范围：只改手机壳在浏览器页的返回按钮显示条件和导出 WebView；未改浏览器搜索、书签、历史、设置、持久化数据或生活事件。
- 原因：壳层大圆返回键叠在浏览器顶部标签标题上，挡住“新标签页/书签页”等文案；浏览器内部已经有返回按钮。
- 内容：`src/App.tsx` 不再为 `browser` 渲染 `.shell-app-back-button`，保留浏览器内部工具栏返回和浏览器自己的回退逻辑；刷新 `mobile-export/web.html` 与 `mobile-export/web-content.js`。
- 验证：Playwright 390x844 先复现 `.shell-app-back-button` 与 `.browser-tab.active` 相交，修复后确认壳层返回键不再出现在浏览器页、内部返回键仍存在、标签标题可见；`powershell -ExecutionPolicy Bypass -File mobile-export\refresh-web.ps1` 通过并刷新离线 WebView；`npm run lint` 通过；`npm run build` 通过，仅保留既有 Vite chunk 体积提示；`rg -n "crypto\.randomUUID|randomUUID" src package.json vite.config.ts` 无命中。
- 后续：无。

## 2026-06-21 后台控制台改为酒馆式日志视图

- 范围：只改报错/后台记录页面、日志控制台 helper 和测试；未改 appLogs 持久化结构、AI 请求逻辑、QQ 或其他 App 业务写入。
- 原因：原后台记录只是普通卡片列表，不像酒馆后台那样能排查请求、返回和错误；长 detail 不好读，也缺少筛选、搜索、展开和复制单条日志。
- 内容：新增 `src/apps/logs/logConsole.ts`，集中处理 level/source 推断、筛选、摘要、时间和复制文本；`LogsScreen` 改为独立控制台界面，顶部显示总计/错误/AI 统计，支持全部/错误/AI/生成/系统筛选和关键字搜索；每条日志显示时间、level、来源、标题和摘要，点击展开完整 detail，右侧可复制单条日志；保留清空后台日志，并明确只清空显示记录。
- 验证：`npx tsx src/apps/logs/logConsole.test.ts` 先因模块缺失失败，补实现后通过；`npx tsx src/apps/appsStructure.test.ts` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示。`npm run lint` 当前失败在既有非本轮文件：`src/apps/active-events/activeEventsLogic.test.ts` 引用不存在的 `buildDueProactiveReminderWrites`。
- 后续：如需继续接近酒馆后台，可再把 `addAppLog` 扩展成结构化 request/response 字段；本轮先不改持久化结构。

## 2026-06-21 API 上游错误和前端闪退入后台记录

- 范围：只补运行时错误入后台日志、React 崩溃边界日志和对应测试；未改 appLogs 持久化结构、具体 API 请求参数、QQ 或其他 App 业务逻辑。
- 原因：HTTP 400/429/500 等上游错误已有部分 API helper 写入后台记录，但前端界面闪退、未捕获 Promise 错误和全局 runtime error 没有统一记录，导致看到“小手机界面崩了”后无法在后台追栈。
- 内容：新增 `src/lib/runtimeErrorLog.ts`，把 Error、普通字符串和对象序列化成后台错误日志 detail，并支持附加 url、source 和 React componentStack；`App` 启动时监听 `window.error` 和 `window.unhandledrejection`，将未捕获运行时错误和 Promise 错误写入后台记录；`AppErrorBoundary.componentDidCatch` 写入“小手机界面崩溃”日志，包含 React 组件栈。
- 验证：用 `npx tsx -` mock 上游返回 `HTTP 400 Bad Request`，确认后台写入 `AI 接口失败`，detail 包含 endpoint、状态码和上游 body；用真实 Chrome 390x844 打开 `http://127.0.0.1:3002/`，在页面内真实抛出 `qa real runtime boom` 和未处理 `qa real promise boom`，确认 `appLogs` 写入 `前端运行时错误` 和 `未处理 Promise 错误`；`npx tsx src/lib/runtimeErrorLog.test.ts` 通过；`npx tsx src/apps/logs/logConsole.test.ts` 通过；`npx tsx src/apps/appsStructure.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示。
- 后续：如果要更像酒馆后台的 request/response 面板，下一步可以把 `addAppLog` 的 `detail` 从纯文本扩展为结构化字段，但本轮先保证上游错误和闪退不会漏记。

## 2026-06-21 主动提醒后端空配置静默和后台诊断字段

- 范围：只改主动提醒后端客户端、后台控制台诊断展示、对应测试和实施计划；未改 QQ、微信聊天业务流程、appLogs 持久化结构或主动提醒后端服务实现。
- 原因：本地 Vite 预览没有配置 `VITE_PROACTIVE_REMINDER_API_URL` 时，前端会请求同源 `/api/proactive-reminders/...`，拿到 HTML 后反复写入 `后端主动提醒同步失败`；后台日志已经能记录错误，但缺少一眼可见的 HTTP 状态、endpoint、model 和内容大小。
- 内容：`proactiveReminderClient.ts` 新增 `isProactiveReminderBackendConfigured()`，空配置时 `fetchBackendProactiveReminderOutbox` 返回空数组、`registerBackendProactiveReminder` 返回 skipped、ack 直接 no-op，避免本地预览刷无意义错误；`logConsole.ts` 新增 `getLogDiagnostics()`，从 detail 提取 HTTP、Endpoint、Model、Size；`LogsScreen` 在每条日志摘要下方显示最多 4 个诊断标签。
- 文档：新增 `docs/superpowers/plans/2026-06-21-backend-log-diagnostics.md`，记录这轮拆分和验证步骤。
- 验证：`npx tsx src/apps/active-events/proactiveReminderClient.test.ts` 先因缺少 `isProactiveReminderBackendConfigured` 导出失败，补实现后通过；`npx tsx src/apps/logs/logConsole.test.ts` 先因缺少 `getLogDiagnostics` 导出失败，补实现后通过；真实 Chrome 390x844 打开本地 `http://127.0.0.1:3002/`，空配置等待后 `appLogs` 为 0，未再出现 `后端主动提醒同步失败` 或 `Unexpected token`；`npx tsx src/lib/runtimeErrorLog.test.ts` 通过；`npx tsx src/apps/appsStructure.test.ts` 通过；`npm run lint` 修正测试 excess property 后通过；`npm run build` 通过，仅保留 Vite chunk 体积提示。
- 后续：如果要继续接近酒馆后台，可以下一轮把 `appLogs.detail` 外再加结构化 request/response 字段；本轮先不迁移持久化结构，避免影响旧日志。
## 2026-06-21 User 信息绑定角色

- 范围：只改 User 信息档案绑定、聊天/语音/视频调用 user 信息的选择逻辑、store 持久化迁移和对应测试；未改 QQ 首页结构、角色档案结构或 appLogs 持久化结构。
- 原因：多 user 档案存在时，和某个角色聊天仍只使用当前全局 user，容易出现角色 A 吃到角色 B 对应玩家信息的问题。
- 内容：`userProfilePrompt.ts` 新增 `resolveUserProfileForCharacter()` 和 `UserProfileCharacterBindings`；`store.ts` 新增 `userProfileCharacterBindings`、`bindUserProfileToCharacter()`，persist version 升到 57，旧数据默认空绑定，删除 user 档案时自动清掉指向它的角色绑定；`UserInfoScreen` 新增“角色绑定”区域，每个角色可选择“跟随当前 user”或指定 user 档案；微信/QQ 聊天、语音通话、视频通话生成 user 信息提示词时，会优先读取当前回复角色绑定的 user 档案，未绑定或绑定失效则回退当前 user。
- 验证：`npx tsx src/apps/user-info/userProfilePrompt.test.ts` 先因缺少 `resolveUserProfileForCharacter` 导出失败，补实现后通过；`npx tsx src/storeUserProfileBindings.test.ts` 先因缺少 `bindUserProfileToCharacter` action 失败，补实现后通过；真实 Chrome 390x844 打开本地 `http://127.0.0.1:3002/`，进入 User 信息页，确认角色绑定下拉初始选中 `user-b`，改回“跟随当前 user”后 localStorage 的 `userProfileCharacterBindings` 变成 `{}`；`npx tsx src/apps/user-info/userProfileUi.test.ts` 通过；`npx tsx src/apps/appsStructure.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示。
- 后续：如果要做得更细，可以在角色聊天页标题旁显示当前绑定的 user 名称；本轮先保证发送给 AI 的 user 信息不会串档。
## 2026-06-21 Redmi K60 桌面主题缩放修正

- 范围：只改桌面主题内置位置、桌面 canvas 移动端高度/缩放 CSS、移动端导出 WebView 内容和对应测试；未改 QQ、聊天、角色、User 信息或其他 App 业务逻辑。
- 原因：Redmi K60 这类高屏手机截图里，桌面主题出现通知按钮压住微信/QQ、图床卡片贴边、桌面整体被缩小并左上对齐的问题。根因是移动端短高媒体查询里对 `.desktop-canvas` 使用了 `transform: scale(0.86)` 和 `width: 116%`，同时普通主题内置图标从 y=22 开始，离通知按钮太近。
- 内容：新增 `src/shell/desktopLayout.ts`，集中管理桌面主题默认位置；普通主题内置图标/图床/时间卡整体下移 50px，渲染时最低不小于 64px 顶部安全距离；哥特和国风沿用已有主题位置；`.desktop-canvas` 改用 `--app-vvh` 计算高度，移除短屏下的 0.86 缩放和 116% 宽度；刷新 `mobile-export/web-content.js`，让手机包也吃到这次样式。
- 验证：`npx tsx src/shell/desktopLayout.test.ts` 先因 helper 缺失失败，补实现后通过；真实 Chrome 分别用 390x844、393x873、390x690 视口打开 `http://127.0.0.1:3002/`，确认 `.desktop-canvas` transform 为 none，微信图标不再压住通知按钮，图床右侧不越出手机壳；`powershell -ExecutionPolicy Bypass -File mobile-export\refresh-web.ps1` 通过并刷新 WebView 内容；`npx tsx src/shell/appCatalog.test.ts` 通过；`npx tsx src/apps/appsStructure.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示。
- 后续：如果用户还在真机上看到顶部状态栏或刘海区域遮挡，可继续把原生 WebView 的安全区 inset 从 React Native 侧传入 CSS；本轮先修桌面主题缩放和组件压叠。

## 2026-06-22 全 App 顶部栏和返回键体检

- 范围：只做手机壳返回键/顶部栏视觉体检、设置入口恢复、TTS 请求 ID 约定修正和移动端导出刷新；未改各 App 业务逻辑、持久化结构、生活事件或主动提醒。
- 原因：浏览器返回键遮挡修复后，需要确认其他页面没有类似的顶部栏/返回键挡字问题；审计前发现设置页入口缺失会导致路由和类型检查不稳。
- 内容：`src/apps/settings/SettingsScreen.tsx` 恢复为现有目录模式的薄导出 `export { SettingsScreen } from '../system/SystemScreens'`；`src/tts.ts` 的请求 ID 改用统一 `createId('tts')`，移除直接 `crypto.randomUUID` 调用；刷新 `mobile-export/web.html` 与 `mobile-export/web-content.js`。
- 验证：`npm run lint` 先因设置入口缺失失败，恢复入口后通过；Playwright 390x844 自动检查 browser、xiaohongshu、bilibili、settings、themes、presets、backup、logs、ai-context、contacts、user-info、memo、calendar、gallery、diary、phone、music、theater、active-events、qq 共 20 个页面，确认壳层返回键未与顶部 120px 内的文字、按钮或输入占位文本相交；`powershell -ExecutionPolicy Bypass -File mobile-export\refresh-web.ps1` 通过并刷新离线 WebView；`npm run build` 通过，仅保留 Vite chunk 体积提示；`rg -n "crypto\.randomUUID|randomUUID" src package.json vite.config.ts` 无命中。
- 后续：下一轮可做设置/API 自检页，把模型、TTS、NAI 和代理连通性集中检测。

## 2026-06-22 设置一键自检页

- 范围：只改设置页、自检 helper、项目大纲、工作日志和移动端导出；未改聊天、电话、TTS 播放、生图请求、持久化结构或生活事件。
- 原因：用户需要更容易判断当前小手机为什么不能聊天、不能出声或不能生图，而不是分散到多个设置项里排查。
- 内容：新增 `src/apps/settings/settingsSelfCheck.ts` 和测试，生成文本大模型、TTS、生图配置、社区验证四项报告及总状态；`SettingsScreen` 新增“一键自检”标签，默认展示通过/提醒/错误数量、每项详情和下一步修复建议；点“运行自检”只尝试拉取文本模型列表并写入后台记录，TTS 和生图仅检查配置，不自动播放语音或生成图片；同步 `PROJECT_OUTLINE.md`。
- 验证：`npx tsx src/apps/settings/settingsSelfCheck.test.ts` 先因模块缺失失败，补实现后通过；真实 Chrome 390x844 从桌面点击“设置”，确认默认显示“一键自检”、4 个检查项和“运行自检”按钮；`powershell -ExecutionPolicy Bypass -File mobile-export\refresh-web.ps1` 通过并刷新离线 WebView；`npm run lint` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示；`rg -n "crypto\.randomUUID|randomUUID" src package.json vite.config.ts` 无命中。
- 后续：如果要更进一步，可以让自检按钮可选执行 TTS 试听和小图测试，但需要明确提示会消耗接口额度。

## 2026-06-22 char 主动随机作息消息

- 范围：只改 `char主动` 随机主动消息、主动事件纯逻辑、store 开关、顶层本地定时 hook 和相关文档；不改群聊、锁屏通知、NAI 生图、电话或后端常驻推送。
- 原因：用户希望打开随机主动后，角色能按人设作息和主动程度偶尔主动发微信，例如 3 点下课后发消息；同时允许符合人设的旅行/地点报备和轻量生活事件刷新，不使用固定模板。
- 内容：新增 `buildRandomProactiveMessageWrites`，识别人设主动程度、下课/下班/吃饭/早起/深夜等作息，生成轻量生活事件草稿与多样化微信短句；新增 `randomProactiveMessagesEnabled` 持久化开关和 `char主动` 页面按钮；`App` 顶层在小手机运行期间低频检查并写入微信消息、`lifeEvents` 和日志；`char主动` 页补充“立即测试随机主动”，用 `manual_test` 模式绕过自动概率/冷却，立刻写入一条测试消息。
- 文档：同步 `PROJECT_OUTLINE.md` 和 `docs/life-system-framework.md`。
- 验证：`npx tsx src/apps/active-events/activeEventsLogic.test.ts` 通过；`npx tsx src/apps/active-events/activeEventsStore.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过；浏览器 390x844 冒烟确认 `char主动` 页显示并可切换“随机主动”开关。

## 2026-06-23 char 主动随机主动测试按钮

- 范围：只改 `char主动` 页面即时测试按钮和 `buildRandomProactiveMessageWrites` 的测试触发模式；不改随机主动自动调度、不改持久化版本、不改群聊、通知或生图逻辑。
- 原因：随机主动本身低频且有冷却，需要一个不用等待定时器的按钮，方便立刻检查当前角色能否生成随机主动消息。
- 内容：`buildRandomProactiveMessageWrites` 新增 `triggerMode: 'manual_test'`，在测试模式下绕过自动概率、日上限和冷却，并使用 `random-proactive-test-*` sourceId；`ActiveEventsScreen` 新增“立即测试随机主动”按钮，点击后直接写入微信私聊、`lifeEvents` 和日志，若当前没有可测试角色则只更新页面状态。
- 文档：同步 `PROJECT_OUTLINE.md` 和 `docs/life-system-framework.md`。
- 验证：先运行 `npx tsx src/apps/active-events/activeEventsLogic.test.ts` 失败于手动测试仍被自动节奏挡住，补实现后通过；`npx tsx src/apps/active-events/activeEventsStore.test.ts` 通过，保留 Node 环境中 zustand storage unavailable 提示；`rg -n "crypto\.randomUUID|randomUUID" src package.json vite.config.ts` 无命中；`npm run build` 通过，保留 Vite chunk 体积提示；Playwright 390x844 打开 `http://127.0.0.1:3000/`，进入第二页 `char主动` 并点击“立即测试随机主动”，干净数据下显示“没有可测试的随机主动角色”且控制台无 error。`npm run lint` 当前被既有 QQ 类型错误阻塞：`src/apps/qq/contacts/QQGroupProfile.tsx` 的 unknown `.trim()`，以及 `src/storeQqFeeds.test.ts` 引用 store 中不存在的 QQ 动态/频道字段。

## 2026-06-22 首次使用 42 教程一次性提示

- 范围：只改桌面首次使用提示、localStorage 标记 helper、桌面样式、移动端导出和维护文档；未改 store 持久化版本、软件业务逻辑或教程章节内容。
- 原因：首次使用时需要告诉用户先点时间卡右侧的 42 查看小手机教程，但提示只应自动出现一次，避免每次进入都打扰。
- 内容：新增 `src/shell/firstUseGuideTip.ts` 和测试，通过 `xiaophone.firstUseGuideTip.v1` 记录是否已提示；`Desktop` 首次进入桌面时显示“先看 42 教程”提示，点“现在看 42”直接打开教程目录，点“知道了”、关闭或手动点 42 都会记为已看过；补充对应 CSS。
- 文档：同步 `PROJECT_OUTLINE.md`，记录 `firstUseGuideTip.ts` 职责。
- 验证：`npx tsx src/shell/firstUseGuideTip.test.ts` 先因 helper 缺失失败，补实现后通过；`npx tsx src/shell/desktopGuide.test.ts` 通过；Playwright 390x844 打开 `http://127.0.0.1:3001/`，确认首次提示出现、点“知道了”后刷新不再出现、点“现在看 42”打开教程目录；`powershell -ExecutionPolicy Bypass -File mobile-export\refresh-web.ps1` 通过并刷新离线 WebView；`npm run lint` 通过；`npm run build` 通过，仅保留既有 Vite chunk 体积提示；`rg -n "crypto\.randomUUID|randomUUID" src package.json vite.config.ts` 无命中。

## 2026-06-23 微信聊天气泡组件拆分

- 范围：只拆微信/QQ 共用聊天房间的气泡 UI 文件夹；未新增微信功能、未改 store 持久化结构、未改 AI 请求逻辑或聊天数据格式。
- 原因：`ChatScreen.tsx` 已经承担聊天流程、输入栏、AI 回复和多种消息气泡渲染，继续做微信功能前需要先把消息气泡拆出去。
- 内容：新增 `src/apps/wechat/chat/components/ChatBubble.tsx`，承接文字、图片、表情、语音、通话提示、转账、红包和购物卡片渲染；`ChatScreen.tsx` 改为 import `ChatBubble`，保留发送、TTS 汇总朗读、AI 回复和加号面板逻辑；新增 `ChatBubble.test.tsx` 覆盖文本气泡和转账卡片渲染。
- 文档：同步 `PROJECT_OUTLINE.md` 和 `docs/wechat.md`，记录 `ChatBubble` 的新职责。
- 验证：`npx tsx src/apps/wechat/chat/components/ChatBubble.test.tsx` 先因组件文件缺失失败，补实现后通过；`npx tsx src/apps/wechat/chat/wechatInteraction.test.ts` 通过；`npx tsx src/apps/wechat/wechatModules.test.ts` 通过；`npm run build` 通过，仅保留既有 Vite chunk 体积提示；`powershell -ExecutionPolicy Bypass -File mobile-export\refresh-web.ps1` 通过并刷新离线 WebView；`rg -n "crypto\.randomUUID|randomUUID" src package.json vite.config.ts` 无命中。`npm run lint` 当前剩余非本轮错误：`src/apps/qq/QQScreen.tsx` 找不到 `./dynamic/QQDynamic`，`src/apps/settings/SettingsScreen.tsx` 缺少 `ModelPreset` 类型。

## 2026-06-23 朋友圈互动深化

- 范围：只改微信朋友圈逻辑、朋友圈卡片 UI、朋友圈样式、维护文档和移动端导出；未改 QQ、聊天 API、store 持久化版本或其他 App。
- 原因：用户发朋友圈后需要有人回复，朋友圈也需要更像真实社交信息流。
- 内容：`momentsLogic.ts` 新增自动回复、追加评论和点赞切换 helper；用户发布朋友圈时会自动带角色回复；每条朋友圈新增点赞/取消点赞、手动评论和单条“刷回复”；评论区同时展示点赞人和评论内容，并去掉自动评论正文里的重复作者名。
- 文档：同步 `PROJECT_OUTLINE.md` 和 `docs/wechat.md`，记录朋友圈互动层能力。
- 验证：`npx tsx src/apps/wechat/moments/wechatMoments.test.ts` 先因新 helper 缺失失败，补实现后通过；`npx tsx src/apps/wechat/wechatModules.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，仅保留既有 Vite chunk 体积提示；`powershell -ExecutionPolicy Bypass -File mobile-export\refresh-web.ps1` 通过并刷新离线 WebView；Playwright 390x844 打开 `http://127.0.0.1:3001/`，发朋友圈后确认评论区自动出现角色回复，并可点赞、手动评论和看到评论内容；`rg -n "crypto\.randomUUID|randomUUID" src package.json vite.config.ts` 无命中。

## 2026-06-23 QQ 频道消息流和空间动态

- 范围：只改 QQ 频道、QQ 动态、QQ 相关 store 字段、QQ 样式、设置页一个漏掉的 TTS 模型预设派生常量、QQ 文档和移动端导出；未改微信聊天发送主流程或其他 App 业务。
- 原因：QQ 的频道和动态不能继续只是入口骨架，需要参考真实 QQ 做成可发消息、可发说说、可点赞评论的可用功能。
- 内容：新增 `qqChannels`、`qqChannelMessages`、`qqDynamicPosts` 持久化数据和 actions；频道页支持默认频道、关注/取消关注、频道消息流和发送频道消息；动态页支持发表说说、配图、点赞/取消点赞、评论和删除自己的动态；QQ 空间配图优先调用全局生图配置，生图失败或不可用时降级为本地 SVG 文字图片。
- 验证：`npx tsx src/apps/qq/qqLogic.test.ts`、`npx tsx src/apps/qq/channels/qqChannelsLogic.test.ts`、`npx tsx src/apps/qq/dynamic/qqDynamicLogic.test.ts`、`npx tsx src/storeQqFeeds.test.ts`、`npx tsx src/apps/appsStructure.test.ts` 均通过；`npm run lint` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示；`powershell -ExecutionPolicy Bypass -File mobile-export\refresh-web.ps1` 通过并刷新离线 WebView。

## 2026-06-23 QQ 频道和空间人设发言

- 范围：只改 QQ 频道/动态的人设生成逻辑、两个页面按钮、QQ 样式和移动端导出；未改聊天 API、store 持久化版本或其他 App。
- 原因：频道和空间里的角色内容需要符合人设，不能只是普通随机模板。
- 内容：`qqChannelsLogic.ts` 新增 `buildPersonaQqChannelMessageDraft()`，从角色的 `description/personality/firstMessage/imagePromptTags` 生成频道发言；`qqDynamicLogic.ts` 新增 `buildPersonaQqDynamicDraft()`，生成角色空间说说和配图提示词；频道页新增“角色冒泡”，空间页新增“角色发动态”，都会优先读取已导入角色资料，并给空间动态附本地文字图片。
- 验证：`npx tsx src/apps/qq/channels/qqChannelsLogic.test.ts`、`npx tsx src/apps/qq/dynamic/qqDynamicLogic.test.ts`、`npx tsx src/storeQqFeeds.test.ts` 均通过；`npm run lint` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示；`powershell -ExecutionPolicy Bypass -File mobile-export\refresh-web.ps1` 通过并刷新离线 WebView。

## 2026-07-05 AI 兼容发送和设置能力核查

- 范围：只改聊天补全请求的消息 role 兼容层、电话/B站/音乐局部请求函数、共享 AI 文本测试和维护文档；未改 store 持久化版本、主动事件调度策略、TTS 播放实现或 NAI 生图接口。
- 原因：用户需要确认角色主动/Chat 主动是否有后端、是否支持 8 点/12 点提醒、生图、豆包、MiniMax，以及 DV4/Gemini 类接口下“系统设置发送改为用户设置发送”。
- 内容：新增 `prepareChatCompletionMessages()`，把所有发送到 `/chat/completions` 的 `role: "system"` 转成 `role: "user"` 且保留 `System settings:` 前缀；共享 `requestChatCompletion`/`requestChatCompletionStream` 和 `App`、音乐、电话、B站里的本地补全请求都改用转换后的消息体；测试直接 mock `fetch` 检查请求 body 不再包含 system role。
- 结论：现有 `char主动` 支持本地随机主动和后端每日提醒 outbox 同步；每日提醒解析和到点发送已有测试覆盖，能解析晚上 8 点半并在 20:31 发送，也已有早上 6 点/中午 12 点作息主动测试。生图已有 NAI V4/V4.5 payload、服务端代理、自定义 NAI relay 和主动图片 gate；TTS 设置已包含 MiniMax 与豆包新版 seed-tts-2.0 请求构造。
- 文档：同步 `PROJECT_OUTLINE.md` 的 `src/apps/shared/` 职责说明，并追加本记录。
- 验证：`npx tsx src/apps/shared/aiText.test.ts`、`npx tsx src/apps/active-events/activeEventsLogic.test.ts`、`npx tsx src/lib/naiImage.test.ts`、`npx tsx src/tts.test.ts`、`npx tsx src/apps/settings/settingsTtsPresets.test.ts`、`npx tsx src/apps/music/musicGeneration.test.ts` 均通过；`npm run lint` 通过；在 `C:\Users\凡人歌\Documents\Codex\小手机` 真实目录运行 `npm run build` 通过，仅保留 Vite chunk 体积提示。在 `C:\codex-smallphone` junction 路径运行 build 会触发 Vite/Rollup HTML 输出名路径错误，应优先使用真实目录构建。
- 后续：Discord 最新评论尚未读取；当前 in-app browser 打开 Discord 超时，Chrome 插件未连接，Edge 暂无可控插件。需要用户授权启动/登录 Chrome，或把 Discord 评论贴到线程里后再按评论继续改。

## 2026-07-05 Chrome 连接、后端启动和豆包试听实测

- 范围：连接 Codex Chrome Extension，启动本地小手机后端和代理前端，实测设置页豆包 TTS；只改 `src/tts.ts` 的豆包缺 Key 校验、`src/tts.test.ts` 和工作日志。
- 原因：用户指出之前只验证了豆包请求构造，没有实际听到声音，并追问主动后端是否已经跑起来。
- 内容：确认 Chrome 已安装，Codex Chrome Extension 在 Chrome `Profile 5` 已安装启用，本机桥正确；启动 `npm run phone:backend`，后端监听 `8789`；另启动带 `VITE_API_PROXY_TARGET=http://127.0.0.1:8789` 的前端 `http://127.0.0.1:3002/`。后端 `/api/proactive-reminders/health` 和经前端代理的同一路径均返回 `ok: true`。浏览器实测设置页切到豆包后发现 `TTS API 密钥` 为空，先前会卡在“正在试听...”；新增缺豆包 API Key 的同步校验，修复后页面立即提示“先填写豆包TTS API Key。”。
- 验证：`npx tsx src/tts.test.ts` 先因“Missing expected exception”失败，补实现后通过；`node server/nai-proxy.test.cjs` 通过，覆盖主动提醒入队和 push 通知发送；`npx tsx src/apps/active-events/proactiveReminderClient.test.ts` 通过；`npx tsx src/apps/active-events/activeEventsLogic.test.ts` 通过。Chrome 中未听到豆包声音，因为当前本地设置未填写豆包 API Key；这不是已播放成功。
- 后续：填入真实豆包 API Key 后，再点豆包音色预设和“试听 TTS”才能完成真实出声验证；当前后端进程和代理前端进程保持运行，供继续联调。

## 2026-06-23 朋友圈好友动态流和 char 主页

- 范围：只改微信朋友圈逻辑、朋友圈主页 UI、朋友圈样式、维护文档和移动端导出；未改 QQ、聊天 API、store 持久化版本或其他 App。
- 原因：朋友圈应更像好友动态流；角色发的动态需要能进入 TA 的朋友圈主页，并且如果角色设定里有好友关系，应出现设定好友评论。
- 内容：`momentsLogic.ts` 新增 `buildCharacterMomentProfile`、`generateSettingFriendComments` 和 `getCharacterMomentFeed`，从角色描述/性格/开场白里提取摄影社朋友、室友、同学、同事等好友身份；好友动态流中点击 char 头像或名字进入 TA 的朋友圈主页；TA 主页显示封面、签名、好友身份标签、只属于 TA 的动态，并可“刷 TA 的朋友圈”；char 动态评论区混入设定好友评论，同时过滤“慢热但很照顾朋友”这类性格描述，避免误当好友名。
- 文档：同步 `PROJECT_OUTLINE.md` 和 `docs/wechat.md`，记录朋友圈好友动态流、char 主页和设定好友评论能力。
- 验证：`npx tsx src/apps/wechat/moments/wechatMoments.test.ts` 先因新 helper 缺失失败，补实现后通过；`npx tsx src/apps/wechat/wechatModules.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，仅保留既有 Vite chunk 体积提示；`powershell -ExecutionPolicy Bypass -File mobile-export\refresh-web.ps1` 通过并刷新离线 WebView；Playwright 390x844 打开 `http://127.0.0.1:3001/`，确认点击 char 动态可进入 TA 的朋友圈主页，主页显示摄影社朋友/室友阿柚标签和评论，且不再把性格描述当好友标签；`rg -n "crypto\.randomUUID|randomUUID" src package.json vite.config.ts` 无命中。

## 2026-07-05 提示词模式、当前时间和消息多选删除

- 范围：只改共享聊天补全消息准备、设置页模型选项、微信/QQ 共用聊天房间的消息多选删除、相关样式、测试和维护文档；未改 NAI 生图请求、主动提醒后端服务实现、TTS 真实鉴权或移动端导出。
- 原因：Discord 反馈要求 AI 至少知道当前时间和日期，且 DeepSeek/DV4 等接口需要可选择把系统设定按 user prompt 发送；用户进一步确认“系统提示词/默认提示词/用户提示词”需要是三个可在设置或上下文里切换的版本。同时补上长按消息进入多选后统一删除多条消息的交互。
- 内容：`aiText.ts` 在发往 `/chat/completions` 前注入 `当前本地时间`，并支持 `chatPromptRoleMode: "default" | "system" | "user"`；默认仍为用户提示词模式，设置页“模型”标签新增“提示词发送方式”三段按钮。`ChatBubble` 新增选择模式和小圆点入口；`ChatScreen` 维护选中消息 ID，长按进入多选，输入栏上方显示“已选择 N 条”和删除按钮，批量删除同时支持用户消息和角色消息，删除待回复用户消息时同步清理待回复草稿。
- 文档：同步 `PROJECT_OUTLINE.md` 和 `docs/wechat.md`，记录提示词发送模式、当前时间注入和聊天多选删除职责。
- 验证：`npx tsx src/apps/wechat/chat/components/ChatBubble.test.tsx` 先因缺少 `wechat-selection-dot` 失败，补实现后通过；`npx tsx src/apps/shared/aiText.test.ts` 通过；`npx tsx src/tts.test.ts` 通过；`npx tsx src/apps/active-events/activeEventsLogic.test.ts` 通过；`npm run lint` 通过；`npm run build` 通过，仅保留 Vite chunk 体积提示；`Invoke-RestMethod http://127.0.0.1:3002/api/proactive-reminders/health` 返回 `{"ok":true,"reminders":0,"outbox":0,"devices":0,"tickMs":30000}`。
- 结论：本地后端和带代理前端仍在运行，健康检查正常。豆包试听当前只验证到“缺 API Key 会立即提示”，没有真实豆包 API Key 时不能证明已经听到声音；填入真实 key 后需要再次点“试听 TTS”做出声验证。

## 2026-07-17 生图与 TTS 完全分离

- 状态：持久化版本升到 67，新增 TTS provider profiles、生图 provider profiles、生图总开关和主动生图开关。MiniMax、豆包、NovelAI、ComfyUI 和多个公益站配置互不覆盖，也不交叉复用 Key。
- UI：TTS 页常显总开关、服务商、模型、音色和试听，地址/Key/高级参数收起；生图页常显两个开关、服务商、命名配置、模型和小图测试。公益站删除保留二次确认。
- 统一入口：微信/QQ 聊天、朋友圈、QQ 空间、小红书、相册和 char 主动全部进入 `requestAppImage()`，开关判定发生在网络请求之前。生图适配包含 NAI、ComfyUI、OpenAI Images、MJ 任务和通用 JSON。
- 存储：生成图写入 IndexedDB，状态保存引用；聊天、QQ、小红书、朋友圈、相册和锁屏均能解析。备份/恢复包含图片资产、朋友圈元数据和 TTS 自定义音色。
- 网络：TTS 网页代理限制官方可信域名、GET/POST、45 秒和 20 MiB 响应；APK 仍走原生网络桥。
- 验证：`npm run lint`和 `npm run build` 通过；所有 `src/**/*.test.ts(x)` 分组运行通过。本地浏览器验收确认 TTS 切换/刷新恢复、公益站新增/命名/二次确认删除、生图关闭后测试禁用、相册和朋友圈 AI 配图输入联动。安全配置核查显示豆包、MiniMax、NAI 和公益站 Key 均未配置，本轮未发真实计费请求。
- 发版：移动端版本升到 1.09 / versionCode 27，刷新离线 WebView 后成功构建 `小手机-v27-版本1.09-生图TTS分离.apk`（65.96 MiB，SHA-256 `BBE25AC45FB8133462E7CBCE45134A6225FA2DC51F6E00497004CDF9DBDB9D31`）。

## 2026-07-17 界面重叠、主题与目录职责修正

- 范围：修正桌面主题、Dock、短屏安全区和设置页交互；拆出设置页供应商 UI helper；隔离不同主题的桌面拖拽坐标；未改变 TTS、生图接口协议、Key 保存边界或聊天数据结构。
- 重叠修正：Pixel Dock 恢复绝对定位并完整留在短屏 WebView 内；P5R 的编辑入口下移避开顶部状态；页面圆点与 Dock 明确层级；桌面内容在 760px 以下使用统一安全高度。
- 主题修正：P5R 减少大面积高饱和红色并改用暗色手机外景；凯尔特主题恢复可识别的软件图标并提高配色层次；国风 Dock 恢复中文标签；状态终端主题提高文本和图标对比度。
- 交互与逻辑：设置页五个入口改为单行横向滚动，避免两列三行挤占表单空间；用户名只在模型页显示；音乐页明确 MiniMax 音乐 Key 与 TTS Key 独立；桌面自定义位置使用主题作用域键，避免切换主题后坐标串用和图标重叠。
- 目录：新增 `src/apps/settings/settingsConfigUi.ts`，集中供应商标签、地址占位、模型拉取和本地音色预设读取；新增 `src/themes/polish/index.css`，集中跨主题安全区与短屏修正，不再把零散覆盖继续堆进单一主题或页面组件。
- 验证：`npm run lint` 通过；主题规则、设置 UI helper 和主题桌面坐标均增加单元测试。浏览器 390×844 回归确认奶油、Pixel、凯尔特、国风与 P5R 桌面主要重叠已消除，设置页表单可用空间增加。
- 完整验收：68 个 `src/**/*.test.ts(x)` 与 3 个 `server/*.test.cjs` 全部通过；`npm run build` 通过，仅保留既有 Vite chunk 体积提示；`randomUUID` 搜索无命中；离线 WebView 刷新成功。
- 发版：移动端版本升到 1.10 / versionCode 28，并成功构建 `小手机-v28-版本1.10-界面主题修复.apk`（65.97 MiB，SHA-256 `5E6959C20C6B2E8F55ACDCB8F5D55A2F885CCEEB66D33481F4646988C6720FD1`）；`aapt` 已核对包名 `com.smallphone.app`、versionCode 28、versionName 1.10。

## 2026-07-17 生图与 TTS 稳定性收口、全手动存储管理

- 范围：完成生图任务中心、TTS 全局队列与缓存、付费请求防重复、全手动资产管理、持久化 v68、系统页面拆分、备份回滚、网页/APK 发版验证；不增加 B站、日记、小剧场或音乐封面生图，也不做供应商自动切换。
- 生图：`requestAppImage()` 为每次请求记录 queued/running/success/failure/interrupted，桌面新增“生图任务”入口，可筛选、复制提示词、手动重画和删除记录。任务历史最多 100 条；刷新时未完成任务标记中断，不自动重试。
- TTS：新增全局 FIFO 队列、顶部状态条和“停止全部”；停止会中止当前网络与播放并清空等待项。外部 TTS 音频缓存硬上限 64 MiB，达到上限后只跳过新缓存写入，不自动删除旧缓存。
- 防重复：文本生成、生图、TTS、MiniMax 音乐和供应商测试按功能使用全局在途锁；同一功能不能并发计费，不同功能可以并行。没有自动付费重试或失败切换。
- 全手动清理：数据备份新增“存储管理”，只允许人工选择删除孤立图片、清空未引用图片、删除选中 TTS 缓存或清空缓存；没有 LRU、按时间或按容量自动清理。备份导入改为先快照旧状态和图片，任一步失败会回滚。
- 迁移与目录：persist 67→68 保留主题桌面位置和各供应商 profiles，活动配置不再覆盖已保存公益站/TTS 配置；`migratePersistedAppState()` 可直接单测。删除 1257 行 `SystemScreens.tsx`，拆为 `ai-context/contextPackage.ts`、`presets/PresetsScreen.tsx`、`contacts/ContactsScreen.tsx`，世界书 helper 归入通讯录目录。
- UI 验收：内置浏览器以 390×844 验收桌面第二页、生图任务、数据备份/存储管理、TTS 设置和生图设置；所有页面 `bodyScrollWidth === bodyClientWidth === 390`，无横向溢出，控制台无 error。当前设置显示 NAI/公益站 Key 未配置，TTS 当前为浏览器服务商，因此没有执行真实计费请求。
- 自动验证：74 个 `src/**/*.test.ts(x)` 全部通过；3 个 `server/*.test.cjs` 全部通过；`npm run lint`、`npm run build`、离线 WebView 刷新均通过；`randomUUID` 搜索无命中。
- 发版：版本升到 1.11 / versionCode 29，成功构建 `小手机-v29-版本1.11-生图TTS稳定版.apk`（69,214,861 bytes，SHA-256 `FF40C2BA66D4C9A86E3EBDBDA5CA5808A1CC68A9DE6BB809B5CCDCC912007C2D`）；ASCII 路径下 `aapt` 已核对包名 `com.smallphone.app`、versionCode 29、versionName 1.11、minSdk 24、targetSdk 36。
- 升级测试限制：已安装 Android Emulator、API 35 镜像和 Google Android Emulator Hypervisor Driver 安装包，并创建 `XiaoPhoneUpgrade` AVD；驱动安装脚本需要 Windows 管理员确认，当前会话无法完成提权，`emulator-check accel` 仍返回驱动未安装，因此未能实际执行 v28→v29 覆盖安装。v67→v68 状态迁移已由单测覆盖，真机/具备硬件加速的模拟器覆盖安装仍需补做。
- 升级测试补强：新增 `scripts/test-apk-upgrade.ps1`，会在 adb-root 测试设备上以应用数据哨兵验证 `adb install -r` 后数据仍存在，并校验最终 versionCode。当前 `-MetadataOnly` 已通过：v28 `28/1.10` → v29 `29/1.11`，包名均为 `com.smallphone.app`，签名证书 SHA-256 均为 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`。另尝试 API 24 ARM 软件模拟器，但新版 QEMU2 已不再支持 ARM CPU 架构，不能绕过 Windows Hypervisor 限制。
- 付费入口审计：新增 `src/lib/paidRequestCoverage.test.ts`，静态门禁文本补全只走共享 `aiText`、生图只从 `appImageGeneration` 调 NAI 适配层、TTS/音乐均持有对应付费任务锁；新增后单测与 TypeScript 检查通过。

## 2026-07-18 APK 覆盖升级与数据保留实测

- 环境：Google Android Emulator Hypervisor Driver 2.2 已安装并运行；使用 ASCII 路径 `C:\Temp\XiaoPhoneAvdHomeX86-20260718` 创建 Android 15 / API 35 / x86_64 的 `XiaoPhoneUpgradeX86Ascii` AVD，AEHD 硬件加速检查通过。
- 执行：运行 `scripts/test-apk-upgrade.ps1`，先安装 v28（versionName 1.10），在 `/data/user/0/com.smallphone.app/files/codex-upgrade-sentinel.txt` 写入哨兵，再使用 `adb install -r` 安装 v29（versionName 1.11）。
- 结果：两次安装均返回 `Success`；脚本确认包名均为 `com.smallphone.app`、versionCode 从 28 增加到 29、签名证书 SHA-256 均为 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`，覆盖安装后哨兵仍可读取。
- 启动验证：`com.smallphone.app/.MainActivity` 成为 `topResumedActivity`，应用进程存在；最近 400 行错误级别 logcat 中未发现该应用的 `FATAL EXCEPTION` 或 AndroidRuntime 崩溃。
- 回归验证：覆盖升级实测后再次运行全部 74 个 `src/**/*.test.ts(x)` 和 3 个 `server/*.test.cjs`，全部通过；`npm run lint` 与 `npm run build` 通过，生产构建仅保留已有的大 chunk 提示，`randomUUID` 搜索无命中。
- 结论：此前“缺少可用 Hypervisor，真实覆盖安装待补做”的限制已解除。v28→v29 的包签名、版本递增、覆盖安装、应用私有数据保留和启动均已在模拟器中形成可重复证据。

## 2026-07-18 v1.12 生图与交互回归修复

- 生图协议：修正 GPT Image 地址规范、合法尺寸、`quality`、低额度测试和 150 秒超时；OpenAI 请求不再强制 `response_format`，解析 URL、`b64_json`、通用 base64 与 Responses `output[].result`。NAI、ComfyUI、MJ 和通用 JSON 保持各自尺寸与 90 秒默认超时。
- 双端网络：新增 `src/lib/nativeImageBridge.ts`、网页 `/api/image/proxy`、Vite/Node/Vercel 代理和 APK `small-phone-image-fetch/cancel/response` 协议。原生桥限制 GET/POST、HTTP(S)、150 秒和 32 MiB；任务中心停止按钮会真实中止原生请求，不自动重试或切换供应商。
- 设置交互：测试前显示脱敏后的域名、模型和尺寸；错误区分鉴权、额度、模型、尺寸、跨域、超时和返回字段；模型列表提示“可访问不代表支持生图”。设置文本输入改为 300ms 合并写入并在失焦时立即提交；生图测试结果改用 `PersistentImage` 读取 IndexedDB 引用。
- 聊天与上下文：新增 `MessageKind: "theater"` 剧情卡，并兼容旧 `call-note + 【小剧场】` 删除；聊天最近 200 条分页、每次加载 100 条。AI 上下文增加稳定 `sectionId`、按角色排除/恢复和恢复全部，persist 68→69，来源数据不会被删除。
- 卡顿与键盘：App、桌面、聊天、ChatBubble、设置、AI 上下文、小剧场和生图任务中心改为精确 selector，ChatBubble 使用 `React.memo`；移除聊天页重复键盘 lift，只保留 App 壳 `visualViewport`/`--app-vvh`，输入面板按可视高度滚动。
- 自动验收：76 个 TypeScript/TSX 直接测试文件和 5 个 Node 服务/脚本测试文件全部通过；`npm run lint`、生产构建、离线 WebView 刷新通过。Playwright 390×844/390×600 模拟 OpenAI 代理生图成功，确认最终请求为 `gpt-image-1.5 + low + 1024×1024`、没有 `response_format`、图片从持久化引用显示、无横向溢出和控制台错误。
- APK：版本升级为 1.12 / versionCode 30；ASCII 独立目录构建成功，产物 `小手机-v30-版本1.12-生图交互回归版.apk` 为 69,250,721 bytes，SHA-256 `85347DB2748AE314A3728BEBC1D84B8067318AFADB165BD720D2800C10E53683`。`aapt` 核对包名 `com.smallphone.app`、minSdk 24、targetSdk 36。
- 覆盖升级：在 Android 15 / API 35 / x86_64 模拟器执行 v29→v30，签名证书 SHA-256 保持 `fac61745dc0903786fb9ede62a962b399f7348f0bb6f899b8332667591033b9c`，两次安装均为 `Success`，应用私有目录哨兵保留；v30 `MainActivity` 成为 top resumed activity，未发现应用 FATAL EXCEPTION。
- 真实计费：当前工作区没有可用的豆包、MiniMax、NAI 或公益站 Key，本轮只完成模拟接口和 APK 协议验收，没有声称真实计费生图/TTS 成功。

## 2026-08-06 多主题预览与微信/QQ气泡美化

- 范围：只扩展主题 App、主题/气泡选项、微信与 QQ 共用气泡视觉、持久化迁移、测试和维护文档；未改聊天数据、AI 回复、气泡拆分、通知、主动事件或供应商配置。
- 原因：主题页原先只有文字卡片，六套整机主题不便于切换前辨认；微信/QQ 气泡外观只能被整机主题带动，没有可独立选择的美化入口。
- 内容：六套整机主题卡增加对应配色、形状和 Dock 的缩略预览；新增 `bubbleStyle`，提供跟随主题、微信青绿、QQ 晴空、雾面玻璃、手账贴纸、像素电波六个选项，同时覆盖微信/QQ文字和语音气泡。显式气泡皮肤从 `src/themes/bubbles/index.css` 最后加载，确保能覆盖各整机主题自带气泡；`theme` 不增加覆盖，继续保留每套主题原设计。
- 持久化：persist 69→70；旧数据或未知气泡 ID 归一为 `theme`，不改变用户现有主题观感。
- 文档：同步 `PROJECT_OUTLINE.md`、`docs/wechat.md`、`模块/主题/README.md`、`模块/微信/README.md` 和 `模块/QQ/README.md`，明确“气泡美化”与微信设置里的“气泡方式”互不影响。
- 验证：针对性主题、主题页和迁移测试通过；`npm run lint` 通过。生产构建和 390×844 浏览器视觉检查在本条后续验收时补充结果。

## 2026-08-06 取消社区验证并改为问题反馈社区

- 设置：把“社区验证”标签改为“问题反馈”，移除后门服务地址、Discord Client ID、Guild ID 和身份组输入，只保留固定的问题反馈社区入口 `https://discord.gg/VpM25X3edm`。
- 行为：加入社区不再是使用条件；网页端直接跳转邀请页，APK 端通过已有 `open-url` 原生消息交给系统浏览器，不读取 Discord 身份、不保存验证信息。
- 自检：删除社区验证检查项，自检只报告文本模型、TTS 和生图，避免已取消功能继续产生警告。
- 兼容：旧版持久化数据中的社区验证字段暂不强删，导入旧备份时会被忽略，当前界面和运行逻辑均不使用。
- 文档：宣传文档、配置教程、桌面教程和项目结构说明同步改为问题反馈入口，删除已过期的后门码及登录说明。
- 验证：82 个测试全部通过；`npm run lint`、生产构建和离线 WebView 刷新通过。浏览器确认设置页不再出现“社区验证”，并实际跳转到 `https://discord.com/invite/VpM25X3edm` 后返回小手机。

## 2026-08-11 v1.15 短长 RP 预设稳定版

- 预设收口：微信内置聊天预设只保留“小手机 · 短 RP”和“小手机 · 长 RP”，删除自然微信、活人感微信、AI助手、黏人连发、克制冷淡及旧“自动判断”条目；短 / 长只从“正在使用”下拉框切换。
- 互斥逻辑：短、长规则保留在同一可编辑条目表中，但当前模式只能开启一条，模式开关由下拉框锁定；括号风格同组也不能同时开启或全部关闭。切换短 / 长时保留玩家修改过的公共条目、顺序、角色和括号选择。
- 微信 / QQ 共用：两端读取同一 `chatPresetEntries`、`chatPresetPrompt` 和 `chatReplyStyle`；预设 App 点击微信或 QQ 都进入同一管理面板，旧 QQ 扁平提示词不再覆盖聊天请求。
- 数据迁移：persist 72→73；旧“小手机专用 · 短长 RP”按已选回复模式迁移，移除旧自动规则；旧内置预设迁到短 RP；导入的自定义预设和本地角色卡原样保留。
- 验证：浏览器实际切换确认短/长为 `true/false` 互斥、括号风格互斥、微信与 QQ 同显“长 RP”；87 个 `src/**/*.test.ts(x)` 全部通过，`npm run lint`、生产构建和离线 WebView 刷新通过。
- 发版：版本升到 1.15 / versionCode 33，ASCII 路径原生构建成功。产物 `小手机-v1.15-短长RP预设稳定版.apk` 为 69,487,437 bytes，SHA-256 `99DDBD5DB2E94E661C9D648256D6D83423D21F35BA699378607591DEE5B1DD9F`；`aapt` 核对包名 `com.smallphone.app`、minSdk 24、targetSdk 36。v32→v33 元数据升级门禁及签名一致性通过，未在本轮重复执行真机覆盖安装。

## 2026-08-13 聊天背景、软件头像与记账接入

- 聊天背景：主题页新增全局聊天背景上传、预览和恢复默认；微信与 QQ 共用，只覆盖消息区，不改锁屏壁纸。图片写入 IndexedDB，store 只保存 `xiaophone://image/...` 引用。
- 软件头像：修复原先只保存字符串、桌面却不能读取持久图片的问题；主题页 24 个软件均可单独选择图片、预览和恢复默认，桌面与 Dock 统一通过 `PersistentImage` 显示。
- 记账：新增独立记账 App 并接入桌面和路由；收入、支出、分类、角色、备注、筛选、汇总和单条删除均写入原有 `purchaseRecords`，微信“我 → 记账与订单”打开同一本账，不复制旧数据。
- 数据迁移：persist 73→74；旧订单默认迁为支出，原聊天、角色卡、预设、订单和自定义软件头像均保留；继续坚持全手动清理，不自动删除用户资产。
- 浏览器验收：实际新增 12.34 元测试支出并刷新确认持久化，随后删除；实际上传软件头像并刷新确认仍显示，随后恢复默认；实际上传聊天背景确认预览与状态，随后恢复默认；临时图片资产已通过存储管理手动清理，最终图片资产为 0，未动原有 TTS 缓存。
- 自动验证：90 个 `src/**/*.test.ts(x)` 全部通过；`npm run lint`、生产构建和离线 WebView 刷新通过；浏览器控制台无应用错误。构建仍只有既有的大 chunk 提示。本轮未生成 APK、未执行真机验收。

## 2026-08-13 仓库字体本地接入

- 来源：从用户公开仓库 `jiuyi777/sillytavern-theme-assets` 的提交 `358a9f9e18c996f0042c82cfcd6ac1f7455ad05c` 稀疏复制 10 套 WOFF2；每套字体旁保留 `OFL.txt`、`source.json` 和元数据，未引入仓库中授权不清晰的条目。
- 字体选择器：主题页由原先 4 个系统字体名扩展为 11 个真实入口，包括霞鹜漫黑、系统清爽、朱雀仿宋、DotGothic16、Zen Maru Gothic、站酷快乐体、站酷小薇体、站酷庆科黄油体、马善政毛笔、龙藏和 Zen Old Mincho；选中态增加 `aria-pressed`，卡片直接使用对应字体预览。
- 持久化：persist 74→75；旧 `rounded/system/serif/pixel` 值原样保留并映射到真实字体，无效值回落霞鹜漫黑。字体文件属于应用静态资源，不进入玩家存档，也不改角色卡、预设或聊天数据。
- APK 离线链路：修复 `mobile-export/refresh-web.ps1`，把 Vite 生成的 WOFF2 转成 `data:font/woff2;base64` 内嵌到 WebView HTML。最终离线内容包含 10 个字体数据 URL、0 个相对 WOFF2 URL，`web-content.js` 为 33,977,096 bytes。
- 验证：浏览器实际选择龙藏书法后整机立即换字，刷新后仍保持，随后恢复原霞鹜漫黑；91 个 `src/**/*.test.ts(x)` 全部通过，`npm run lint`、生产构建和离线 WebView 刷新通过。生产构建逐个输出 10 个字体资产，只保留既有大 chunk 提示；本轮未生成 APK、未执行真机字体渲染验收。
