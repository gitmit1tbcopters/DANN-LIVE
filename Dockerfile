# Dev-server target: hot-reloading Vite dev server for active development.
# A build/preview stage can be added later (multi-stage) if a production
# image is ever needed — not required for this teaching-tool use case.
FROM node:26-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
