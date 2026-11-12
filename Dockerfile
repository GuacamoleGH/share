# =============================================================================
# GuacamoleGH Share — Dockerfile Multi-Stage
# =============================================================================

# Fase 1: Compilación de Frontend con Vite
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Fase 2: Runtime de producción con Express y SQLite Nativo
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/share.db
ENV STORAGE_PATH=/app/storage

# Instalar dependencias de producción
COPY package*.json ./
RUN npm ci --omit=dev

# Copiar bundle de frontend y código del servidor
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server ./server
COPY --from=builder /app/public ./public
COPY --from=builder /app/tsconfig.json ./

# Preparar directorios persistentes y asignar permisos al usuario node
RUN mkdir -p /app/data /app/storage/files /app/storage/chunks && \
    chown -R node:node /app/data /app/storage

USER node

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["npx", "tsx", "server/index.ts"]
