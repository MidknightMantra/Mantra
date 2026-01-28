FROM node:18-bullseye

# 1. Install System Dependencies (FFMPEG & Git)
RUN apt-get update && \
    apt-get install -y \
    ffmpeg \
    imagemagick \
    webp \
    git \
    && rm -rf /var/lib/apt/lists/*

# 2. Set Working Directory
WORKDIR /usr/src/app

# 3. Copy Package Files
COPY package.json ./

# 4. Install Dependencies
RUN npm install

# 5. Copy Source Code
COPY . .

# 6. Start the Bot
# We do NOT use 'EXPOSE' here. We let the app listen to the $PORT env var.
CMD ["npm", "start"]