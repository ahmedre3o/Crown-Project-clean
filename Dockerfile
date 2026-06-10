# -------- Build stage --------
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Native deps for optional packages (e.g. sharp, node-gyp) in Linux CI/Docker
RUN apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates \
  python3 \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*

# Next.js inlines NEXT_PUBLIC_* at build time; must be set here, not at runtime.
ARG NEXT_PUBLIC_API_URL=https://api.crowncs.org
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY package*.json ./
RUN npm config set registry https://registry.npmjs.org/ \
  && npm config set fetch-retries 5 \
  && npm config set fetch-retry-mintimeout 20000 \
  && npm config set fetch-retry-maxtimeout 120000 \
  && npm ci --prefer-online --no-audit --no-fund

COPY . .
# Webpack build is more reliable in Docker/Cloud Build than Turbopack (Next 16 default).
# Keep heap below ~4GB so the docker build container does not OOM (Cloud Build step limit).
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS=--max-old-space-size=4096
RUN npm run build

# -------- Runtime stage --------
FROM node:20-bookworm-slim

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app ./

EXPOSE 8080
CMD ["npm", "start"]
