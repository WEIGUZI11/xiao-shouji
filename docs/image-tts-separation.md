# 生图与 TTS 分离实施说明

## 配置边界

- TTS：浏览器、本地 HTTP、OpenAI、Gemini、MiniMax、豆包。每个服务商独立保存地址、Key、模型、音色和音频参数。
- 生图：NovelAI、ComfyUI、公益站/自定义。公益站可建立多个命名配置，每个配置独立保存地址、Key、模型和响应格式。
- 两边的 Key 不交叉复用；MiniMax 音乐也不再借用 MiniMax TTS Key。

## 开关行为

- `ttsEnabled` 默认关闭；关闭后聊天和电话不自动合成，设置页仍可主动试听。
- `imageGenerationEnabled` 默认开启；关闭后统一生图入口在请求前抛错，设置测试按钮和软件生图入口同步禁用/隐藏。
- `proactiveImageGenerationEnabled` 默认关闭；只拦截 AI/char 主动生图，不影响手动生图。

## 软件覆盖与图片存储

微信/QQ 聊天、朋友圈、QQ 空间、小红书、相册和 char 主动全部调用 `requestAppImage()`。生成图写入 IndexedDB，应用状态只保存 `xiaophone://image/<id>` 引用。备份 JSON 包含图片资产、朋友圈元数据和自定义音色预设。

## 稳定性与手动管理

- 每次生图都会写入“生图任务”中心，记录来源、服务商、模型、尺寸、耗时和错误；刷新时仍处于排队/运行的任务会标为“已中断”，不会自动重试。
- TTS 使用全局 FIFO 队列，相同文本不会重复入队；顶部队列条可“停止全部”，同时中止当前网络/播放并清空等待项。
- TTS 音频按服务商、地址、模型、音色、参数和文本缓存，API Key 不进入缓存键。缓存硬上限 64 MiB，达到上限后不删除旧缓存，只跳过新缓存写入。
- 图片资产和 TTS 缓存均只允许在“数据备份 → 存储管理”中人工选择删除。没有 LRU、按时间清理或自动清空。
- 文本、生图、TTS 和音乐各自只有一个在途付费请求；功能之间允许并行，不做自动失败切换或自动计费重试。
- 持久化版本为 69。v68 的主题桌面位置、任务记录和各供应商独立配置会保留；备份导入失败会尝试原子回滚状态、辅助配置和图片资产。

## 真实测试

设置页“试听 TTS”和“小图测试”会调用当前服务商，但不自动失败切换。真实验收只对已配置的接口各消耗一次最小额度。当前工作区和验收浏览器未配置豆包、MiniMax、NAI 或公益站 Key，因此本轮未产生计费请求。

## v1.12 GPT Image 与双端传输

- OpenAI Images 地址会把域名或 `/v1` 规范成 `/v1/images/generations`；完整生成地址保持不变。
- GPT Image 1/1.5/mini 使用 `1024×1024`、`1536×1024` 或 `1024×1536`；GPT Image 2 校验像素、16 倍数和宽高比，非法值回落到标准尺寸。其他提供商不套用 GPT 尺寸。
- 小图测试对 GPT Image 固定为 `low + 1024×1024`；请求不强制 `response_format`，支持 URL、`b64_json`、顶层 base64 和 Responses `output[].result`。
- GPT Image 默认等待 150 秒，NAI、ComfyUI 和普通公益站默认 90 秒。生图任务中心的“停止当前生图”会把取消信号传到 APK 原生请求。
- APK 原生协议为 `small-phone-image-fetch`、`small-phone-image-cancel`、`small-phone-native-image-response`，限制 GET/POST、HTTP(S)、150 秒和 32 MiB。
- 网页对 OpenAI/NAI 可信域名使用 `/api/image/proxy`；额外公益站必须配置白名单，否则要求接口开放 CORS 或改用 APK。不会自动切换服务商或自动重试计费。
