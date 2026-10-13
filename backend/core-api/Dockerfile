FROM node:20-slim

WORKDIR /app

RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY tsconfig.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

RUN npm install

ENV DATABASE_URL="mysql://ats_app_user:ats_dev_password_change_me@mysql:3306/ats_database"

RUN npx prisma generate

COPY src ./src

RUN npm run build

RUN mkdir -p uploads

EXPOSE 5000

CMD ["node", "dist/index.js"]
