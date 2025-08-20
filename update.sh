#!/bin/bash

# MiCita Update Script
# This script pulls latest changes from GitHub and updates the Docker container

set -e  # Exit on error

echo "========================================="
echo "MiCita Update Script"
echo "========================================="

# Navigate to app directory
cd /home/hostcenter/public_html/micita.pe

# Store current git hash for comparison
OLD_HASH=$(git rev-parse HEAD)

echo "→ Pulling latest changes from GitHub..."
git pull origin main

# Get new git hash
NEW_HASH=$(git rev-parse HEAD)

# Check if there were changes
if [ "$OLD_HASH" = "$NEW_HASH" ]; then
    echo "✓ No changes detected. Already up to date!"
    exit 0
fi

echo "→ Changes detected. Updating application..."

# Check if package.json or package-lock.json changed
if git diff --name-only $OLD_HASH $NEW_HASH | grep -E "package(-lock)?\.json"; then
    echo "→ Dependencies changed. Rebuilding Docker image..."
    docker-compose build --no-cache
    echo "✓ Docker image rebuilt successfully"
else
    echo "→ No dependency changes. Skipping Docker rebuild."
fi

# Restart the container to apply changes
echo "→ Restarting Docker container..."
docker-compose down
docker-compose up -d

# Wait for container to be healthy
echo "→ Waiting for container to be healthy..."
for i in {1..30}; do
    if docker-compose ps | grep -q "healthy"; then
        echo "✓ Container is healthy!"
        break
    fi
    echo -n "."
    sleep 2
done

# Show container status
echo ""
echo "Container status:"
docker-compose ps

# Show recent logs
echo ""
echo "Recent logs:"
docker-compose logs --tail=20

echo ""
echo "========================================="
echo "✓ Update completed successfully!"
echo "========================================="
echo ""
echo "Git commits applied:"
git log --oneline $OLD_HASH..$NEW_HASH

# Set proper permissions
chown -R hostcenter:hostcenter /home/hostcenter/public_html/micita.pe