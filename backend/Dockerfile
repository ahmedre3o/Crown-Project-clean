# Crown API (crown-api) – Cloud Run
# PORT is set by Cloud Run at runtime; app listens on process.env.PORT (fallback 8080) and 0.0.0.0

FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm config set registry https://registry.npmjs.org/ \
  && npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm ci --prefer-online --no-audit --no-fund

COPY . .
RUN npm run build

ENV NODE_ENV=production
# Fallback only; Cloud Run sets PORT at runtime
ENV PORT=8080
EXPOSE 8080

CMD ["node", "dist/api.js"]
