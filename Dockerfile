FROM node:16.13.0-alpine3.12

RUN mkdir -p /usr/local/node-app && chown -R node:node /usr/local/node-app

WORKDIR /usr/local/node-app

COPY package.json package-lock.json ./

USER node

RUN npm ci

COPY --chown=node:node . .

EXPOSE 5000