# DocAI - Installation Guide (Ubuntu + Docker)

Simplified production installation for Ubuntu 22.04 LTS with auto-restart.

---

## Quick Installation

### 1. Install Docker
```bash
# Install Docker (one command)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker

# Enable auto-start on boot
sudo systemctl enable docker
```

### 2. Setup Application
```bash
# Clone and navigate
sudo mkdir -p /var/www/docai && sudo chown $USER:$USER /var/www/docai
cd /var/www/docai
git clone https://github.com/ardianwn/doc-assistants-v2.git .

# Configure environment
cp .env.production .env
nano .env  # Edit required values below
```

**Edit `.env` with your values:**
```bash
OPENAI_API_KEY=sk-proj-your-key-here           # Get from platform.openai.com
SECRET_KEY=$(openssl rand -hex 32)              # Generate unique key
POSTGRES_PASSWORD=your-strong-password-here     # Create strong password
ALLOWED_ORIGINS=http://YOUR_SERVER_IP:3000
NEXT_PUBLIC_API_URL=http://YOUR_SERVER_IP:8000
```

### 3. Deploy
```bash
cd /var/www/docai
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f

# Press Ctrl+C when you see "Application startup complete"
```

### 4. Create Admin User
```bash
# Create admin account
docker exec -it docai-backend python create_admin.py

# Follow prompts:
# - Email: admin@example.com
# - Password: (your choice)
# - Name: Admin
```

### 5. Configure Firewall
```bash
# Allow SSH (IMPORTANT!)
sudo ufw allow 22/tcp

# Allow application ports
sudo ufw allow 3000/tcp
sudo ufw allow 8000/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

---

## Verify Installation

### Check Services
```bash
# All containers should be "Up"
docker compose -f docker-compose.prod.yml ps

# Test backend
curl http://localhost:8000/monitoring/health

# Test frontend
curl http://localhost:3000
```

### Access Application
Open browser:
- Frontend: `http://YOUR_SERVER_IP:3000`
- Login with admin credentials created in step 4

---

## Auto-Restart Configuration

**Already configured!** No additional setup needed.

Docker automatically restarts containers:
- ✅ `restart: always` in docker-compose.prod.yml
- ✅ Docker service enabled on boot
- ✅ All containers will auto-start after server reboot

**Test auto-restart:**
```bash
# Reboot server
sudo reboot

# After reboot, check status
docker compose -f docker-compose.prod.yml ps
# All containers should be running
```

---

## Common Commands

### View Logs
```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# Specific service
docker compose -f docker-compose.prod.yml logs backend
docker compose -f docker-compose.prod.yml logs frontend
```

### Restart Services
```bash
# Restart all
docker compose -f docker-compose.prod.yml restart

# Restart specific service
docker compose -f docker-compose.prod.yml restart backend
```

### Stop Services
```bash
# Stop all
docker compose -f docker-compose.prod.yml stop

# Start all
docker compose -f docker-compose.prod.yml start
```

### Check Status
```bash
# Container status
docker compose -f docker-compose.prod.yml ps

# Resource usage
docker stats
```

### Update Application
```bash
cd /var/www/docai
git pull origin main
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d
```

---

## Troubleshooting

### Containers not starting
```bash
# Check logs
docker compose -f docker-compose.prod.yml logs

# Check environment
cat .env | grep -E 'OPENAI_API_KEY|SECRET_KEY|POSTGRES_PASSWORD'

# Restart
docker compose -f docker-compose.prod.yml restart
```

### Cannot access externally
```bash
# Check firewall
sudo ufw status

# Check ALLOWED_ORIGINS in .env
nano .env

# Restart after changes
docker compose -f docker-compose.prod.yml restart
```

### After reboot, containers not running
```bash
# Check Docker service
sudo systemctl status docker

# If not running:
sudo systemctl start docker

# Start containers
docker compose -f docker-compose.prod.yml up -d
```

---

## Quick Setup Summary

```bash
# 1. Install Docker (one-time)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
sudo systemctl enable docker

# 2. Clone & Configure
sudo mkdir -p /var/www/docai && sudo chown $USER:$USER /var/www/docai
cd /var/www/docai
git clone https://github.com/ardianwn/doc-assistants-v2.git .
cp .env.production .env
nano .env  # Fill in required values

# 3. Deploy
docker compose -f docker-compose.prod.yml up -d --build

# 4. Create admin
docker exec -it docai-backend python create_admin.py

# 5. Setup firewall
sudo ufw allow 22/tcp && sudo ufw allow 3000/tcp && sudo ufw allow 8000/tcp
sudo ufw enable

# Done! Access: http://YOUR_SERVER_IP:3000
```

---

**Installation Complete!** 🎉

Your application is now:
- ✅ Running on Docker containers
- ✅ Auto-restart enabled
- ✅ Accessible at `http://YOUR_SERVER_IP:3000`
- ✅ Will automatically start after server reboot
