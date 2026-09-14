# 《铃声回响》RingEcho

> 澧城的雨季漫长而压抑，两座孤岛在洪流中漂流。当整个世界都在下沉，你唯一能抓住的只有彼此。

《铃声回响》是一款基于 [SolidJS](https://www.solidjs.com/) + [TypeScript](https://www.typescriptlang.org/) + [Vite](https://vite.dev/) 开发的中文 Web 视觉小说，讲述一对失去父母的年轻兄妹在城中村出租屋里挣扎求生的故事。玩家将跟随主角布风的视角，面对贫困、威胁、司法体系的重重考验，在每一个关键路口做出选择——是独自扛起一切、筑起围墙，还是放下自尊、伸手求援？

> **在线游玩**：[ring-echo.vercel.app](https://ring-echo.vercel.app/)

## 故事简介

父母在一场车祸中离世后，布风（哥哥）和布铃（妹妹）相依为命，困在澧城一间不足三十平米的出租屋里。布铃因创伤后应激障碍辍学在家，而布风则靠打零工勉力维持两人的生活。

然而，威胁从未远离——社区工作人员的漠然、催债者的步步紧逼、黑暗中的偷窥者……每一次危机都在考验着两人脆弱的纽带。在这座冰冷的城市里，他们会成为彼此的天使，还是坠入深渊？

## 游戏 CG

<table>
  <tr>
    <td align="center"><img src="public/images/cg/cg04.webp" width="400"></td>
    <td align="center"><img src="public/images/cg/cg13.webp" width="400"></td>
  </tr>
  <tr>
    <td align="center"><img src="public/images/cg/cg11.webp" width="400"></td>
    <td align="center"><img src="public/images/cg/cg16.webp" width="400"></td>
  </tr>
  <tr>
    <td align="center"><img src="public/images/cg/cg18.webp" width="400"></td>
    <td align="center"><img src="public/images/cg/cg21.webp" width="400"></td>
  </tr>
</table>

## 制作说明

本游戏使用 AI 辅助创作：

| 环节        | 模型/工具       |
| ----------- | --------------- |
| 原作/设计   | GLM 4.7         |
| 脚本撰写    | DeepSeek V4 Pro |
| CG 与背景图 | GPT Image 2     |
| 背景音乐    | Suno            |
| 配音        | Mimo v2.5 TTS   |

## 系统要求

- 现代浏览器（Chrome / Edge / Firefox / Safari）
- Windows / macOS / Linux
- 1920×1080 分辨率（推荐）

## 本地开发

- Node.js 22+ 与 [pnpm](https://pnpm.io/)

| 命令          | 作用                             |
| ------------- | -------------------------------- |
| `pnpm install` | 安装依赖                         |
| `pnpm dev`    | 启动 Vite 开发服务器             |
| `pnpm build`  | 类型检查并构建产物（输出 `dist/`） |
| `pnpm preview` | 本地预览构建产物                 |

---

*「铃声响起的那个瞬间，你听到了什么？」*
