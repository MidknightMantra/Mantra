# Start with Node.js 18
FROM node:18-bullseye-slim

# Install system dependencies for better-sqlite3 and other potential native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    sqlite3 \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (ignoring peer conflicts for Baileys/Jimp)
RUN npm install --legacy-peer-deps

# Copy the rest of the application
COPY . .

# Create database and session directories (ensuring they persist)
RUN mkdir -p database session

# Expose the dashboard port
EXPOSE 3000

# Start the application via the bootloader
CMD ["npm", "start"]
