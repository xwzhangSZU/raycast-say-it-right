# English Speaking Coach — Raycast 扩展设计

- **日期**: 2026-05-29
- **状态**: 已通过设计评审,待写实现计划
- **平台**: Raycast (macOS),TypeScript + React (`@raycast/api`)

---

## 1. 目标

选中任意英文文本后,通过 Raycast 弹出一个面板,告诉我**这句话该怎么读**:

- 标出**重音**(词重音 + 句中实词重读)、**升/降调**、**意群停顿**、**节奏**、**连读**;
- 给出 **General American** 的 IPA;
- 用 **TTS 朗读示范音**,支持**慢速**与**复读**;
- 用一套清晰的**文本图示**展示「起伏」。

分析由大语言模型生成;朗读由 provider 神经 TTS 完成。Provider 支持 **OpenAI** 与 **Qwen** 两家,可在偏好里设默认、在面板里随手切换。

---

## 2. 已确认的设计决策(锁定项)

| 项 | 决策 |
|---|---|
| 可视化 | **风格 B(文本标注)为主体 + 风格 C(节奏条)**;等宽代码块对齐,**单色**,靠加粗/大写/符号区分(Markdown 正文无法上色) |
| 分析输出 | **方案 1**:LLM 返回**结构化 JSON**,扩展端**确定性渲染** Markdown(保证标记对齐与节奏条稳定) |
| Provider | **OpenAI + Qwen** 双家,可插拔;偏好设默认 + 面板内 `⌘P` 随手切换重分析 |
| 口音 | 默认 **General American (GA)**;RP 留作 v2 一行开关 |
| TTS | **Provider 神经 TTS**(OpenAI `gpt-4o-mini-tts` / Qwen `qwen3-tts-flash`) |
| 慢速 | 让 provider 用**更慢教学语速重读**(`instructions`/prompt),缓存「正常+慢速」两版 |
| 复读 | 重播缓存音频,零额外开销 |
| 播放层 | macOS 自带 **`afplay`** 播放临时音频文件 |
| Qwen 接口 | **非实时 HTTP**(一问一答),**不用** realtime WebSocket |

---

## 3. 形态与入口

**一个主命令** `Analyze Text`(`view` 命令,可绑全局热键):

1. 启动即 `getSelectedText()` 读取选中文本;
2. 有选中 → 直接分析 → 渲染 `Detail`;
3. 无选中 → 渲染 `TextInputForm` 让用户粘贴/输入 → 分析(手动兜底,不单独占一个命令);
4. **词/句判定**:选中为**单个词** → 分析该词 **并生成一个示范例句**来练;选中为**短语/句子** → 直接分析原文。

---

## 4. 模块结构

遵循「小文件 + provider 注册表/工厂 + config 驱动」(贴合用户全局代码规范)。

```
english-speaking-coach/
├── package.json              # Raycast manifest:commands + preferences
├── tsconfig.json
├── src/
│   ├── analyze-text.tsx          # 命令入口:选区 → 分析 → Detail 编排
│   ├── components/
│   │   ├── AnalysisDetail.tsx    # Detail 视图 + ActionPanel(播放/慢速/复读/切 provider)
│   │   └── TextInputForm.tsx     # 手动输入兜底 Form
│   ├── llm/                      # 分析 provider 抽象(registry + factory)
│   │   ├── index.ts              # getAnalysisProvider(name)、注册表
│   │   ├── types.ts              # AnalysisProvider 接口
│   │   ├── openai.ts             # OpenAI chat → ProsodyAnalysis
│   │   ├── qwen.ts               # Qwen(OpenAI 兼容端点)→ ProsodyAnalysis
│   │   └── prompt.ts             # 分析 prompt + JSON schema + 修复
│   ├── tts/                      # TTS provider 抽象
│   │   ├── index.ts              # getTTSProvider(name)
│   │   ├── types.ts              # TTSProvider 接口
│   │   ├── openai.ts             # /v1/audio/speech → wav → 临时文件
│   │   ├── qwen.ts               # multimodal-generation → base64/url → 临时文件
│   │   └── playback.ts           # afplay 封装 + 临时文件 + 音频缓存
│   ├── render/
│   │   ├── markdown.ts           # ProsodyAnalysis → B+C 等宽 Markdown(核心)
│   │   └── align.ts              # 把标记列对齐到词上方
│   ├── lib/
│   │   ├── preferences.ts        # 类型化读取 Raycast 偏好
│   │   ├── cache.ts              # 分析缓存 + 音频缓存(Raycast Cache / LocalStorage)
│   │   └── errors.ts             # error 类型 + Toast 帮助函数
│   └── types.ts                  # ProsodyAnalysis 核心 schema
```

---

## 5. 核心数据契约 `ProsodyAnalysis`

整个扩展的「细腰」:LLM 只产出结构化数据,渲染完全由代码掌控。

```ts
type Tone = "fall" | "rise" | "fall-rise" | "rise-fall" | "level";
type Link = "liaison" | "elision" | "intrusion" | null;

interface Word {
  text: string;            // "finish"
  syllables: string[];     // ["fin", "ish"]
  stressIndex: number | null; // 词重音落在第几音节;弱读功能词为 null
  stressed: boolean;       // 句中是否重读(实词 vs 弱读)
  nuclear: boolean;        // 是否该意群的调核(核心重音)
  ipa?: string;            // 该词 GA IPA
  linkToNext?: Link;       // 与下一词的连读关系
}

interface ThoughtGroup {
  tone: Tone;              // 该意群核心调位
  words: Word[];
}

interface ProsodyAnalysis {
  text: string;            // 被分析句(单词输入时 = 生成的示范例句)
  isGeneratedExample: boolean;
  sourceWord?: string;     // isGeneratedExample 时的原词
  ipa: string;             // 整句 GA IPA
  thoughtGroups: ThoughtGroup[];
  notes?: string;          // 1–2 句最关键的发音提示
}
```

LLM 调用使用 JSON 模式 / `json_schema` 结构化输出;失败时降级为 prompt 强制 JSON。返回后做 **schema 校验 + 一次修复重试**。

---

## 6. 可视化渲染契约(B + C)

`render/markdown.ts` 把 `ProsodyAnalysis` 渲染为 `Detail` 的 Markdown。**无颜色**,靠加粗/大写/符号 + 等宽代码块对齐。

**符号约定**

| 符号 | 含义 |
|---|---|
| `●` | 重读音节(标在词上方) |
| `·` | 弱读 |
| `↗` / `↘` / `↗↘` | 升 / 降 / 升降调(标在意群调核处) |
| `‖` | 意群分界(停顿) |
| 大写音节 + **加粗** | 句中重读实词(如 `FIN·ish`) |
| `‿` | 连读 |

**目标渲染(以 `If you finish early, give me a call.` 为例)**

```
🗣️ How to say it

> If you finish early, give me a call.

Stress & Intonation
    ·    ·    ●        ● ↗   ‖    ●     ·  ·   ● ↘
    if   you  FIN·ish  EAR·ly      GIVE  me a   CALL
    /ɪf ju ˈfɪnɪʃ ˈɜːli ‖ ˈɡɪv mi ə ˈkɔːl/
    linking: finish‿early · give·me‿a

Rhythm — stress-timed beats
    ·    ·    ●     ●    ‖   ●        ●
    if   you  FIN   EAR      GIVE     CALL
```

- 标记行与单词行在**代码块(等宽)**中用代码计算空格对齐(`align.ts`),不依赖 LLM 数空格。
- 节奏条由 `stressed === true` 的实词推导落拍 `●`,弱读 `·`。
- **超长句**:按 `thoughtGroups` 折行,避免代码块横向溢出换行错位。
- 播放/慢速/复读为 ActionPanel 快捷键,不在正文画按钮。

---

## 7. Provider 接入(基于官方文档核验)

### 7.1 分析侧(LLM → ProsodyAnalysis)

接口:`AnalysisProvider.analyze(text, { isWord }): Promise<ProsodyAnalysis>`

- **OpenAI**:Chat Completions / Responses,结构化输出(`json_schema`)。模型可配,默认建议小而强的模型(建表时确认型号)。
- **Qwen**:走 DashScope **OpenAI 兼容端点**
  - 国际:`https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
  - 北京:`https://dashscope.aliyuncs.com/compatible-mode/v1`
  - **复用同一个 OpenAI 风格客户端**,仅换 `baseURL` / `apiKey` / `model`(如 `qwen-flash` / `qwen-plus`)。
  - ⚠️ 待验:兼容端点对 `json_schema` 的支持程度;不支持则退到「prompt 强制 JSON + 解析 + 修复」。

### 7.2 TTS 侧(text → 音频文件)

接口:`TTSProvider.synthesize(text, { speed, voice }): Promise<string /* 音频文件路径 */>`

**OpenAI**(来源:developers.openai.com/api/docs/guides/text-to-speech)
- `POST https://api.openai.com/v1/audio/speech`,`Authorization: Bearer <OPENAI_API_KEY>`
- `model: "gpt-4o-mini-tts"`(也有 `tts-1` / `tts-1-hd`);11 个音色(alloy/ash/coral/echo/fable/onyx/nova/sage/shimmer…)
- `instructions`:自然语言控制语气**与语速**(慢速教学、强调重读词、GA 口音)
- `response_format`:默认 mp3,可要 `wav` / `pcm` / `opus` 等 → **直接拿音频字节**写临时文件
- `tts-1` / `tts-1-hd` 另支持数值 `speed`(0.25–4.0)

**Qwen 非实时**(来源:help.aliyun.com/zh/model-studio/qwen-tts-api)
- `POST https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation`(国际换 `dashscope-intl`),`Authorization: Bearer <DASHSCOPE_API_KEY>`
- `model: "qwen3-tts-flash"`;带风格/慢速用 `qwen3-tts-instruct-flash` + `instructions`(如「语速较慢、上扬语调」)+ `optimize_instructions`
- `voice`(Cherry/Ethan/…),`languageType: "English"`
- 返回 **base64 / URL 音频**(支持流式与非流式;本扩展用非流式)→ 下载/解码为临时文件
- **不用** realtime(WebSocket `qwen-tts-realtime`):整句一次合成 + 缓存复读,realtime 是过度工程

### 7.3 播放 / 慢速 / 复读
- 统一:临时音频文件 → `afplay <file>`(macOS 内置)。
- 慢速:provider 端「更慢教学语速重读」(`instructions`/prompt);缓存正常 + 慢速两版。
- 复读:重播上次缓存音频。

---

## 8. 数据流

```
选中文本 (getSelectedText)
  └─(空)→ TextInputForm → 文本
  └─ 词/句判定
       └─ 查分析缓存 (key = text + provider + accent)
            ├─ 命中 → 用缓存 ProsodyAnalysis
            └─ 未命中 → AnalysisProvider.analyze() → schema 校验/修复 → 写缓存
       └─ render/markdown.ts → Markdown
       └─ <Detail markdown metadata> + ActionPanel
            ├─ ↵  播放      → TTSProvider.synthesize(speed=1.0) → afplay(+音频缓存)
            ├─ ⌘S 慢速 0.6× → synthesize(slow) 或缓存 → afplay
            ├─ ⌘R 复读      → 重播缓存
            ├─ ⌘P 切 provider → 换 provider 重分析,刷新 Detail
            ├─ ⌘D 换示范例句(单词输入时)
            └─ ⌘C 复制标注 / IPA
```

---

## 9. 偏好设置(`package.json` preferences)

- `defaultAnalysisProvider`:`openai` | `qwen`
- `openaiApiKey`(password)、`openaiAnalysisModel`、`openaiTtsVoice`
- `qwenApiKey`(password)、`qwenAnalysisModel`、`qwenTtsVoice`、`qwenRegion`(`beijing` | `intl`,影响 baseURL,默认 `beijing`)
- `ttsProvider`:`follow-analysis` | `openai` | `qwen`(默认 `follow-analysis`)
- `slowRate`:慢速倍率(默认 0.6×);编码进 `instructions` 作为目标教学语速,provider 支持数值 speed 时(如 OpenAI `tts-1`)直接用作 `speed` 值
- 口音固定 **GA**(v1)

Key 仅存 Raycast 安全偏好,**绝不写日志**。

---

## 10. 错误处理

specific error + Raycast `showToast` / `showFailureToast`:

- 无选区 → 转 `TextInputForm`(不算错误)
- 缺对应 provider 的 key → Toast 带「打开偏好设置」动作
- 网络 / LLM 调用失败 → Toast + 重试动作,保留 UI
- JSON 不合法 → 一次修复重试;再失败 → 降级显示原始文本 + Toast
- TTS 失败 → Toast;不影响分析阅读

---

## 11. 缓存

- **分析缓存**:key = `text + provider + accent`,避免重复调用与延迟。
- **音频缓存**:key = `text + provider + voice + speed`,临时目录存音频路径,复读/慢速复用;定期清理旧临时文件。
- 用 Raycast `Cache` / `LocalStorage`。

---

## 12. 测试策略(TDD,重点测纯逻辑)

| 目标 | 方式 |
|---|---|
| `render/markdown.ts` + `align.ts` | **快照测试**:ProsodyAnalysis fixture → 期望 Markdown(含对齐与节奏条)。核心正确性 |
| `llm/prompt.ts` | schema 校验 + JSON 修复单测(喂坏数据) |
| provider 适配器 | mock fetch,断言**请求形状**(端点/头/体),用文档样例响应作 fixture 解析 |
| `tts/playback.ts` | mock `afplay`(child_process),断言临时文件写入与命令 |
| 词/句判定、缓存 key | 单测 |
| 集成冒烟 | `ray develop` 真机选词;`ray lint` + `tsc` |

---

## 13. 范围与风险(诚实)

**v1 内**:OpenAI + Qwen;B + C 可视化;播放 / 慢速 / 复读;选区 + 手动入口;GA 口音。

**v2(同架构可扩展)**:
- Gemini provider(`gemini-3.1-flash-tts-preview`,`:generateContent` 返回 base64 PCM s16le/24kHz/mono 需包 WAV;prompt + audio tags 控制风格/口音/语速)——**并非落后,仅范围收敛**
- 风格 A 音高曲线 SVG 图(动态生成图片嵌入,需先验证 Raycast SVG/图片渲染)
- 历史 / 收藏复练、逐词点读、RP 开关、三家对比视图

**风险与缓解**:
1. LLM 产出的 IPA/重音偶有不准(罕见词)→ 好 prompt + 固定 GA 约定 + `notes`;可日后接 CMUdict 校验真值。
2. 超长句等宽换行错位 → 按意群折行。
3. Qwen 兼容端点 `json_schema` 支持待验 → 退到 prompt 强制 JSON + 修复。
4. TTS 调用成本 → 缓存正常 + 慢速,复读复用。
5. 仅 macOS(`afplay`)→ 扩展本就限 macOS,合理。

---

## 14. 参考(已核验的官方文档)

- OpenAI TTS: https://developers.openai.com/api/docs/guides/text-to-speech
- Qwen 非实时 TTS: https://help.aliyun.com/zh/model-studio/qwen-tts-api
- Qwen realtime TTS(参考,不用): https://help.aliyun.com/zh/model-studio/qwen-tts-realtime-api-reference/
- Gemini TTS(v2 参考): https://ai.google.dev/gemini-api/docs/speech-generation
