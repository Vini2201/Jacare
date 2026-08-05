FROM node:20-alpine

# Instala compiladores C++ nativos e Python3 no Alpine
RUN apk add --no-cache python3 make g++

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 3000

CMD ["npm", "start"]
