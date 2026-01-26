FROM node:20-buster

# Install System Dependencies (FFmpeg & ImageMagick)
RUN apt-get update && \
    apt-get install -y \
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
