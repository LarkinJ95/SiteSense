# Quick Fix for Package.json Not Found Error

This document provides an immediate solution for the deployment error you encountered.

## Error Explanation

The error `npm error path /opt/sitesense/app/package.json ... ENOENT: no such file or directory` occurs because:

1. The `package.json` file is not in the expected location `/opt/sitesense/app/`
2. The application files weren't deployed to the correct directory structure
3. The working directory during deployment is incorrect

## Immediate Solution

### Step 1: Verify Current Directory Structure

```bash
# Check what's actually in the deployment directory
ls -la /opt/sitesense/
ls -la /opt/sitesense/app/

# Check if package.json exists anywhere in the deployment
find /opt/sitesense -name "package.json" -type f 2>/dev/null
```

### Step 2: Fix the File Structure

**Option A: If package.json is in a subdirectory**
```bash
# Find where package.json actually is
cd /opt/sitesense
find . -name "package.json"

# If it's in a subdirectory like /opt/sitesense/sitesense/package.json
# Move the contents up one level
if [ -f sitesense/package.json ]; then
    mv sitesense/* app/ 2>/dev/null || true
    mv sitesense/.* app/ 2>/dev/null || true
    rmdir sitesense
fi
```

**Option B: If files are in the wrong location**
```bash
# If all files are directly in /opt/sitesense/ instead of /opt/sitesense/app/
cd /opt/sitesense
if [ -f package.json ]; then
    mkdir -p app
    # Move all files except app directory to app/
    for item in *; do
        if [ "$item" != "app" ] && [ "$item" != "logs" ] && [ "$item" != "backups" ]; then
            mv "$item" app/
        fi
    done
    # Move hidden files too
    for item in .*; do
        if [ "$item" != "." ] && [ "$item" != ".." ]; then
            mv "$item" app/ 2>/dev/null || true
        fi
    done
fi
```

### Step 3: Verify and Install

```bash
# Ensure you're in the correct directory
cd /opt/sitesense/app

# Verify package.json exists
ls -la package.json

# Check the directory contents
ls -la

# Ensure correct ownership
sudo chown -R sitesense:sitesense /opt/sitesense/app

# Switch to sitesense user and install
sudo -u sitesense -s
cd /opt/sitesense/app

# Use the modern npm flag instead of --production
npm ci --omit=dev

# Build the application
npm run build
```

### Step 4: Create Missing Directories

```bash
# Create necessary directories if they don't exist
mkdir -p uploads
mkdir -p /opt/sitesense/logs
mkdir -p /opt/sitesense/backups

# Set proper permissions
sudo chown -R sitesense:sitesense /opt/sitesense
```

## Alternative: Complete Re-deployment

If the above doesn't work, do a clean re-deployment:

```bash
# Backup any existing configuration
sudo cp /opt/sitesense/app/.env /tmp/sitesense-env-backup 2>/dev/null || true

# Remove the corrupted deployment
sudo rm -rf /opt/sitesense/app

# Create app directory
sudo mkdir -p /opt/sitesense/app
sudo chown -R sitesense:sitesense /opt/sitesense

# Switch to sitesense user
sudo -u sitesense -s

# Upload/copy your application files properly
cd /opt/sitesense/app

# Method 1: If you have a tar/zip file
# tar -xzf /path/to/sitesense-app.tar.gz --strip-components=1

# Method 2: If you have the source directory
# cp -r /path/to/source/* .

# Method 3: Git clone (if available)
# git clone https://github.com/yourrepo/sitesense.git .

# Restore environment file
cp /tmp/sitesense-env-backup .env 2>/dev/null || true

# Install and build
npm ci --omit=dev
npm run build
```

## Verification Script

Save this as `/opt/sitesense/check-deployment.sh` and run it:

```bash
#!/bin/bash
echo "=== SiteSense Deployment Check ==="

# Check if we're in the right place
if [ ! -f "/opt/sitesense/app/package.json" ]; then
    echo "❌ package.json not found in /opt/sitesense/app/"
    echo "Current directory contents:"
    ls -la /opt/sitesense/app/ 2>/dev/null || echo "Directory doesn't exist"
    
    echo "Searching for package.json..."
    find /opt/sitesense -name "package.json" 2>/dev/null || echo "No package.json found"
    exit 1
else
    echo "✅ package.json found"
fi

# Check Node.js
echo "Node.js version: $(node --version)"
echo "npm version: $(npm --version)"

# Check dependencies
cd /opt/sitesense/app
if [ -d "node_modules" ]; then
    echo "✅ node_modules exists"
else
    echo "❌ node_modules missing"
fi

# Check build output
if [ -d "dist" ]; then
    echo "✅ dist directory exists"
else
    echo "❌ dist directory missing"
fi

echo "=== Check Complete ==="
```

Make it executable and run:
```bash
chmod +x /opt/sitesense/check-deployment.sh
/opt/sitesense/check-deployment.sh
```

## Summary

The key issues are usually:
1. **Wrong directory structure** - Files deployed to wrong location
2. **Missing package.json** - File not copied during deployment
3. **Incorrect permissions** - Files owned by wrong user
4. **Wrong npm command** - Use `--omit=dev` instead of `--production`

Follow the steps above to fix your deployment and get SiteSense running properly.