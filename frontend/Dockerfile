FROM node:20-slim

WORKDIR /app

# Build-time API base for Next.js (NEXT_PUBLIC_* is inlined at build)
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

RUN npm run build

ENV NODE_ENV=production
ENV PORT=8080
EXPOSE 8080

CMD ["npm", "start"]

