#!/bin/bash

echo "🚀 Starting Blog Management System Setup..."

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
    echo "📦 Installing MongoDB..."
    sudo apt update
    sudo apt install -y mongodb-server-core
fi

# Create MongoDB data directory
mkdir -p /tmp/mongodb

# Start MongoDB in background
echo "🔄 Starting MongoDB..."
mongod --dbpath /tmp/mongodb --port 27017 > /tmp/mongodb.log 2>&1 &
MONGO_PID=$!

# Wait for MongoDB to start
sleep 3

# Check if MongoDB is running
if mongosh --eval "db.stats()" --quiet > /dev/null 2>&1; then
    echo "✅ MongoDB is running"
else
    echo "❌ Failed to start MongoDB"
    kill $MONGO_PID 2>/dev/null
    exit 1
fi

# Copy environment file
if [ ! -f .env.local ]; then
    echo "📋 Creating environment file..."
    cp .env.local.example .env.local
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📥 Installing dependencies..."
    npm install
fi

# Start Next.js development server
echo "🌐 Starting Next.js development server..."
echo "   Access your site at: http://localhost:3001"
echo "   Admin panel at: http://localhost:3001/admin"
echo ""
echo "📌 To stop the servers, press Ctrl+C"
echo ""

# Kill MongoDB when script exits
trap "kill $MONGO_PID 2>/dev/null; echo -e '\n👋 Stopping MongoDB...'; exit" INT TERM

# Start Next.js
npm run dev