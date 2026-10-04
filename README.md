# Finanzas 💸

App web instalable (PWA) para controlar ingresos, gastos, presupuestos y metas de ahorro. Pensada para iPhone: se instala desde Safari, funciona a pantalla completa y sin conexión. Los datos se guardan solo en el dispositivo.

## Publicarla en GitHub Pages (gratis)

1. Crea un repositorio nuevo en https://github.com/new (por ejemplo `finanzas`). Puede ser público; tus datos **no** se suben, solo el código.
2. Desde esta carpeta:
   ```bash
   git init -b main
   git add .
   git commit -m "Finanzas v1"
   git remote add origin https://github.com/TU_USUARIO/finanzas.git
   git push -u origin main
   ```
3. En GitHub: **Settings → Pages → Source: Deploy from a branch → main / (root) → Save**.
4. En 1–2 minutos estará en `https://TU_USUARIO.github.io/finanzas/`.

## Instalarla en el iPhone

1. Abre esa dirección en **Safari**.
2. Pulsa **Compartir** → **Añadir a pantalla de inicio**.
3. Ábrela siempre desde el icono (los datos de la app instalada son independientes de los de Safari).

## Actualizar

Cambia el código, haz `git push` y, en `sw.js`, sube la versión de `CACHE` (`finanzas-v2`, …). El iPhone descarga la versión nueva la próxima vez que abras la app con conexión.

## Probar en el PC

```bash
java -m jdk.httpserver -p 8080
```
y abre http://localhost:8080
