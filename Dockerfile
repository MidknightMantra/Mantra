FROM node:20-bullseye-slim

# 1. Install System Dependencies
# FIXED: Changed 'libwebp' to 'libwebp-dev' and added 'webp'
RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    libwebp-dev \
    webp \
    imagemagick \
    && rm -rf /var/lib/apt/lists/*

# 2. Set Working Directory
WORKDIR /usr/src/app

# 3. Copy Dependency Files
COPY package*.json ./

# 4. Install Node Modules
RUN npm install

# 5. Copy the rest of the bot code
COPY . .

# 6. Start the Bot
CMD ["npm", "start"]
