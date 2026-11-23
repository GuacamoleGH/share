# 🥑 GuacamoleGH Share

> **Plataforma privada y segura para transferir y compartir archivos en el ecosistema GuacamoleGH.**
> Inspirada en WeTransfer, con subidas fragmentadas (chunked uploads) de hasta 2 GB por archivo, enlaces protegidos y panel de administración privado.

---

## 🚀 Características Principales

- **Diseño del Ecosistema GuacamoleGH:** Gama Carbón con acentos Neón Verde Aguacate (`#00f59b`) y Turquesa Digital (`#00d9c4`), con soporte para modo claro/oscuro.
- **Subidas en Fragmentos (8 MB):** Transferencias robustas compatibles con límites web, concurrencia controlada (2 fragmentos simultáneos) y reintentos exponenciales automáticos.
- **Descargas Individuales y en Lote:** Descarga de archivos sueltos con soporte para rangos HTTP o empaquetado directo en `.ZIP` mediante **streaming en tiempo real** (sin sobrecargar el consumo de memoria RAM).
- **Seguridad en Almacenamiento:** Los archivos se almacenan en el sistema de archivos fuera de la raíz web con nombres aleatorios no ejecutables. Los tokens públicos y de gestión se guardan hasheados en SQLite con SHA-256.
- **Caducidad Automática:** Opciones de expiración de 1, 3, 7 y 14 días. Tarea periódica en segundo plano que purga archivos caducados y sesiones de subida abandonadas.
- **Panel Administrativo (`/admin`):** Métricas de almacenamiento físico ocupado, listado con búsqueda y filtros, y eliminación forzada inmediata.

---

## 🛠️ Tecnologías

- **Frontend:** React 18, TypeScript, Vite, Lucide Icons, CSS Custom Properties coherentes con Games y Flags.
- **Backend:** Node.js 22+, Express, TypeScript (`tsx`).
- **Base de Datos:** SQLite nativo mediante `node:sqlite` (DatabaseSync, WAL mode, foreign keys activas).

---

## ⚙️ Configuración (.env)

Copia la plantilla y edita los valores en tu archivo `.env`:

```bash
cp .env.example .env
```

Variables esenciales:
- `JWT_SECRET`: cadena secreta para las sesiones de administración.
- `ADMIN_PASSWORD_HASH`: hash bcrypt de tu contraseña de administrador. Puedes generarlo con:
  ```bash
  node -e "console.log(require('bcryptjs').hashSync('TuContraseña', 10))"
  ```
- `MAX_FILE_SIZE_BYTES=2147483648` (2 GB individual).
- `MAX_TRANSFER_SIZE_BYTES=10737418240` (10 GB por transferencia).

---

## 🧪 Pruebas y Desarrollo Local

```bash
# Instalar dependencias
npm install

# Modo desarrollo (Backend y Frontend)
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
