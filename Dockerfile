FROM node:20-bullseye-slim

# 1. Install System Dependencies
# Added 'git' because some npm packages require it to fetch code
RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    libwebp-dev \
    webp \
    imagemagick \
    git \
    && rm -rf /var/lib/apt/lists/*

# 2. Set Working Directory
WORKDIR /usr/src/app

# 3. Copy Dependency Files
COPY package*.json ./

# 4. Copy Prisma Schema & Install Node Modules
COPY prisma ./prisma
RUN npm install

# 5. Copy the rest of the bot code
COPY . .

# 6. Start the Bot
CMD ["npm", "start"]
