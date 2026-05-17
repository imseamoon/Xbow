# ── build stage ────────────────────────────────────────────────
FROM node:22-bullseye-slim AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ── production stage ────────────────────────────────────────────
FROM node:22-bullseye-slim AS runner
WORKDIR /app

ENV NODE_ENV=production

# chromium deps for puppeteer pdf generation (Debian)
ENV DEBIAN_FRONTEND=noninteractive
RUN set -eux; \
    apt-get update; \
    for i in 1 2 3; do \
        if apt-get -o Acquire::Retries=3 install -y --no-install-recommends \
            chromium \
            ca-certificates \
            fonts-freefont-ttf; then \
            break; \
        else \
            echo "apt-get install failed, retrying ($i/3)"; \
            sleep 15; \
            apt-get update; \
        fi; \
    done; \
    rm -rf /var/lib/apt/lists/*;

ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist

RUN mkdir -p reports

EXPOSE 3000

CMD ["node", "dist/src/main.js"]
