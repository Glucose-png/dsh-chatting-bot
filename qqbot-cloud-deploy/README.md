# QQ Bot Bridge - 云端部署包

## 快速开始

1. 将本目录上传到阿里云 ECS
2. 执行 `bash cloud-setup.sh`
3. 编辑 `config.json` 填入你的公网 IP
4. 启动服务: `sudo systemctl start qqbot-bridge`

## 详细指南

请阅读 [cloud-deploy-guide.md](cloud-deploy-guide.md) 获取完整部署步骤。

## 架构

```
本地 QQ+SnowLuma → 公网 → 阿里云 ECS (Bridge) → 本地 DSH
```

## 依赖

- Node.js 20+
- Ubuntu 22.04 (推荐)

## 费用

- 阿里云新人免费 ECS: 1-3 个月
- 后续约 ¥30-50/月 (1核2GB)