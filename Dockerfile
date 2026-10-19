# Production Dockerfile for MiCita (Node 20)
FROM node:20-alpine AS base
WORKDIR /app

# --- Dependencies (cached layer) ---
FROM base AS deps
COPY package.json package-lock.json ./
# argon2 ships prebuilt binaries; build tools are only needed as a fallback.
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && npm ci --legacy-peer-deps --omit=dev \
    && apk del .build-deps

# --- Build (needs devDependencies) ---
FROM base AS build
COPY package.json package-lock.json ./
RUN apk add --no-cache --virtual .build-deps python3 make g++ \
    && npm ci --legacy-peer-deps \
    && apk del .build-deps
COPY . .
RUN npm run build

# --- Runtime ---
FROM base AS runtime
ENV NODE_ENV=production
# Never bake secrets into the image; provide them via env_file / secrets at run time.
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/scripts ./scripts
COPY --from=build /app/migrations ./migrations
COPY package.json ./

# Run as an unprivileged user.
RUN addgroup -S micita && adduser -S micita -G micita \
    && mkdir -p /app/uploads && chown -R micita:micita /app
USER micita

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:5000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["npm", "start"]
