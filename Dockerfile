FROM node:20-alpine

# Instala compiladores nativos necessários para C++/node-pty no Alpine Linux
RUN apk add --no-base python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
