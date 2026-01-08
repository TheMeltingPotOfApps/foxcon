# Server Setup Guide

This guide explains how to set up the SMS Platform on a fresh server.

## Quick Start

Run the automated setup script:

```bash
sudo ./setup-server.sh
```

This script will install and configure:
- Node.js 20
- PostgreSQL 15
- Redis
- RabbitMQ
- Python 3 and dependencies
- Asterisk PBX
- All application dependencies

## Manual Setup (Alternative)

If you prefer to set up manually or the automated script fails:

### 1. System Requirements

- Ubuntu 20.04+ or Debian 11+
- Root or sudo access
- At least 4GB RAM
- 20GB+ disk space
- Internet connection

### 2. Install System Dependencies

```bash
# Update system
sudo apt-get update
sudo apt-get upgrade -y

# Install basic tools
sudo apt-get install -y build-essential curl wget git vim
```

### 3. Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
sudo npm install -g pm2
```

### 4. Install PostgreSQL

```bash
sudo apt-get install -y postgresql-15 postgresql-contrib-15
sudo systemctl start postgresql
sudo systemctl enable postgresql

# Create database and user
sudo -u postgres psql << EOF
CREATE USER sms_user WITH PASSWORD 'sms_password';
ALTER USER sms_user CREATEDB;
CREATE DATABASE sms_platform OWNER sms_user;
GRANT ALL PRIVILEGES ON DATABASE sms_platform TO sms_user;
\q
EOF
```

### 5. Install Redis

```bash
sudo apt-get install -y redis-server
sudo systemctl start redis-server
sudo systemctl enable redis-server
```

### 6. Install RabbitMQ

```bash
# Add RabbitMQ repository
curl -fsSL https://github.com/rabbitmq/signing-keys/releases/download/3.0/rabbitmq-release-signing-key.asc | sudo apt-key add -
echo "deb https://ppa1.novemberain.com/rabbitmq/rabbitmq-erlang/ubuntu $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/rabbitmq.list
echo "deb https://ppa1.novemberain.com/rabbitmq/rabbitmq-server/ubuntu $(lsb_release -cs) main" | sudo tee -a /etc/apt/sources.list.d/rabbitmq.list

sudo apt-get update
sudo apt-get install -y rabbitmq-server

# Start and configure
sudo systemctl start rabbitmq-server
sudo systemctl enable rabbitmq-server

# Create user
sudo rabbitmqctl add_user sms_user sms_password
sudo rabbitmqctl set_user_tags sms_user administrator
sudo rabbitmqctl set_permissions -p / sms_user ".*" ".*" ".*"
sudo rabbitmqctl enable_management_plugin
```

### 7. Install Python and Dependencies

```bash
sudo apt-get install -y python3 python3-pip python3-venv
pip3 install uvicorn fastapi pydantic numpy torch
```

### 8. Install Asterisk

#### Option A: From Package (Recommended)

```bash
sudo apt-get install -y asterisk asterisk-dev sox libsox-fmt-all
sudo systemctl start asterisk
sudo systemctl enable asterisk
```

#### Option B: From Source

See [ASTERISK_SETUP_GUIDE.md](ASTERISK_SETUP_GUIDE.md) for detailed instructions.

### 9. Configure Asterisk AMI

Edit `/etc/asterisk/manager.conf`:

```ini
[general]
enabled = yes
port = 5038
bindaddr = 127.0.0.1

[admin]
secret = your_secure_password_here
deny = 0.0.0.0/0.0.0.0
permit = 127.0.0.1/255.255.255.255
read = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan
write = system,call,log,verbose,command,agent,user,config,dtmf,reporting,cdr,dialplan
```

Reload Asterisk:
```bash
sudo asterisk -rx "manager reload"
```

### 10. Install Application Dependencies

```bash
cd /path/to/SMS

# Backend
cd backend
npm install
npm run build

# Frontend
cd ../frontend
npm install

# TTS Service
cd ../kokoro
pip3 install -r requirements.txt  # if requirements.txt exists
```

### 11. Configure Environment Variables

Copy example files and update with your values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
```

Edit `backend/.env` with your database credentials, JWT secrets, API keys, etc.

### 12. Run Database Migrations

```bash
cd backend
npm run migration:run
# Or manually run SQL files from backend/migrations/
```

### 13. Start the Application

```bash
cd /path/to/SMS
./restart.sh
```

## Verification

Check that all services are running:

```bash
# Check ports
netstat -tlnp | grep -E ":5001|:5002|:8000|:5038"

# Check processes
ps aux | grep -E "nest|next|api_server|asterisk"

# Test endpoints
curl http://localhost:5002/api/health
curl http://localhost:5001
curl http://localhost:8000/health
```

## Troubleshooting

### Asterisk Installation Issues

If Asterisk installation fails:
1. Check system logs: `journalctl -u asterisk`
2. Verify dependencies: `dpkg -l | grep asterisk`
3. Try manual installation from source (see ASTERISK_SETUP_GUIDE.md)

### Database Connection Issues

1. Verify PostgreSQL is running: `sudo systemctl status postgresql`
2. Check credentials in `backend/.env`
3. Test connection: `psql -h localhost -U sms_user -d sms_platform`

### Port Already in Use

If ports are already in use:
1. Find the process: `lsof -i :5002` (or relevant port)
2. Stop it: `./stop.sh`
3. Or change ports in `.env` files

## Next Steps

After setup:
1. Configure Twilio credentials in backend
2. Set up SSL certificates (see scripts/setup-ssl.sh)
3. Configure Nginx reverse proxy (see scripts/setup-nginx.sh)
4. Set up monitoring and logging
5. Configure backups

## Support

For issues:
- Check logs: `tail -f /tmp/backend.log /tmp/frontend.log`
- Review documentation in project root
- Check service status: `./validate.sh`



