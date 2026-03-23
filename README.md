# Competencia Gasolineras - Maritimo

Tabla de competencia de precios de gasolineras en tiempo real.

## Estructura
- `server.js` - Servidor Node.js (backend)
- `package.json` - Dependencias
- `public/index.html` - Interfaz web
- `public/estaciones.json` - Lista de gasolineras configuradas

## Añadir/quitar gasolineras
Edita `public/estaciones.json`. Cada entrada tiene:
- `id`: ID de la estación en el Geoportal
- `nombre`: Nombre que quieres mostrar
- `zona`: Zona (Valencia, Xirivella, etc.)
- `propia`: true si es tuya, false si es competencia

## Despliegue en Railway
1. Sube esta carpeta a GitHub
2. En Railway: New Project → Deploy from GitHub repo
3. Railway detecta el package.json y arranca automáticamente
