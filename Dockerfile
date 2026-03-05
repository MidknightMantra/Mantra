FROM quay.io/midknightmantra/mantra-bot:latest

WORKDIR /root/mantra

RUN git clone https://github.com/MidknightMantra/Mantra . && \
    npm install

EXPOSE 5000

CMD ["npm", "start"]
