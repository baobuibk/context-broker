FROM node:lts-alpine
WORKDIR /home/node/app
COPY package.json .
RUN npm install
COPY src ./src
EXPOSE 8000
CMD ["node", "src/index.js"]
