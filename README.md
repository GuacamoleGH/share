# 🥑 GuacamoleGH Share

> **Plataforma privada y segura para transferir y compartir archivos en el homelab GuacamoleGH.**
> Inspirada en WeTransfer, con subidas fragmentadas (chunked uploads) de hasta 2 GB por archivo, enlaces protegidos y panel de administración privado.

---

## 🚀 Características Principales

- **Diseño del Ecosistema GuacamoleGH:** Gama Carbón con acentos Neón Verde Aguacate (`#00f59b`) y Turquesa Digital (`#00d9c4`), con soporte para modo claro/oscuro.
- **Subidas en Fragmentos (8 MB):** Transferencias robustas compatibles con los límites de Cloudflare, concurrencia controlada (2 fragmentos simultáneos) y reintentos exponenciales automáticos.
- **Descargas Individuales y en Lote:** Descarga de archivos sueltos con soporte para rangos HTTP o empaquetado directo en `.ZIP` mediante **streaming en tiempo real** (sin consumir memoria RAM en el servidor).
- **Seguridad en Almacenamiento:** Los archivos se almacenan en el sistema de archivos fuera de la raíz web con nombres aleatorios no ejecutables. Los tokens públicos y de gestión se guardan hasheados en SQLite con SHA-256.
- **Caducidad Automática:** Opciones de expiración de 1, 3, 7 y 14 días. Tarea periódica en segundo plano que purga archivos caducados y sesiones de subida abandonadas.
- **Panel Administrativo (`/admin`):** Métricas de almacenamiento físico ocupado, listado con búsqueda y filtros, y eliminación forzada inmediata.

---

## 🛠️ Tecnologías

- **Frontend:** React 18, TypeScript, Vite, Lucide Icons, CSS Custom Properties coherentes con Games y Flags.
- **Backend:** Node.js 22+, Express, TypeScript (`tsx`).
- **Base de Datos:** SQLite nativo mediante `node:sqlite` (DatabaseSync, WAL mode, foreign keys activas).
- **Despliegue:** Docker, Docker Compose, contenedor con usuario sin privilegios root (`node`), healthcheck integrado en `/api/health`.

---

## 📦 Despliegue en Homelab (`/opt/stacks/share`)

### 1. Clonar o copiar el repositorio
```bash
git clone https://github.com/GuacamoleGH/share /opt/stacks/share
cd /opt/stacks/share
```

### 2. Configurar variables de entorno
Copia la plantilla y edita los valores:
```bash
cp .env.example .env
nano .env
```

Variables esenciales:
- `PORT=3103` (puerto del host donde escuchará el contenedor).
- `JWT_SECRET`: cadena secreta larga para las sesiones de administración.
- `ADMIN_PASSWORD_HASH`: hash bcrypt de tu contraseña de administrador. Puedes generarlo en una línea:
  ```bash
  node -e "console.log(require('bcryptjs').hashSync('TuContraseña', 10))"
  ```
- `MAX_FILE_SIZE_BYTES=2147483648` (2 GB individual).
- `MAX_TRANSFER_SIZE_BYTES=10737418240` (10 GB por transferencia).

### 3. Iniciar el servicio con Docker Compose
```bash
docker compose up -d --build
```

Comprueba el estado del healthcheck:
```bash
docker ps --filter "name=guacamolegh-share"
```

### 4. Configurar Cloudflare Tunnel
Añade la ruta en tu Cloudflare Tunnel:
- **Hostname:** `share.guacamolegh.es`
- **Service:** `http://localhost:3103`

---

## 🔄 Actualización Segura

El repositorio incluye el script `scripts/actualizar-share.sh`:
```bash
chmod +x scripts/actualizar-share.sh
./scripts/actualizar-share.sh
```

El script verifica que no haya cambios locales no guardados, descarga la última versión con `--ff-only`, reconstruye la imagen, espera el healthcheck y preserva intactos los volúmenes de base de datos (`./data`) y archivos almacenados (`./storage`).

---

## 🧪 Pruebas y Desarrollo Local

```bash
# Instalar dependencias
npm install

# Modo desarrollo (Servidor backend en 3000 y Vite en 5173)
npm run dev:server
npm run dev

# Ejecutar suite de pruebas automatizadas
npm test

# Compilación de producción
npm run build
```

---

## 📄 Licencia

MIT License © 2026 GuacamoleGH.
