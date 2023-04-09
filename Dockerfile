FROM node:16

## works in linux systems
WORKDIR /usr/src/app

COPY package*.json ./

# RUN npm install

RUN npm install
RUN npm install -g pm2
COPY . .

# Open server
EXPOSE 8080
CMD [ "pm2-runtime", "server.js" ]