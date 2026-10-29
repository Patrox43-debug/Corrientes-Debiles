# Reglas del Proyecto - Corrientes Débiles

## Sincronización Automática con GitHub
- **Regla Estricta**: Cada vez que se modifique o actualice cualquier archivo o funcionalidad del sistema, SIEMPRE se debe actualizar GitHub de inmediato.
- Procedimiento obligatorio al realizar cambios:
  1. Verificar que el conjunto de pruebas pase: `python3 tests/test_app.py`.
  2. Sincronizar activos estáticos con Android: `cp -r static/* android-app/app/src/main/assets/ && cp -r static/* android-app/app/src/main/assets/static/`.
  3. Si hay cambios de versión o UI relevante, actualizar `versionCode` y `versionName` en `android-app/app/build.gradle` y cachebusters en `static/index.html`.
  4. Realizar commit con mensaje descriptivo y push a `origin main`:
     ```bash
     git add .
     git commit -m "tipo: descripción clara del cambio"
     git push origin main
     ```
  5. Asegurarse de que el workflow de GitHub Actions compile y genere el APK correspondiente.
