FROM node:lts
WORKDIR /home/node/app
COPY src ./src
COPY package.json .
RUN npm install
CMD ["node", "src/index.js"]
EXPOSE 8000
