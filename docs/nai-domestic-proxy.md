# NAI 国内可用生图代理配置

前端、手机端、WebView 和国内用户不要直连 `image.novelai.net`。统一只访问自己的代理接口：

```env
VITE_NAI_PROXY_URL="/api/nai/generate-image"
```

如果是静态包、APK、或前端和代理不在同一个域名，改成完整地址：

```env
VITE_NAI_PROXY_URL="https://你的可访问域名/api/nai/generate-image"
```

服务端保存真实 NAI token：

```env
NAI_TOKEN="你的 NAI token"
NAI_ALLOWED_ORIGIN="*"
NAI_TIMEOUT_MS="45000"
```

服务端能直连 NovelAI 时：

```env
NAI_API_URL="https://image.novelai.net/ai/generate-image"
```

服务端不能直连 NovelAI 时，二选一。

使用可访问的 NAI 中转：

```env
NAI_RELAY_URL="https://你的中转域名/ai/generate-image"
```

或使用 HTTP/HTTPS 代理：

```env
NAI_HTTPS_PROXY="http://127.0.0.1:7890"
```

独立运行代理服务：

```bash
npm run nai:proxy
```

健康检查：

```text
GET /api/nai/health
```

生图请求：

```text
POST /api/nai/generate-image
```

这个接口会自动带 NovelAI 所需的浏览器型请求头，并把 zip/png 原样返回给前端。

请求体使用 NovelAI 图片接口格式：

```json
{
  "action": "generate",
  "input": "best quality, a small red apple on a clean white background",
  "model": "nai-diffusion-3",
  "parameters": {
    "width": 512,
    "height": 512,
    "scale": 5,
    "sampler": "k_euler_ancestral",
    "steps": 6,
    "n_samples": 1,
    "seed": 123456789,
    "ucPreset": 0,
    "qualityToggle": true,
    "sm": false,
    "sm_dyn": false,
    "dynamic_thresholding": false,
    "controlnet_strength": 1,
    "legacy": false,
    "add_original_image": false,
    "cfg_rescale": 0,
    "noise_schedule": "native",
    "negative_prompt": "lowres, blurry, text, watermark, logo, worst quality",
    "params_version": 3,
    "prefer_brownian": true,
    "deliberate_euler_ancestral_bug": false
  }
}
```

App 设置页的“NAI 小图测试”和命令行 `npm run nai:test` 都使用这一份请求体生成逻辑。
