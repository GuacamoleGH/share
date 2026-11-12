#!/usr/bin/env bash
# =============================================================================
# GuacamoleGH Share — Script de Actualización Segura para Homelab
# =============================================================================

set -e

echo "=== [1/5] Comprobando estado del repositorio local ==="
if [ -n "$(git status --porcelain)" ]; then
  echo "❌ Error: Hay cambios locales sin guardar en el repositorio. Actualización abortada para evitar pérdida de datos."
  git status -s
  exit 1
fi

echo "=== [2/5] Descargando última versión de GitHub (git pull --ff-only) ==="
git pull --ff-only

echo "=== [3/5] Reconstruyendo y reiniciando contenedor Docker ==="
docker compose build --no-cache
docker compose up -d

echo "=== [4/5] Esperando al healthcheck del servicio ==="
sleep 8

HEALTH_STATUS="unknown"
for i in {1..12}; do
  CONTAINER_HEALTH=$(docker inspect --format='{{json .State.Health.Status}}' guacamolegh-share 2>/dev/null || echo '"unknown"')
  CONTAINER_HEALTH=$(echo "$CONTAINER_HEALTH" | tr -d '"')

  if [ "$CONTAINER_HEALTH" = "healthy" ]; then
    HEALTH_STATUS="healthy"
    break
  fi

  echo "Esperando verificación de salud ($i/12)... Estado actual: $CONTAINER_HEALTH"
  sleep 4
done

if [ "$HEALTH_STATUS" != "healthy" ]; then
  echo "❌ Error: El contenedor no superó el healthcheck."
  echo "=== [5/5] Logs del contenedor ==="
  docker compose logs --tail=40
  exit 1
fi

echo "✅ GuacamoleGH Share se ha actualizado y verificado correctamente."
echo "🔗 Disponible en https://share.guacamolegh.es (Puerto local: 3103)"
