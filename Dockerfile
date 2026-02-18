# -------- Build stage --------
FROM node:20-slim AS builder

WORKDIR /app

# Next.js inlines NEXT_PUBLIC_* at build time; must be set here, not at runtime.
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# -------- Runtime stage --------
FROM node:20-slim

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

COPY --from=builder /app ./

EXPOSE 8080
CMD ["npm", "start"]
