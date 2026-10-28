# dsh-chatting-bot

一个跑在 Windows 上的「QQ 群陪聊 + 私聊助理」机器人：基于 [DeepSeek Harness](https://github.com/deepseek-ai) 的 agent 运行时，
通过 **SnowLuma**（OneBot 网关）接 QQ，配 **qq-bridge** 做消息路由 / 人设 / 工具协议，再加本地 **GPT-SoVITS** 语音合成和 B 站内容抽取等小工具。

> 这个仓库只放**源码和配置模板**。模型权重（tts/GPT-SoVITS、dl/、assets/）、虚拟环境、node_modules、
> SnowLuma 运行时分发、以及所有密钥（`config.json`、`.env`、state/、cookies）都不在仓库里，需要自己准备。

## 目录结构

| 路径 | 作用 |
| --- | --- |
| `qqbot/qq-bridge/` | 核心桥接：QQ 消息 ↔ DSH agent，含人格预设、MCP 工具、控制面板 |
| `qqbot/panel/` | 本地控制面板（模式切换、日志、Token 统计等） |
| `qqbot/assets/` | 头像 / 立绘等图片素材 |
| `SnowLuma/` | 启动脚本与网关配置（`app/` 里的 node 运行时需自行下载） |
| `tts/` | GPT-SoVITS 推理封装脚本（`start-tts.ps1`、`asr_*.py` 等），模型与参考音频需自备 |
| `tools/` | 本机运维小脚本：设 owner、发测试消息、自启注册等 |
| `bili/` | B 站视频抽取 / 每日推送脚本 + 登录态 |
| `qqbot-cloud-deploy/` | 云端（Linux）部署用的另一套配置与文档 |
| `使用文档.md` | **完整中文使用文档**（功能、坑、Token 方案、常见问题） |

## 快速开始

```bat
:: 1. 准备配置（模板复制成真实配置，再填 QQ 号 / token）
copy qqbot\qq-bridge\config.example.json qqbot\qq-bridge\config.json

:: 2. 启动网关（SnowLuma 会拉起 QQ 协议端；WebUI 在 http://127.0.0.1:5099）
SnowLuma\启动SnowLuma.bat

:: 3. 启动桥接
qqbot\qq-bridge\start.bat
```

语音（可选）：双击 `启动语音服务.bat`；一键全启：`启动QQ机器人.bat`。

## 两条会话线

- **群聊 / 陪聊模式**（`reserved2`）：水群、接梗、发表情和语音，工具受白名单限制。
- **私聊 / 助理模式**（`closed-agent`）：可以调本机桌面工具干活。
  切换方式：面板按钮、斜杠命令 `/mode chat|work`、或私聊里直接说「切到助理模式」/「切回陪聊」。

## 注意

- 机器人号必须和主人号**不是同一个**，否则会互踢。
- `config.json` 里有 SnowLuma accessToken 与 ownerQQ，已被 `.gitignore` 排除；仓库里只有 `config.example.json`。
- 仓库里的个人标识都换成了占位符：QQ 号 `100000000`、SnowLuma 面板密码 `change-me`。
  面板密码请用环境变量提供（脚本和面板会自动读取）：

  ```bat
  setx SNOWLUMA_WEBUI_BOOTSTRAP_PASSWORD 你的密码
  ```

- `tools/` 和各启动脚本里的绝对路径（`E:\dsh_chatting_bot`、`C:\Users\<user>`）是原作者本机环境，换机器要按实际路径改。
- 本项目大量依赖 DSH 的插件机制（`cordis.patch.yml`），跟着 DSH 版本升级可能需要同步调整。
