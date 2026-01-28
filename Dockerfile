FROM node:18-bullseye

# 1. Install System Dependencies
# FFMPEG is crucial for stickers and media conversion.
# ImageMagick and WebP are often used for image manipulation.
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

# 4. Install NPM Dependencies
# We use --production to skip devDependencies if you have any
RUN npm install

# 5. Copy Source Code
COPY . .

# 6. Expose Port
# Useful if you add a web dashboard later or for health checks on Railway/Render
EXPOSE 3000

# 7. Start the Bot
CMD ["npm", "start"]