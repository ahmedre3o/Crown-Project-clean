# Crown API (crown-api) – Cloud Run
# PORT is set by Cloud Run at runtime; app listens on process.env.PORT (fallback 8080) and 0.0.0.0

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
# Fallback only; Cloud Run sets PORT at runtime
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/api.js"]
