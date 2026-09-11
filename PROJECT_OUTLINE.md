# 小手机项目大纲

本文件是维护 AI 的导航图。后续修改代码前先读这里，再去目标文件顶部注释定位函数。

## 两层目录结构

### 根目录

- `CLAUDE.md`：固定维护流程。规定开工、修改、文档同步、验证和最终回复方式。
- `PROJECT_OUTLINE.md`：当前文件。记录两层目录、关键文件职责、入口函数和维护注意事项。
- `模块/`：中文模块导航目录。每个子目录只放模块说明，真实代码入口仍由说明指向 `src/App.tsx` 或对应源码。
- `MAINTENANCE_OUTLINE.md`：全局维护大纲。当前内容来自旧交接，存在编码显示问题；非全局路线变更不要重写。
- `README.md`：原 AI Studio 运行说明。后续可替换为小手机项目 README。
- `package.json`：npm 脚本和依赖。JSON 不能写顶部注释；用途在本文件维护。
- `package-lock.json`：依赖锁定文件。不要手写改动。
- `vite.config.ts`：Vite 配置。顶部注释列出 defineConfig、插件、alias、HMR 依赖。
- `tsconfig.json`：TypeScript 配置。JSON/JSONC 类配置不作为业务入口。
- `index.html`：Vite HTML 入口，挂载 `#root`。
- `.env.example`：环境变量示例。
- `.gitignore`：忽略规则。
- `metadata.json`：AI Studio 元数据。不要作为业务配置入口。
- `dist/`：构建产物。由 `npm run build` 生成，不手写维护。
- `mobile-export/`：移动端导出工程。`assets/icon.png`、`adaptive-icon.png`、`favicon.png` 和 `app-cover-source.png` 是 Expo/打包默认图标资产；需要和 `public/default-software-avatar-logo.png` 保持同源。
- `node_modules/`：依赖安装目录。不要搜索或修改其中源码。

### `src/`

- `src/main.tsx`：React 启动入口。只负责渲染 `App`，并导入全局 CSS 与独立主题 CSS。
- `src/App.tsx`：当前真实 UI 壳入口。负责错误边界、锁屏/通知中心状态流转、小手机壳、全局音乐 audio 和备忘自动写入；应用不使用社区验证门禁，启动后直接进入锁屏；桌面和各软件屏幕优先在 `src/shell/`、`src/apps/<app-name>/`。
- `public/default-software-avatar-logo.png`：默认软件头像/导出图标源图。主题页预览和移动端导出图标都应以它为准，避免回退到旧人物头像。
- `public/default-lock-wallpaper.png`：默认锁屏图片资产。玩家未从相册设置锁屏时优先读取这里；缺失时只显示主题背景，不再用代码绘制替代小人。
- `src/store.ts`：Zustand 全局状态。包含角色、聊天、图片/语音/表情/转账/红包/购物/小剧场消息、语音已听状态、消息删除/收藏/撤回、模型 API 配置、彼此隔离的 TTS/生图供应商配置、生图任务历史 `imageGenerationTasks`、按角色保存的上下文排除项、微信/浏览器/小红书/B站/电话/音乐预设参数、整机主题、微信/QQ 共用气泡皮肤和聊天背景、界面字体、锁屏壁纸、软件头像覆盖、微信个人资料、多玩家/User 档案、照片墙、朋友圈、记账/订单、群聊、生活事件、日记、日历、相册、备忘录、桌面布局和 persist 迁移。微信与 QQ 共用同一聊天预设，内置仅短 RP / 长 RP 两种互斥模式。旧版社区验证字段仅为备份兼容保留，当前界面与自检均不读取。当前持久化版本为 75。
- `src/index.css`：全局 CSS。包含基础主题变量、手机壳、桌面、通用控件、微信页、聊天气泡、既有奶油/P5R 覆盖和滚动条隐藏；新增主题视觉优先放在 `src/themes/`。
- `src/assets/fonts/`：随网页和 APK 离线打包的界面字体。每个字体目录保留 WOFF2、许可文本和来源元数据；当前 10 套仓库字体共约 22.3 MB，来源提交与维护规则见同目录 `README.md`。
- `src/themes/`：主题系统独立目录。`themeOptions.ts` 维护整机主题与气泡皮肤 ID、类型和主题页预览文案；各整机主题视觉放在自己的 `index.css`，其中 `tidal-post-office/index.css` 是“潮汐邮局”整机主题，并由 `Desktop.tsx` / `desktopLayout.ts` 提供专属邮局铭牌、邮戳字标与双页坐标；`polish/index.css` 承载跨主题安全区、短屏、Dock 防裁切和可读性修正；`bubbles/index.css` 最后加载，维护主题页缩略预览和显式选择的微信/QQ 共用气泡皮肤。
- `src/lib/utils.ts`：工具函数。`cn` 合并 className，`createId` 生成兼容 ID。
- `src/lib/httpErrors.ts`：HTTP 错误格式化工具。把服务商返回的 400/401/429/500 等状态统一整理为前置 `HTTP xxx`，供聊天、电话、设置拉模型和 NAI 生图直接显示真实错误码与返回详情。
- `src/lib/naiImage.ts`：生图接口适配层。负责 NovelAI、ComfyUI、OpenAI Images、MJ 任务和通用 JSON 请求/响应解析，支持 URL、base64、PNG/ZIP 和任务轮询。`src/lib/appImageGeneration.ts` 是所有软件的统一入口，先检查生图总开关/主动开关，再请求并把返图写入 IndexedDB。
- `src/lib/imageAssetStore.ts` 与 `src/components/PersistentImage.tsx`：把生成图像保存为 `xiaophone://image/<id>` 引用，展示时再从 IndexedDB 解析，避免大段 base64 挤爆 localStorage。
- `src/lib/imageGenerationTasks.ts` 与 `src/apps/image-tasks/ImageTasksScreen.tsx`：记录统一生图入口的排队、运行、成功、失败和中断状态，桌面“生图任务”可筛选、复制提示词、手动重画和删除记录；删除记录不自动删除图片资产。
- `src/lib/paidTaskManager.ts`：文本、生图、TTS、音乐和供应商测试的全局付费任务锁。同一功能同一时刻只允许一个真实请求，不做自动重试或供应商切换，不同功能仍可并行。
- `scripts/test-apk-upgrade.ps1`：APK 覆盖升级验收脚本。先验证旧/新 APK 包名、递增 versionCode 和签名证书一致，再在 adb-root 测试设备中安装 v28、写入应用数据哨兵、覆盖安装 v29，并验证哨兵与新版本同时存在；`-MetadataOnly` 可只跑离线元数据门禁。2026-07-18 已在 Android 15 / API 35 x86_64 模拟器完成实测：`28/1.10` 覆盖升级到 `29/1.11`，应用私有目录哨兵保留，启动无 fatal 日志。
- `src/ttsQueue.ts`、`src/ttsAudioCache.ts` 与 `src/shell/TtsQueueBar.tsx`：TTS 使用全局 FIFO 队列；“停止全部”会停止当前播放/网络并清空等待队列。音频缓存上限 64 MiB，满后停止新增缓存但继续播放，绝不自动淘汰。
- `src/lifeEvents.ts`：生活事件时间线共享工具。定义 `LifeEvent` / `LifeEventDraft` / app 和 type 枚举，提供事件构建、旧数据归一化、时间线筛选读取和普通聊天高价值门槛判断；保持 UI-free，供微信、电话、日记、日历、相册、音乐、小红书、B站后续写入高价值事件。
- `src/lib/charaParser.ts`：酒馆/角色卡解析。负责 PNG/JSON 角色卡、头像提取和角色字段归一化。
- `src/apps/`：每个真实手机软件的独立代码目录。软件自己的 UI、逻辑和测试优先放在 `src/apps/<软件名>/`，共享壳、状态、工具和全局样式仍留在 `src/` 对应公共目录。
- `src/apps/wechat/WeChatApp.tsx`：微信四页签外壳，只负责切换聊天、通讯录、发现和我。
- `src/apps/wechat/chat/`：通用聊天列表、聊天房间和消息气泡。`ChatScreen.tsx` 负责聊天流程、发送、AI 回复编排和消息多选删除；`components/ChatBubble.tsx` 负责文字、图片、语音、表情、通话提示、生活卡片气泡渲染和多选圆点入口。QQ 当前只复用这里的 `ChatScreen` 聊天房间能力，QQ 首页和联系人入口已独立到 `src/apps/qq/`。
- `src/apps/wechat/ai/`：微信 AI 提示词、活人感规则、转账/红包/购物/表情动作解析和新手教程。
- `src/apps/wechat/stickers/`：微信 emoji/sticker 风格表情包 starter manifest 和来源说明。
- `src/apps/phone/PhoneScreen.tsx`：电话模块真实 UI。包含最近通话、角色拨号、呼叫中、来电中、通话中、通话详情、短口语电话 AI 回复和写入聊天记录按钮；缺少聊天 API 接口地址或模型时只显示未连接原因，不生成本地固定台词。
- `src/apps/gallery/`：相册模块真实代码目录。`GalleryScreen.tsx` 负责相册 UI、上传、图床/微信照片导入、手动 AI 配图、详情编辑、标签点选、可读范围、设为锁屏壁纸和 char 评价；`galleryLogic.ts` 负责照片筛选、日期分组、标签切换、导入草稿、隐藏切换和评价文案。
- `src/apps/xiaohongshu/XiaohongshuApp.tsx`：小红书独立 App。包含推荐/关注/附近首页、玩家形象编辑、相册取图、笔记发布、我的发布、详情页、标签筛选、关注、收藏和删除。
- `src/apps/xiaohongshu/types.ts`：小红书条目类型 `XiaohongshuNote` 和玩家形象 `XiaohongshuProfile`。
- `src/apps/xiaohongshu/xiaohongshuLogic.ts`：小红书条目归一化、玩家形象归一化、角色/世界书笔记生成、推荐/关注/附近/我的筛选、标签筛选和 AI 上下文摘要。
- `src/apps/user-info/`：User 信息 App。`UserInfoScreen.tsx` 负责玩家昵称、全局玩家头像、多玩家档案、发送给 AI 开关和角色绑定；点击头像会读取本地图片并写入 `userAvatar`，供微信、QQ 和其他玩家身份展示复用。`userProfileUi.ts` 维护档案展示名、删除确认文案和头像读取结果归一化 helper。
- `src/apps/bilibili/`：B站模块真实代码目录。`BilibiliScreen.tsx` 负责视频流、搜索和详情页；`bilibiliLogic.ts` 负责 B站-only fallback、模型 JSON 解析和外站过滤；`bilibiliTypes.ts` 维护 B站条目和搜索记录类型。
- `src/apps/music/MusicScreen.tsx`：音乐模块真实 UI。当前由 `src/App.tsx` 分发到这里，保持原有曲库、播放页、歌单、历史、一起听、外部搜索、char 创作和唱歌/TTS 入口行为不变。
- `src/apps/theater/`：小剧场模块真实代码目录。`TheaterScreen.tsx` 负责创作、历史、收藏、主题库和世界书管理；`theaterLogic.ts` 和测试跟随放在同目录。
- `src/apps/calendar/CalendarScreen.tsx`：日历模块真实 UI。保持月视图、今天、日程、编辑、详情、节日和日记/备忘转入逻辑。
- `src/apps/diary/`：日记和查手机入口目录。`DiaryScreen.tsx` 负责日记列表/编辑/详情/char 生成；`PeekScreen.tsx` 负责查手机 UI 入口。
- `src/apps/peek/`：查手机读取逻辑目录。`peekLogic.ts` 按角色生成/汇总 TA 自己手机里的最近聊天、日记、相册、日历、备忘、浏览器、小红书和音乐摘要；优先读取明确属于该角色的已有状态，没有明确记录时生成角色手机痕迹摘要，不把用户手机数据当成角色手机；`peekLogic.test.ts` 校验角色手机视角和跨角色隔离。
- `src/apps/memo/MemoScreen.tsx`：备忘录模块真实 UI。保持标签、置顶、锁定、提醒、转日历和 char 备忘设置逻辑。
- `src/apps/accounting/`：桌面“记账”App。`AccountingScreen.tsx` 读取唯一的 `purchaseRecords`，支持收入/支出、分类、可选角色关联、筛选、汇总和手动删除；微信“我”的旧订单入口跳到同一账本，不复制数据。`accountingLogic.ts` 负责金额解析、旧记录方向降级和收支汇总。
- `src/apps/browser/BrowserScreen.tsx`：浏览器模块真实 UI。保持搜索生成、历史、书签、世界书导入和浏览器专属模型配置。
- `src/apps/qq/`：QQ 独立入口目录。`QQScreen.tsx` 只负责 QQ 外壳、底部导航和当前页状态；`QQHeader.tsx` 使用 `userName/userAvatar` 渲染玩家头像、昵称和在线状态；`QQMessages.tsx` 维护消息页；`QQContacts.tsx`、`QQChannels.tsx`、`QQDynamic.tsx` 分别维护联系人、频道和动态；`QQProfile.tsx` 维护 QQ 个人主页；点击头像进入 QQ 主页，点击“发 QQ 消息”或消息行会以 `channel: "qq"` 打开共享聊天房间。QQ 频道消息和 QQ 空间动态已经有独立持久化数据，空间配图优先使用全局生图配置，失败时降级为本地文字图片。
- `src/apps/video/VideoCallScreen.tsx`：视频通话入口。保持原有画面描述和通话按钮 UI。
- `src/apps/settings/`、`src/apps/themes/`、`src/apps/presets/`、`src/apps/logs/`、`src/apps/ai-context/`、`src/apps/contacts/`：设置、主题、预设、后台记录、AI 上下文和全局通讯录入口目录；各屏幕已独立归档，不再依赖旧 `SystemScreens.tsx`。AI 上下文计算位于 `ai-context/contextPackage.ts`，世界书编辑 helper 位于 `contacts/worldBookText.ts`。设置页的 `settingsConfigUi.ts` 维护供应商标签、地址占位、音色预设读取和模型列表拉取；`settingsSelfCheck.ts` 维护一键自检；`settingsTtsPresets.ts` 维护 TTS 服务商默认值和音色控制策略。
- `src/apps/active-events/`：主动事件入口目录。`ActiveEventsScreen.tsx` 提供手动“刷新今日生活”预览和确认写入，并提供主动提醒/随机主动开关和“立即测试随机主动”按钮；`activeEventsLogic.ts` 基于现有聊天、日记、日历、相册、朋友圈、音乐、小红书和生活事件生成最多 3 条建议，另由 `buildRandomProactiveMessageWrites` 在随机主动开启时读取人设作息、主动程度、已有生活事件和轻量生活事件草稿，低频写入微信私聊消息并用 `sourceId` 去重；相关测试为 `activeEventsLogic.test.ts` 和 `activeEventsStore.test.ts`。
- `src/apps/shared/`：App 屏幕共享 UI primitives 和 AI 文本工具，供拆出的软件屏幕复用；`aiText.ts` 会在发送聊天补全前注入当前本地时间，并按设置页的“默认提示词 / 系统提示词 / 用户提示词”模式决定是否把 `role: "system"` 的系统设定转成 `role: "user"` 消息，兼容不接受 system role 的 DV4/Gemini/DeepSeek 类接口。
- `src/apps/backup/BackupScreen.tsx` 与 `StorageManagerPanel.tsx`：备份同时包含 `char-phone-framework`、朋友圈元数据、TTS 自定义音色预设和 IndexedDB 图片资产；导入失败会回滚原状态和图片。存储管理只提供人工选择删除、清空孤立图片或清空 TTS 缓存，不做任何自动清理。
- `src/shell/appCatalog.tsx`：手机壳桌面 App 目录。维护桌面分页图标、Dock 图标和 catalog 测试用 screen 列表；`src/App.tsx` 仍负责实际渲染。
- `src/shell/appIconOverrides.ts`：桌面/Dock 软件头像覆盖工具。维护默认小手机软件头像路径、覆盖值归一化、默认图识别和图标解析；主题页上传先写入 IndexedDB 图片资产库，`Desktop` 与主题预览统一通过 `PersistentImage` 解析，避免大图塞满 localStorage 或重开后失效。
- `src/shell/Desktop.tsx`：手机壳桌面 UI。负责桌面分页、Dock、图标、小组件、拖拽布局、图床入口、首次使用 42 教程提示和桌面教程；拖拽位置通过 `desktopLayout.ts` 生成主题作用域存储键，避免切换主题后沿用另一主题坐标造成重叠；不直接维护具体软件业务。
- `src/shell/desktopGuide.ts`：桌面 42 教程内容。维护教程章节、摘要和详情条目，供 `Desktop` 的折叠式教程弹窗渲染。
- `src/shell/firstUseGuideTip.ts`：首次使用 42 教程提示标记工具。只通过 localStorage 记录是否已提示，不进入 Zustand store 或 persist 迁移。
- `src/shell/FeatureRouter.tsx`：手机壳功能分发路由。只维护 `Screen` 到各 `src/apps/*` 屏幕组件的映射；不要把业务 UI 写回这里。
- `src/shell/GlobalMusicAudio.tsx`：全局隐藏 audio 元素。负责让音乐播放器跨桌面和软件页面持续播放；音乐库和播放器 UI 仍在 `src/apps/music/`。
- `src/shell/LockScreen.tsx`：锁屏 UI。接收通知、壁纸、解锁和打开通知回调；不直接读写全局状态。
- `src/shell/NotificationCenter.tsx`：通知中心和通知卡片 UI。通知数据派生仍在 `src/shell/notifications.ts`。
- `src/shell/appCatalog.test.ts`：桌面 App 目录结构测试，校验图标数量、分页、Dock 顺序和 screen 去重。
- `src/shell/notifications.ts`：手机壳层通知派生工具。只读取现有未读聊天、未接电话、日历提醒和备忘提醒，生成锁屏/通知中心列表与桌面角标，不写状态、不做后台调度。
- `src/shell/notifications.test.ts`：通知派生测试，覆盖未读消息、未接电话、日历提醒、备忘提醒和 App 角标汇总。
- `src/lifeEvents.test.ts`：生活事件时间线最小测试，覆盖归一化、读取筛选、高价值聊天门槛和 store 写入去重。
- `src/apps/active-events/activeEventsLogic.test.ts`：主动事件建议逻辑测试，覆盖手动冷却、少量建议、不凭空生成和确认写入草稿。
- `src/apps/active-events/activeEventsStore.test.ts`：主动事件冷却字段 store 测试。
- `src/components/WeChatLayout.tsx`：未来微信布局拆分占位；当前没有接入。
- `src/pages/`：旧微信占位页目录已清理。真实软件入口统一放在 `src/apps/<app-name>/`，后续不要再新增空占位页。

### `docs/`

- `docs/wechat.md`：微信模块文档。记录当前状态、本次改动、重要文件和后续维护方向。
- `docs/diary-plan.md`：日记模块详细构建思路。当前真实入口已在 `src/apps/diary/`。
- `docs/calendar-plan.md`：日历模块需求文档。当前真实入口已在 `src/apps/calendar/`。
- `docs/gallery-design.md`：相册设计模式。记录相册视觉结构、交互规则、数据规则和后续扩展。
- `docs/memo-plan.md`：备忘录模块需求文档。记录备忘录目标、数据结构、页面结构和实施顺序。
- `docs/bilibili-plan.md`：B站模块需求文档。记录只读取 B站条目、视频流、详情页、搜索生成、查手机摘要和实施顺序。
- `docs/life-system-framework.md`：小手机生活系统总框架。记录手机壳层、生活 App 层、生活事件层、角色记忆层和主动事件层；跨 App 改动先读这里。
- `docs/work-log.md`：每次修改追加工作记录，写清楚范围、原因、实际内容、同步文档、验证和后续事项。

### `模块/`

- `模块/微信/README.md`：微信入口函数、状态依赖、维护同步规则。
- `模块/QQ/README.md`：QQ 当前入口和维护边界。
- `模块/日记/README.md`：日记入口、状态和查手机关联。
- `模块/日历/README.md`：日历入口规划、状态规划和维护边界。
- `模块/相册/README.md`：相册入口、状态、可导入来源和维护边界。
- `模块/备忘录/README.md`：备忘录入口、状态升级规划和维护边界。
- `模块/电话/README.md`：电话/视频通话入口和 TTS 依赖。
- `模块/主题/README.md`：主题页、主题变量和维护边界。
- `模块/B站/README.md`：B站入口、状态、生成解析和维护边界。
- `模块/音乐/README.md`：音乐入口、状态、目录拆分方案和维护边界。
- `模块/角色导入/README.md`：全局/微信导入入口和角色卡解析链路。
- `模块/小红书/README.md`：小红书 App 入口、状态、AI 读取规则和维护边界。

## 当前真实入口地图

- App 壳：`src/App.tsx` -> `App`，并挂载 `src/shell/GlobalMusicAudio.tsx` 和 `src/shell/TtsQueueBar.tsx`。
- 启动门禁：`src/App.tsx` 当前直接进入锁屏流程，不再要求 Discord 或后门验证通过。
- 锁屏/通知中心：`src/App.tsx` -> `src/shell/LockScreen.tsx` 和 `src/shell/NotificationCenter.tsx`；通知数据来自 `src/shell/notifications.ts` 的 `buildShellNotifications` 和 `getShellNotificationBadges`，只从现有 store 数据派生；通知按钮和通知中心高度在 CSS 中按安全区适配，避免小屏/刘海屏遮住桌面软件。
- 桌面：`src/App.tsx` -> `src/shell/Desktop.tsx` -> `Desktop`、`Draggable`、`CustomWidgetView`、`AppIcon`；桌面 App 目录来自 `src/shell/appCatalog.tsx`。
- 功能分发：`src/App.tsx` -> `src/shell/FeatureRouter.tsx` -> `FeatureRouter`。
- 微信容器：`src/App.tsx` -> `src/apps/wechat/WeChatApp.tsx` -> `WeChatApp`，只负责微信四页签。
- 微信聊天列表：`src/apps/wechat/chats/WeChatChats.tsx` -> `WeChatChats`。
- 微信通讯录/导入酒馆卡/群聊/标签：`src/apps/wechat/contacts/WeChatContacts.tsx` -> `WeChatContacts`，导入解析依赖 `src/lib/charaParser.ts`。
- 微信发现入口/朋友圈/照片墙/表情包库：`src/apps/wechat/discover/WeChatDiscover.tsx` -> `WeChatDiscover`，内部用 `discoverView` 切换入口页和详情页；朋友圈真实 UI 在 `src/apps/wechat/moments/`，默认先展示好友动态流，点“发朋友圈”再展开发布器，支持图文发布、可见范围、角色自动回复、点赞、手动评论、单条刷回复、点击 char 进入 TA 的朋友圈主页，以及从 char 设定里提取好友身份生成评论。
- 微信我：`src/apps/wechat/me/WeChatMe.tsx` -> `WeChatMe`。
- 聊天房间/连续发送/图片发送/表情注释/人设世界书上下文/上下文消息数/接口失败重试/消息多选删除：`src/apps/wechat/chat/ChatScreen.tsx` -> `ChatScreen`。缺少聊天 API 接口地址或模型时显示未连接原因，不走固定本地回复；AI HTTP 429/500 等错误会在重试条前置显示状态码和返回详情。长聊天默认渲染最近 200 条，向上每次加载 100 条，不删除历史。
- 聊天气泡/多气泡拆分/图片/语音条/转写/播放中状态/多选圆点/小剧场剧情卡：`src/apps/wechat/chat/components/ChatBubble.tsx` -> `ChatBubble`，语音条 UI 在 `src/apps/wechat/chat/VoiceMessageBubble.tsx`，拆泡逻辑在 `splitAssistantBubbles`。气泡外观由主题页 `bubbleStyle` 独立选择，微信与 QQ 共用，`theme` 默认跟随整机主题；它不改变 `chatReplyStyle` 的短 RP、长 RP或自动拆泡行为。AI 完整回复经解析后由 `addMessages` 一次性保存，避免逐条延迟落库造成尾部截断。`theater` 消息及旧版以 `call-note` 保存且以 `【小剧场】` 开头的消息均支持展开、复制、收藏、单条删除和长按多选删除。
- 软件预设统一管理：`src/shell/FeatureRouter.tsx` -> `src/apps/presets/PresetsScreen.tsx`。状态在 `src/store.ts` 的 `chatPreset*`、`browserPreset*`、`xiaohongshuPreset*`、`bilibiliPreset*`、`phonePreset*`、`musicPreset*` 字段；完整的预设导入、条目开关、编辑、排序和删除只放在桌面“预设”App。
- 微信聊天预设/导入酒馆预设：扁平参数解析为 `parseSillyTavernPreset`，条目顺序/开关/身份解析在 `src/apps/wechat/presets/chatPresetEntries.ts`，编辑器为 `src/apps/presets/ChatPresetEntriesEditor.tsx`。微信“我 > 设置”只保留当前预设选择、条目摘要、跳转入口和生成参数；结构化条目按 system/user/assistant 身份逐条进入微信/QQ共用聊天请求。
- 微信生活化 AI：`src/apps/wechat/ai/` -> `buildWeChatSystemPrompt`、`parseWeChatReplyParts`；`ChatScreen` 负责把 AI 动作转为转账、红包、购物、表情包和生图消息。文字/语音/生活动作发送后默认触发角色回复；用户手动 AI 生图只发送图片和保存记录，不再自动触发第二轮回复；待回复草稿不会重复进入历史上下文。
- 微信群聊：`src/App.tsx` -> `WeChatChats` 和 `WeChatContacts`；状态在 `src/store.ts` 的 `groupChats`，聊天复用 `chatSessions`，群头像由 `WeChatGroupAvatar` 拼成员头像，AI 回复按成员逐个发言。
- 微信朋友资料：`src/App.tsx` -> `WeChatContacts` 内部 `profileId` 视图。
- 微信标签筛选：`src/App.tsx` -> `WeChatContacts` 内部 `activeTagFilter`，状态在 `src/store.ts` 的 `contactTags`。
- QQ：`src/App.tsx` -> `src/apps/qq/QQScreen.tsx`；QQ 壳、消息、联系人、频道、动态和个人主页在 `src/apps/qq/` 内拆分维护，聊天房间继续复用 `src/apps/wechat/chat/ChatScreen.tsx`，数据以 `channel: "qq"` 与微信隔离；API 回复链路按 `activeChannel` 生成微信/QQ 不同系统提示词，QQ 不再使用微信气泡文案。
- 日记：`src/App.tsx` -> `src/apps/diary/DiaryScreen.tsx`，状态在 `src/store.ts` 的 `DiaryEntry[] diaries`，支持列表、编辑、详情、标签/角色筛选和 char 日记生成。
- 查手机：`src/App.tsx` -> `src/apps/diary/PeekScreen.tsx`，展示逻辑在 `src/apps/peek/peekLogic.ts`。这是“查角色自己的手机”，不是查用户手机权限。按选中 char 展示 TA 手机里的最近聊天、日记、相册、日历、备忘、浏览器、小红书和音乐摘要；每个模块可点进对应子页面查看类似聊天列表、日记页、相册格子、日历/备忘/浏览/音乐列表的界面；日记/日历/相册/备忘/小红书/音乐只读取明确属于该角色的记录，没有明确记录时生成角色手机痕迹摘要。
- 日历：`src/App.tsx` -> `src/apps/calendar/CalendarScreen.tsx`，状态在 `src/store.ts` 的 `CalendarEvent[] calendarEvents`，支持月视图、今天页、日程列表、编辑页、详情页、收藏、筛选、经期快捷记录、节日显示和从日记/备忘录转入；今天页“接下来”只展示用户记录的未来日程，最近节日单独展示两个；查手机只读取角色自己的 char 日程，缺失时生成 TA 手机里的日程摘要。
- 相册：`src/App.tsx` -> `src/apps/gallery/GalleryScreen.tsx`，相册 UI 和照片分组/筛选/标签/可读范围/char 评价相关逻辑在 `src/apps/gallery/`；状态仍在 `src/store.ts` 的 `GalleryPhoto[] galleryPhotos` 和 `string[] galleryTags`，不改变用户数据结构。支持上传照片自动记录日期、按日期分组、点选/创建标签、设置 char 可读范围、char 评价、相簿筛选、收藏、隐藏，以及从桌面图床/微信照片墙导入；查手机只把明确关联该角色的照片当作 TA 手机相册内容。
- 备忘录：`src/App.tsx` -> `src/apps/memo/MemoScreen.tsx`，保持 `MemoEntry[]`、标签、置顶、锁定、提醒和转日历。
- 小红书：`src/App.tsx` -> `XiaohongshuApp`，真实代码在 `src/apps/xiaohongshu/`；状态在 `src/store.ts` 的 `XiaohongshuProfile xiaohongshuProfile`、`XiaohongshuNote[] xiaohongshuNotes` 和 `string[] xiaohongshuFollowingIds`，支持玩家形象编辑、推荐/关注/附近首页、刷新生成角色和世界路人笔记、从相册取图发布、我的发布、标签筛选、详情、关注、收藏和删除；没有相册图时不伪造笔记封面，AI 上下文只读取文字版小红书条目；生成风格读取 `xiaohongshuPreset*`。
- B站：`src/App.tsx` -> `BilibiliScreen`，真实代码在 `src/apps/bilibili/`；状态在 `src/store.ts` 的 `BilibiliVideoEntry[] bilibiliEntries` 和 `BilibiliSearchRecord[] bilibiliSearches`，支持视频流、搜索生成、详情页、弹幕、评论、收藏和观看记录；解析模型结果时只保留 B站或 `phone://bilibili/` 模拟条目；模型刷新读取 `bilibiliPreset*`。
- 音乐：`src/App.tsx` -> `MusicScreen`，真实代码在 `src/apps/music/MusicScreen.tsx`；状态在 `src/store.ts` 的 `musicTracks`、`musicPlaylists`、`musicListenRecords`、`musicPlayer` 和 `musicSourceConfig`，char 写歌读取 `musicPreset*`。
- 主动事件：`src/App.tsx` -> `src/apps/active-events/ActiveEventsScreen.tsx`。入口为桌面第二页“char主动”，手动触发 `buildTodayLifeRefreshSuggestions`，读取现有 App 数据生成少量建议；确认后通过 `buildActiveEventWrites` 写入对应 App 和 `lifeEvents`。其中 `send_image` 会在用户确认后调用 NAI 生图，再经过 `evaluateImageGenerationGate` 限制每角色/频道/用户冷却、每日额度、失败重试和重复 prompt，成功后写入微信图片消息、相册和生图记录。`buildRandomProactiveMessageWrites` 是可选随机主动层，开启后在小手机运行期间低频读取人设作息、主动程度和轻量生活事件草稿，写入微信私聊、`lifeEvents` 和日志；`char主动` 页的“立即测试随机主动”用 `manual_test` 模式立刻写入一条测试消息，方便检查效果但不打开自动随机。旅行/地点报备只在人设支持旅行、跑外勤、巡演、采风、流浪或频繁换地点时生成。冷却字段为 `activeEventLastRefreshAt`，随机主动开关为 `randomProactiveMessagesEnabled`。
- 小剧场：`src/App.tsx` -> `src/apps/theater/TheaterScreen.tsx`，逻辑在 `src/apps/theater/theaterLogic.ts`。
- 浏览器：`src/App.tsx` -> `src/apps/browser/BrowserScreen.tsx`。
- 视频通话：`src/App.tsx` -> `src/apps/video/VideoCallScreen.tsx`。
- 文本模型、TTS 与生图设置：`src/apps/settings/SettingsScreen.tsx`。TTS 与生图使用独立 provider profiles，切换时恢复各自地址、Key、模型与参数；公益站支持多个命名配置。GPT Image 地址、尺寸、质量和 150 秒超时在 `src/lib/naiImage.ts` 统一规范；网页传输在 `src/lib/nativeImageBridge.ts` 与 `/api/image/proxy`，APK 使用同名原生事件协议。
- 收藏页/订单与卡包：`src/App.tsx` -> `WeChatMe` 的内部视图。
- 生活事件时间线：`src/lifeEvents.ts` -> `LifeEvent`、`buildLifeEvent`、`normalizeLifeEvents`、`getLifeEventTimeline`、`isHighValueChatLifeEventInput`；`src/store.ts` -> `lifeEvents`、`addLifeEvent`、`deleteLifeEvent`。
- AI 上下文：`src/apps/ai-context/AIContextScreen.tsx` 与 `contextPackage.ts`。每个来源拥有稳定 `sectionId`，可按角色从生成上下文排除或恢复；只影响生成结果，不删除来源 App 数据。
- 全局状态和迁移：`src/store.ts` -> `useAppStore` persist -> `migratePersistedAppState()`。当前 persist version 为 75；界面字体扩展为系统字体加 10 套本地仓库字体，旧字体 ID 保留；微信/QQ共用 `chatBackgroundImage`，旧记账记录默认按支出兼容，现有角色卡、预设、订单和软件头像覆盖继续保留。
- ID 生成：`src/lib/utils.ts` -> `createId`。

## 黑屏排查顺序

1. 确认浏览器端口是不是当前项目。`3000` 可能被旧项目占用；当前项目可另起 `3001` 或更高端口。
2. 看小手机是否显示 `小手机界面崩了` 错误兜底。如果显示，按错误文本定位。
3. 查 `src/shell/FeatureRouter.tsx` 是否把目标 screen 分发到真实组件。
4. 查 `src/store.ts` persist version/migrate，避免旧 localStorage 把 screen 或主题带到异常状态。
5. 跑 `npm run lint` 和 `npm run build`。

## 文档同步规则

- 改 `src/App.tsx`：同步文件头函数列表，必要时同步本文件“当前真实入口地图”。
- 改 `src/store.ts`：同步 persist version、迁移说明和状态字段说明。
- 改具体模块：同步对应 `docs/*-plan.md` 或 `docs/wechat.md`。
- 改生活事件、角色记忆、通知、锁屏或主动事件：同步 `docs/life-system-framework.md`。
- 每次实际修改：追加 `docs/work-log.md`。
- 新增软件入口：优先放在 `src/apps/<app-name>/`，并在本文件登记入口；不要再新增仅返回 `null` 的 `src/pages/*` 占位文件。
## 2026-05-07 电话模块补充

- `src/apps/phone/PhoneScreen.tsx`：电话模块真实 UI。包含最近通话、角色拨号、呼叫中、来电中、通话中、通话详情、短口语电话 AI 回复和写入聊天记录按钮。
- `src/App.tsx`：仍负责应用壳；功能分发在 `src/shell/FeatureRouter.tsx`。电话 screen 只由路由 import 并渲染 `PhoneScreen`，不要再把电话业务逻辑塞回本文件。
- `src/store.ts`：电话记录历史上由 persist 41 引入；当前总持久化版本已经升级为 75，维护时以“全局状态和迁移”条目为准。
- `src/tts.ts`：TTS provider 工具。负责浏览器内置语音、本地 HTTP、OpenAI、Gemini、MiniMax `t2a_v2` 与豆包 v3/旧版请求构造、响应解析、队列调度、缓存读取和播放。网页跨域代理由 `src/ttsProxyPolicy.ts`、`vite.config.ts` 和 `api/tts/proxy.js` 限制到可信 TTS 域名，APK 继续使用原生网络桥。
