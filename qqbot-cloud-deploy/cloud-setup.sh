#!/bin/bash
# ============================================================
# QQ Bot Bridge - 云端部署脚本 (Linux / Alibaba Cloud ECS)
# 用途：在云端部署 qq-bridge，连接本机的 QQ+SnowLuma
# ============================================================

set -e

echo "========================================"
echo " QQ Bot Bridge 云端部署脚本"
echo "========================================"

# 1. 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "[1/5] 安装 Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
else
    echo "[1/5] Node.js 已安装: $(node --version)"
fi

# 2. 创建部署目录
DEPLOY_DIR="/opt/qqbot-bridge"
echo "[2/5] 创建部署目录: $DEPLOY_DIR"
sudo mkdir -p $DEPLOY_DIR
sudo chown $USER:$USER $DEPLOY_DIR

# 3. 解压部署包
echo "[3/5] 解压部署包到 $DEPLOY_DIR"
if [ -f "qqbot-cloud-deploy.zip" ]; then
    unzip -q qqbot-cloud-deploy.zip -d $DEPLOY_DIR
    echo "  部署包已解压"
else
    echo "  未找到 qqbot-cloud-deploy.zip，请手动将文件复制到 $DEPLOY_DIR"
fi

# 4. 安装依赖
echo "[4/5] 安装 Node.js 依赖..."
cd $DEPLOY_DIR/qq-bridge
npm install --production 2>&1 | tail -5

# 5. 配置 systemd 服务
echo "[5/5] 创建 systemd 服务..."
sudo tee /etc/systemd/system/qqbot-bridge.service > /dev/null <<'SERVICEEOF'
[Unit]
Description=QQ Bot Bridge (Cloud)
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/qqbot-bridge/qq-bridge
ExecStart=/usr/bin/node src/bridge.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production

StandardOutput=journal
StandardError=journal
SyslogIdentifier=qqbot-bridge

[Install]
WantedBy=multi-user.target
SERVICEEOF

sudo systemctl daemon-reload
sudo systemctl enable qqbot-bridge

echo ""
echo "========================================"
echo " 部署完成！"
echo "========================================"
echo ""
echo "下一步操作："
echo "  1. 编辑配置文件: nano /opt/qqbot-bridge/qq-bridge/config.json"
echo "  2. 设置 snowluma.httpUrl 为你本机的 IP (如 http://192.168.1.100:3000)"
echo "  3. 启动服务: sudo systemctl start qqbot-bridge"
echo "  4. 查看日志: sudo journalctl -u qqbot-bridge -f"
echo ""
echo "  检查状态: sudo systemctl status qqbot-bridge"
echo ""