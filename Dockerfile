# Use Bullseye (Debian 11) - Stable and supported
FROM node:20-bullseye

# Install System Dependencies (FFmpeg, ImageMagick, WebP)
# --no-install-recommends keeps the build lightweight
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    ffmpeg \
    imagemagick \
    webp && \
    apt-get upgrade -y && \
    rm -rf /var/lib/apt/lists/*

# Set Working Directory
WORKDIR /usr/src/app

# Copy Package Files
COPY package.json ./

# Install Node Dependencies
RUN npm install

# Copy App Source
COPY . .

# Expose Port
EXPOSE 3000

# Start Bot
CMD ["npm", "start"]
