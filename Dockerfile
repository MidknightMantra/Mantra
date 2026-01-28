FROM node:20-bullseye

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

# 6. Expose Port (Mostly for documentation/Railway scanner)
EXPOSE 8080

# 7. Start the Bot directly with node
CMD ["node", "index.js"]