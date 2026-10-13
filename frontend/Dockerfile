FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV NEXT_PUBLIC_API_URL=http://localhost:5000/api
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
