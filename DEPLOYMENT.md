# SiteSense On-Site Server Deployment Guide

This guide provides comprehensive instructions for deploying SiteSense on your own infrastructure for maximum security, control, and compliance.

## Table of Contents

1. [On-Premise Server Setup](#on-premise-server-setup)
2. [Docker Deployment](#docker-deployment)
3. [Cloud Provider Setup](#cloud-provider-setup)
4. [Security Hardening](#security-hardening)
5. [Backup and Monitoring](#backup-and-monitoring)
6. [Troubleshooting](#troubleshooting)

## On-Premise Server Setup

### Hardware Requirements

#### Minimum Configuration (Small Office)
- **CPU**: Intel Core i3 or AMD equivalent (4 cores)
- **RAM**: 8GB DDR4
- **Storage**: 128GB SSD
- **Network**: Gigabit Ethernet
- **Users**: Up to 10 concurrent users

#### Recommended Configuration (Enterprise)
- **CPU**: Intel Core i7/Xeon or AMD equivalent (8+ cores)
- **RAM**: 32GB DDR4 or higher
- **Storage**: 512GB NVMe SSD + 2TB HDD for backups
- **Network**: Gigabit Ethernet with redundancy
- **Users**: 50+ concurrent users

### Operating System Setup

#### Ubuntu 22.04 LTS (Recommended)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y curl wget git build-essential software-properties-common

# Configure firewall
sudo ufw enable
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 5432/tcp  # PostgreSQL (internal only)
```

#### CentOS 8 / RHEL 8

```bash
# Update system
sudo dnf update -y

# Install EPEL repository
sudo dnf install -y epel-release

# Install essential packages
sudo dnf groupinstall -y "Development Tools"
sudo dnf install -y curl wget git

# Configure firewall
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --reload
```

### Database Installation & Configuration

#### PostgreSQL 15 Installation

**Ubuntu:**
```bash
# Install PostgreSQL
sudo apt install -y postgresql-15 postgresql-contrib-15

# Start and enable service
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

**CentOS/RHEL:**
```bash
# Install PostgreSQL repository
sudo dnf install -y https://download.postgresql.org/pub/repos/yum/reporpms/EL-8-x86_64/pgdg-redhat-repo-latest.noarch.rpm

# Install PostgreSQL
sudo dnf install -y postgresql15-server postgresql15-contrib

# Initialize database
sudo /usr/pgsql-15/bin/postgresql-15-setup initdb

# Start and enable service
sudo systemctl start postgresql-15
sudo systemctl enable postgresql-15
```

#### Database Configuration

```bash
# Switch to postgres user
sudo -u postgres psql

# Create application database and user
CREATE USER sitesense WITH PASSWORD 'your_secure_password_here';
CREATE DATABASE sitesense_production OWNER sitesense;
GRANT ALL PRIVILEGES ON DATABASE sitesense_production TO sitesense;

# Exit PostgreSQL
\q
```

**Configure PostgreSQL for production:**

Edit `/etc/postgresql/15/main/postgresql.conf`:
```conf
# Connection settings
listen_addresses = 'localhost'
port = 5432
max_connections = 100

# Memory settings
shared_buffers = 256MB
effective_cache_size = 1GB
work_mem = 4MB

# Write-ahead logging
wal_buffers = 16MB
checkpoint_completion_target = 0.9

# Logging
logging_collector = on
log_directory = 'log'
log_filename = 'postgresql-%Y-%m-%d_%H%M%S.log'
log_rotation_age = 1d
log_statement = 'mod'
```

Edit `/etc/postgresql/15/main/pg_hba.conf`:
```conf
# Local connections
local   all             sitesense                               md5
host    sitesense_production    sitesense    127.0.0.1/32    md5
host    sitesense_production    sitesense    ::1/128         md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### Node.js Installation

#### Using NodeSource Repository (Recommended)

```bash
# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### Using Node Version Manager (Development)

```bash
# Install nvm
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc

# Install and use Node.js 20
nvm install 20
nvm use 20
nvm alias default 20
```

### Application Deployment

#### 1. Create Application User

```bash
# Create dedicated user for the application
sudo adduser --system --group --home /opt/sitesense sitesense

# Create application directories
sudo mkdir -p /opt/sitesense/{app,logs,backups}
sudo chown -R sitesense:sitesense /opt/sitesense
```

#### 2. Deploy Application Code

```bash
# Switch to application user
sudo -u sitesense -s

# Navigate to app directory
cd /opt/sitesense

# Method 1: Clone repository directly into app directory
git clone https://your-repo/sitesense.git app
cd app

# Method 2: Upload application files and extract
# If uploading a tar/zip file:
# tar -xzf sitesense-app.tar.gz -C app/
# cd app

# Method 3: Copy from local build
# cp -r /path/to/built/application/* app/
# cd app

# Ensure package.json exists in the correct location
ls -la package.json  # This should show the package.json file

# Install dependencies (use --omit=dev instead of --production)
npm ci --omit=dev

# Build the application
npm run build

# Verify the build completed successfully
ls -la dist/  # Should show built files
```

#### 3. Environment Configuration

Create `/opt/sitesense/app/.env`:

```env
# Production Environment
NODE_ENV=production
PORT=3000

# Database Configuration
DATABASE_URL=postgresql://sitesense:your_secure_password_here@localhost:5432/sitesense_production
PGHOST=localhost
PGPORT=5432
PGUSER=sitesense
PGPASSWORD=your_secure_password_here
PGDATABASE=sitesense_production

# Security
SESSION_SECRET=generate_a_long_random_string_here

# Weather API
WEATHERAPI_KEY=your_weatherapi_key

# File Uploads
UPLOAD_PATH=/opt/sitesense/app/uploads
MAX_FILE_SIZE=10485760

# Logging
LOG_LEVEL=info
LOG_FILE=/opt/sitesense/logs/app.log

# HTTPS Configuration (if using direct HTTPS)
SSL_CERT=/opt/sitesense/ssl/cert.pem
SSL_KEY=/opt/sitesense/ssl/key.pem
```

#### 4. Database Migration

```bash
# Run database migrations
npm run db:push

# Seed initial data (if applicable)
npm run db:seed
```

#### 5. Process Management with PM2

```bash
# Install PM2 globally
sudo npm install -g pm2

# Switch to application user
sudo -u sitesense -s

# Create PM2 ecosystem file
cat > /opt/sitesense/app/ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'sitesense',
    script: 'server/index.js',
    cwd: '/opt/sitesense/app',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    log_file: '/opt/sitesense/logs/app.log',
    error_file: '/opt/sitesense/logs/error.log',
    out_file: '/opt/sitesense/logs/out.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max_old_space_size=1024'
  }]
};
EOF

# Start application with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions provided by PM2
```

### Reverse Proxy with Nginx

#### Install and Configure Nginx

```bash
# Install Nginx
sudo apt install -y nginx

# Create SSL directory
sudo mkdir -p /etc/nginx/ssl

# Generate self-signed certificate (replace with proper SSL cert in production)
sudo openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/sitesense.key \
    -out /etc/nginx/ssl/sitesense.crt \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=your-domain.com"
```

Create `/etc/nginx/sites-available/sitesense`:

```nginx
upstream sitesense_backend {
    server 127.0.0.1:3000;
    keepalive 32;
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Configuration
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/nginx/ssl/sitesense.crt;
    ssl_certificate_key /etc/nginx/ssl/sitesense.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    ssl_session_cache shared:SSL:10m;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # File Upload Size
    client_max_body_size 50M;

    # Compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private must-revalidate auth;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;

    # Static Files
    location /uploads/ {
        alias /opt/sitesense/app/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /assets/ {
        alias /opt/sitesense/app/dist/assets/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # Proxy to Node.js Application
    location / {
        proxy_pass http://sitesense_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300;
        proxy_connect_timeout 300;
        proxy_send_timeout 300;
    }

    # Health Check Endpoint
    location /health {
        proxy_pass http://sitesense_backend/health;
        access_log off;
    }

    # Logging
    access_log /var/log/nginx/sitesense_access.log;
    error_log /var/log/nginx/sitesense_error.log;
}
```

Enable the site:
```bash
# Enable site configuration
sudo ln -s /etc/nginx/sites-available/sitesense /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Start and enable Nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

## Docker Deployment

### Docker Compose Setup

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    container_name: sitesense-app
    restart: unless-stopped
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - DATABASE_URL=postgresql://sitesense:password@postgres:5432/sitesense
      - WEATHERAPI_KEY=${WEATHERAPI_KEY}
      - SESSION_SECRET=${SESSION_SECRET}
    volumes:
      - ./uploads:/app/uploads
      - ./logs:/app/logs
    depends_on:
      - postgres
      - redis
    networks:
      - sitesense

  postgres:
    image: postgres:15
    container_name: sitesense-db
    restart: unless-stopped
    environment:
      - POSTGRES_DB=sitesense
      - POSTGRES_USER=sitesense
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./backups:/backups
    ports:
      - "5432:5432"
    networks:
      - sitesense

  redis:
    image: redis:7-alpine
    container_name: sitesense-cache
    restart: unless-stopped
    ports:
      - "6379:6379"
    networks:
      - sitesense

  nginx:
    image: nginx:alpine
    container_name: sitesense-proxy
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf
      - ./nginx/ssl:/etc/nginx/ssl
      - ./uploads:/var/www/uploads
    depends_on:
      - app
    networks:
      - sitesense

volumes:
  postgres_data:

networks:
  sitesense:
    driver: bridge
```

Create `Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

FROM node:20-alpine

RUN addgroup -g 1001 -S nodejs && \
    adduser -S sitesense -u 1001

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --chown=sitesense:nodejs . .

USER sitesense

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD node healthcheck.js

CMD ["npm", "start"]
```

### Deploy with Docker

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f app

# Scale application
docker-compose up -d --scale app=3
```

## Security Hardening

### System-Level Security

```bash
# Update system regularly
sudo apt update && sudo apt upgrade -y

# Configure automatic security updates
sudo apt install -y unattended-upgrades
sudo dpkg-reconfigure unattended-upgrades

# Disable unused services
sudo systemctl disable cups
sudo systemctl disable avahi-daemon

# Configure SSH hardening
sudo nano /etc/ssh/sshd_config
```

SSH hardening configuration:
```conf
Port 2222
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
AllowUsers sitesense
MaxAuthTries 3
ClientAliveInterval 300
ClientAliveCountMax 2
```

### Application Security

```bash
# Set proper file permissions
sudo chown -R sitesense:sitesense /opt/sitesense
sudo chmod -R 750 /opt/sitesense
sudo chmod 600 /opt/sitesense/app/.env

# Setup log rotation
sudo nano /etc/logrotate.d/sitesense
```

Log rotation configuration:
```conf
/opt/sitesense/logs/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    create 0644 sitesense sitesense
    postrotate
        pm2 reload sitesense
    endscript
}
```

## Backup and Monitoring

### Automated Backup Script

Create `/opt/sitesense/scripts/backup.sh`:

```bash
#!/bin/bash

BACKUP_DIR="/opt/sitesense/backups"
DATE=$(date +%Y%m%d_%H%M%S)
DB_BACKUP_FILE="$BACKUP_DIR/db_backup_$DATE.sql"
APP_BACKUP_FILE="$BACKUP_DIR/app_backup_$DATE.tar.gz"

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Database backup
pg_dump -h localhost -U sitesense -d sitesense_production > "$DB_BACKUP_FILE"
gzip "$DB_BACKUP_FILE"

# Application files backup
tar -czf "$APP_BACKUP_FILE" -C /opt/sitesense/app \
    --exclude=node_modules \
    --exclude=dist \
    --exclude=logs \
    --exclude=.git \
    .

# Cleanup old backups (keep 30 days)
find "$BACKUP_DIR" -name "*.sql.gz" -mtime +30 -delete
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +30 -delete

# Upload to remote storage (optional)
# aws s3 sync "$BACKUP_DIR" s3://your-backup-bucket/sitesense/

echo "Backup completed: $DATE"
```

Setup cron job:
```bash
# Make script executable
sudo chmod +x /opt/sitesense/scripts/backup.sh

# Add to crontab (daily backup at 2 AM)
sudo crontab -e
0 2 * * * /opt/sitesense/scripts/backup.sh >> /opt/sitesense/logs/backup.log 2>&1
```

### Monitoring Setup

#### System Monitoring with Node Exporter

```bash
# Download and install Node Exporter
wget https://github.com/prometheus/node_exporter/releases/download/v1.6.1/node_exporter-1.6.1.linux-amd64.tar.gz
tar xzf node_exporter-1.6.1.linux-amd64.tar.gz
sudo mv node_exporter-1.6.1.linux-amd64/node_exporter /usr/local/bin/
sudo useradd -rs /bin/false node_exporter

# Create systemd service
sudo nano /etc/systemd/system/node_exporter.service
```

Node Exporter service:
```ini
[Unit]
Description=Node Exporter
Wants=network-online.target
After=network-online.target

[Service]
User=node_exporter
Group=node_exporter
Type=simple
ExecStart=/usr/local/bin/node_exporter

[Install]
WantedBy=multi-user.target
```

```bash
# Start Node Exporter
sudo systemctl daemon-reload
sudo systemctl enable node_exporter
sudo systemctl start node_exporter
```

#### Application Health Check

Create `/opt/sitesense/app/healthcheck.js`:

```javascript
const http = require('http');

const options = {
  hostname: 'localhost',
  port: process.env.PORT || 3000,
  path: '/health',
  timeout: 2000
};

const request = http.request(options, (res) => {
  console.log(`STATUS: ${res.statusCode}`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.log(`ERROR: ${err.message}`);
  process.exit(1);
});

request.end();
```

## Troubleshooting

### Common Deployment Issues

#### 1. Package.json Not Found Error

**Error:** `npm error path /opt/sitesense/app/package.json ... ENOENT: no such file or directory`

**Solution:**
```bash
# Check if you're in the correct directory
cd /opt/sitesense/app
pwd  # Should show /opt/sitesense/app

# Verify package.json exists
ls -la package.json

# If package.json is missing, ensure you've deployed the application correctly:
# Option A: Re-clone the repository
cd /opt/sitesense
rm -rf app
git clone https://your-repo/sitesense.git app

# Option B: Copy the application files properly
# Ensure package.json is in the root of the app directory
cp /path/to/source/package.json /opt/sitesense/app/

# Then retry installation
cd /opt/sitesense/app
npm ci --omit=dev
```

#### 2. NPM Permission Issues

**Error:** Permission denied during npm install

**Solution:**
```bash
# Ensure correct ownership
sudo chown -R sitesense:sitesense /opt/sitesense/app

# Switch to sitesense user
sudo -u sitesense -s
cd /opt/sitesense/app

# Clear npm cache and retry
npm cache clean --force
npm ci --omit=dev
```

#### 3. Node.js Version Compatibility

**Error:** Node.js version mismatch

**Solution:**
```bash
# Check Node.js version
node --version

# Should be v20.x.x or higher
# If not, install the correct version:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### 4. Build Failures

**Error:** Build process fails

**Solution:**
```bash
# Check if all dependencies are installed
npm list --depth=0

# Install missing dependencies
npm ci --omit=dev

# Check TypeScript compilation
npm run check

# Try building again
npm run build

# If build still fails, check logs:
npm run build 2>&1 | tee build.log
```

#### 5. Database Connection Issues

**Error:** Database connection refused

**Solution:**
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Verify database exists
sudo -u postgres psql -c "\l" | grep sitesense

# Test connection with credentials
psql -h localhost -U sitesense -d sitesense_production -c "SELECT 1;"

# Check DATABASE_URL format in .env
cat /opt/sitesense/app/.env | grep DATABASE_URL
```

### File Structure Verification

Ensure your deployed application has this structure:
```
/opt/sitesense/
├── app/
│   ├── package.json          # REQUIRED: Must be present
│   ├── package-lock.json     # REQUIRED: For npm ci
│   ├── node_modules/         # Created by npm ci
│   ├── dist/                 # Created by npm run build
│   ├── server/               # Server source code
│   ├── client/               # Client source code
│   ├── shared/               # Shared schemas
│   ├── .env                  # Environment configuration
│   ├── tsconfig.json         # TypeScript configuration
│   ├── vite.config.ts        # Vite configuration
│   └── uploads/              # File upload directory
├── logs/                     # Application logs
└── backups/                  # Database backups
```

### Quick Deployment Verification Script

Create `/opt/sitesense/verify-deployment.sh`:
```bash
#!/bin/bash

echo "=== SiteSense Deployment Verification ==="

# Check directory structure
echo "1. Checking directory structure..."
if [ -d "/opt/sitesense/app" ]; then
    echo "✓ App directory exists"
else
    echo "✗ App directory missing"
    exit 1
fi

# Check package.json
echo "2. Checking package.json..."
if [ -f "/opt/sitesense/app/package.json" ]; then
    echo "✓ package.json found"
else
    echo "✗ package.json missing"
    exit 1
fi

# Check Node.js
echo "3. Checking Node.js..."
NODE_VERSION=$(node --version)
echo "Node.js version: $NODE_VERSION"

# Check npm
echo "4. Checking npm..."
NPM_VERSION=$(npm --version)
echo "npm version: $NPM_VERSION"

# Check dependencies
echo "5. Checking dependencies..."
cd /opt/sitesense/app
if [ -d "node_modules" ]; then
    echo "✓ node_modules directory exists"
else
    echo "✗ node_modules missing - run 'npm ci --omit=dev'"
fi

# Check build output
echo "6. Checking build output..."
if [ -d "dist" ]; then
    echo "✓ dist directory exists"
else
    echo "✗ dist directory missing - run 'npm run build'"
fi

# Check environment file
echo "7. Checking environment..."
if [ -f ".env" ]; then
    echo "✓ .env file found"
else
    echo "✗ .env file missing"
fi

# Check database connection
echo "8. Testing database connection..."
if command -v psql > /dev/null; then
    echo "✓ PostgreSQL client available"
else
    echo "✗ PostgreSQL client not installed"
fi

echo "=== Verification Complete ==="
```

Make it executable and run:
```bash
chmod +x /opt/sitesense/verify-deployment.sh
sudo -u sitesense /opt/sitesense/verify-deployment.sh
```

### Common Issues

#### Application Won't Start
```bash
# Check PM2 status
pm2 status

# View application logs
pm2 logs sitesense

# Check system resources
htop
df -h
```

#### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Test database connection
psql -h localhost -U sitesense -d sitesense_production

# Check database logs
sudo tail -f /var/log/postgresql/postgresql-15-main.log
```

#### High Memory Usage
```bash
# Check memory usage
free -h

# Monitor specific processes
ps aux | grep node

# Restart application with PM2
pm2 restart sitesense
```

### Performance Tuning

#### PostgreSQL Tuning

Edit `/etc/postgresql/15/main/postgresql.conf`:

```conf
# For 16GB RAM server
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 1GB
checkpoint_completion_target = 0.9
wal_buffers = 64MB
default_statistics_target = 100
random_page_cost = 1.1
effective_io_concurrency = 200
```

#### Node.js Optimization

Update PM2 configuration:

```javascript
module.exports = {
  apps: [{
    name: 'sitesense',
    script: 'server/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    node_args: [
      '--max_old_space_size=2048',
      '--optimize-for-size'
    ],
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      UV_THREADPOOL_SIZE: 16
    }
  }]
};
```

### Maintenance Tasks

#### Weekly Maintenance Checklist

```bash
#!/bin/bash
# Weekly maintenance script

echo "=== Weekly Maintenance Report ===" > /tmp/maintenance_report.txt
echo "Date: $(date)" >> /tmp/maintenance_report.txt

# System updates
echo "Checking for system updates..." >> /tmp/maintenance_report.txt
sudo apt update && sudo apt list --upgradable >> /tmp/maintenance_report.txt

# Disk usage
echo "Disk usage:" >> /tmp/maintenance_report.txt
df -h >> /tmp/maintenance_report.txt

# Database maintenance
echo "Database maintenance:" >> /tmp/maintenance_report.txt
psql -h localhost -U sitesense -d sitesense_production -c "VACUUM ANALYZE;" >> /tmp/maintenance_report.txt

# Clear application logs
echo "Clearing old logs..." >> /tmp/maintenance_report.txt
find /opt/sitesense/logs -name "*.log" -mtime +7 -delete

# PM2 status
echo "PM2 Status:" >> /tmp/maintenance_report.txt
pm2 status >> /tmp/maintenance_report.txt

# Send report (configure email if needed)
cat /tmp/maintenance_report.txt
```

This comprehensive deployment guide covers all aspects of setting up SiteSense on your own infrastructure, from basic installation to advanced monitoring and maintenance procedures.