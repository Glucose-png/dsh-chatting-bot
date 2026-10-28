# ============================================================
# QQ Bot Bridge - 阿里云部署完整指南
# 版本: 2026-10-25
# 架构: 本地 QQ+SnowLuma → 云端 Bridge → DSH
# ============================================================

## 一、架构说明

```
[本地电脑]                    [阿里云 ECS]
┌─────────────┐              ┌──────────────────┐
│ QQ.exe      │              │  Ubuntu 22.04    │
│ + SnowLuma  │──HTTP──→     │  Node.js 20      │
│ (端口3000)  │  公网访问     │  qq-bridge       │
└─────────────┘              │  (云端服务)       │
                             └──────────────────┘
                                     │
                             ┌───────▼────────┐
                             │  DSH (本地)     │
                             │  或 DSH 云端版   │
                             └─────────────────┘
```

**关键**: 云端 bridge 通过公网 HTTP 访问你本地电脑的 SnowLuma (端口 3000)。

---

## 二、阿里云注册与选购

### 2.1 注册阿里云 (免费)
1. 打开 https://www.aliyun.com
2. 点击"免费注册" → 手机号验证 → 完成实名认证
3. 领取新人礼包: https://free.aliyun.com/ (通常含 1-3 个月免费 ECS)

### 2.2 选购 ECS 实例
**推荐配置 (免费额度内)**:
- 地域: 华东1(杭州) 或 华北2(北京) — 延迟低
- 实例规格: ecs.t6-c1m1.large (1核2GB) — 免费额度通常包含
- 操作系统: Ubuntu 22.04 LTS 64位
- 带宽: 1Mbps (免费额度) 或按流量计费

**操作步骤**:
1. 登录阿里云控制台
2. 搜索"ECS" → 创建实例
3. 选择上述配置
4. 设置密码或密钥对
5. 安全组: 放行 3100 端口 (bridge 控制台)
6. 创建实例，记录公网 IP

### 2.3 费用说明
- 免费额度 ECS: ¥0/月 (新人通常有 1-3 个月)
- 超出后: 约 ¥30-50/月 (1核2GB)
- 流量: 按量计费，桥接流量很小 (每天约 100-500MB)

---

## 三、本地电脑配置

### 3.1 确保 SnowLuma 可公网访问
你本地电脑需要在路由器上做 **端口转发**:
- 转发规则: 公网IP:3000 → 本地IP:3000 (SnowLuma HTTP)
- 转发规则: 公网IP:3001 → 本地IP:3001 (SnowLuma WS)

**如何查看本地 IP**:
```
ipconfig  # Windows
```

**路由器端口转发**:
1. 登录路由器 (通常是 192.168.1.1)
2. 找到"端口转发"或"虚拟服务器"
3. 添加规则: 外部端口 3000 → 内部 IP:192.168.x.x:3000
4. 同样添加 3001

**注意**: 如果本地 IP 会变化，建议设置静态 IP 或使用 DDNS。

### 3.2 测试公网可达
在另一台设备 (手机流量) 访问:
```
http://<你的公网IP>:3000
```
应该能看到 SnowLuma 的响应。

**查看公网 IP**: 访问 https://myip.ipip.net

---

## 四、部署到阿里云

### 4.1 上传部署包
将 `qqbot-cloud-deploy.zip` 上传到阿里云:

```bash
# 在本地电脑执行 (需要替换 YOUR_ECS_IP)
scp -r qqbot-cloud-deploy.zip root@YOUR_ECS_IP:/root/
```

### 4.2 SSH 登录阿里云
```bash
ssh root@YOUR_ECS_IP
# 输入密码
```

### 4.3 执行部署
```bash
cd /root
chmod +x cloud-setup.sh
bash cloud-setup.sh
```

### 4.4 编辑配置
```bash
nano /opt/qqbot-bridge/qq-bridge/config.json
```

修改以下字段:
```json
{
  "snowluma": {
    "httpUrl": "http://<你的公网IP>:3000",
    "wsUrl": "ws://<你的公网IP>:3001"
  },
  "dsh": {
    "baseUrl": "http://127.0.0.1:14476",  // 本地 DSH 地址
    "provider": "deepseek-account",
    "model": "deepseek-flash"
  },
  "ownerQQ": 100000000
}
```

### 4.5 启动服务
```bash
sudo systemctl start qqbot-bridge
sudo systemctl status qqbot-bridge
sudo journalctl -u qqbot-bridge -f  # 查看日志
```

---

## 五、验证与使用

### 5.1 检查服务状态
```bash
sudo systemctl status qqbot-bridge
# 应该显示 "active (running)"
```

### 5.2 查看日志
```bash
sudo journalctl -u qqbot-bridge -f
```

### 5.3 在 QQ 私聊中测试
在 QQ 私聊中发送消息，观察日志:
- 连接 SnowLuma: 成功
- 连接 DSH: 成功
- 收到消息并回复

### 5.4 访问桥接控制台
```
http://YOUR_ECS_IP:3100
```

---

## 六、常见问题

### Q1: 云端连不上本地 SnowLuma
- 检查本地端口转发是否正确
- 检查防火墙是否放行 3000/3001
- 检查公网 IP 是否变化 (使用 DDNS)

### Q2: DSH 连接失败
- 确认本地 DSH 正在运行
- 确认 config.json 中的 baseUrl 正确
- 检查本地防火墙

### Q3: 桥接启动失败
```bash
sudo journalctl -u qqbot-bridge -n 50
```

### Q4: 费用控制
- 设置阿里云费用预警
- 使用按量计费而非包年包月
- 不用时停机 (但 IP 会变)

---

## 七、安全建议

1. **不要暴露 DSH 端口** (14476) 到公网
2. **使用防火墙** 只放行必要端口
3. **定期更新** Node.js 和依赖
4. **监控费用** 设置阿里云费用预警

---

## 八、替代方案

如果端口转发太复杂，可以考虑:

### 方案 A: 使用 frp 内网穿透
1. 在阿里云部署 frp server
2. 在本地部署 frp client
3. 通过 frp 隧道访问本地 SnowLuma

### 方案 B: 使用 Cloudflare Tunnel
1. 免费，无需端口转发
2. 配置 Cloudflare Tunnel 暴露本地服务
3. 通过 tunnel URL 访问

### 方案 C: 全套部署到云端
1. 在阿里云 Windows ECS 上安装 QQ
2. 注入 SnowLuma
3. 直接本地部署 bridge
4. 缺点: QQ 可能限制异地登录，且 Windows ECS 较贵

---

## 九、文件结构

```
qqbot-cloud-deploy/
├── qq-bridge/              # 桥接代码 (已复制)
│   ├── src/               # 源代码
│   ├── plugins/           # 插件
│   ├── config.json        # 配置文件 (需修改)
│   └── package.json       # 依赖
├── config-templates/
│   └── config-cloud.json  # 云端配置模板
├── cloud-setup.sh         # 部署脚本
├── cloud-deploy-guide.md  # 本指南
└── README.md              # 快速说明
```

---

## 十、快速命令参考

```bash
# 启动服务
sudo systemctl start qqbot-bridge

# 停止服务
sudo systemctl stop qqbot-bridge

# 重启服务
sudo systemctl restart qqbot-bridge

# 查看状态
sudo systemctl status qqbot-bridge

# 查看日志
sudo journalctl -u qqbot-bridge -f

# 开机自启
sudo systemctl enable qqbot-bridge
```

---

*最后更新: 2026-10-25*