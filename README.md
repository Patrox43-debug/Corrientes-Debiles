# ⚡ Sistema de Inventario y Mantención de Equipamientos
### Especialidad: Corrientes Débiles (CCTV, Redes, Control de Acceso, Detección de Incendio, UPS)

Sistema web profesional con **estilo minimalista en tonos negro obsidiana y acentos naranjo neón**, diseñado específicamente para el control de inventario técnico, trazabilidad de instalaciones, escaneo de códigos QR y registro histórico de mantenciones.

---

## 🎨 Paleta de Diseño y Estilo Minimalista
- **Fondo Base y Superficies:** Negro Profundo (`#09090b`), Superficie Grafito (`#121215`, `#18181c`) con bordes sutiles de alta precisión (`#27272e`).
- **Acentos Naranjo:** Neón e interactivo (`#f97316`, `#ff6a00`, `#ea580c`), resplandor sutil (`rgba(249, 115, 22, 0.25)`).
- **Tipografía y Legibilidad:** Fuentes sans-serif modernas con códigos, fechas y RUT formateados en tipografía monoespaciada de alta definición.
- **Micro-interacciones:** Indicadores de estado con halo de luz, retícula de escáner QR con láser animado, modales fluidos y notificaciones tipo toast.

---

## 📋 Especificaciones y Campos de Datos

Cada equipamiento gestionado en el sistema incluye todos los campos solicitados:

1. **Identificador / Código QR:** Código único de trazabilidad (ej: `EQ-CCTV-001`, `EQ-NET-003`).
2. **Nombre del equipo:** Denominación técnica clara (ej: *Cámara IP Domo PTZ Perimetral 4K*).
3. **Marca:** Fabricante (ej: *Dahua Technology, Cisco, Hikvision, Notifier, APC, ZKTeco*).
4. **Modelo:** Número de parte o modelo de fábrica (ej: *DH-SD49425XB-HNR*).
5. **Fecha de instalación:** Registro cronológico de alta del equipo.
6. **Historial de mantenciones con Última Mantención destacada:**
   - **Fecha de mantenciones:** Fechas de intervenciones preventivas, correctivas o de configuración.
   - **Última mantención:** Destacada prominentemente en tarjeta y tabla con fecha, técnico y resumen.
   - **Nombre del técnico:** Profesional responsable de la mantención.
   - **Horas de trabajo:** Tiempo técnico dedicado a la labor (ej: `2.5 hrs`).
   - **Observaciones:** Registro detallado de labores realizadas, cambios de piezas y pruebas.
7. **Características del equipo (Especificaciones técnicas):** Voltajes, consumo de energía, puertos de red, resolución, protocolos, lazos de control y certificaciones.
8. **Ubicación / Recinto:** Sala de racks, tableros eléctricos, postes o áreas de control.

---

## 🔐 Módulo de Inicio de Sesión (Autenticación)
- **RUT Chileno con Validación Módulo 11:**
  - Formateo automático mientras se escribe (`12345678k` → `12.345.678-K`).
  - Verificador de dígito con retroalimentación visual en tiempo real.
- **Contraseña protegida:** Con hash criptográfico SHA-256 en base de datos.
- **Configuración Inicial Segura (Sin credenciales expuestas):**
  - En la primera ejecución (tanto en modo local como servidor web), el sistema detecta que no existen usuarios y solicita registrar al **Primer Administrador** con su RUT, nombre y contraseña personalizada.
  - No se almacenan contraseñas predeterminadas ni credenciales por defecto en el código fuente.
  - Una vez creado el Administrador, se pueden registrar técnicos y administradores adicionales desde el panel superior de **Gestión de Usuarios**.

---

## 🔍 Buscador y Filtros en Tiempo Real
- **Buscador global instantáneo:** Busca por nombre del equipo, marca, modelo, código QR, ubicación, nombre del técnico o palabras clave dentro de las especificaciones y observaciones.
- **Filtros por estado:** *Operativo*, *En Mantención*, *Alerta*.
- **Filtro dinámico por Marca:** Filtra automáticamente por los fabricantes presentes en el inventario.
- **Ordenamiento:** Más recientes, Última mantención realizada, Fecha de instalación o más antiguos.
- **Alternador de vistas:** Vista de **Tarjetas interactivas** y vista de **Tabla estructurada**.

---

## 📷 Generación y Escaneo de Códigos QR
1. **Generación de QR y Etiquetas de Activo:**
   - Cada equipo cuenta con su código QR vectorial de alto contraste generado localmente.
   - Modal de impresión de etiquetas listo para formato adhesivo con marca, modelo, código QR y ubicación.
2. **Escaneo de Códigos QR:**
   - **Cámara en vivo:** Detección automática por video (`navigator.mediaDevices.getUserMedia`) con retícula de escaneo y haz láser animado.
   - **Carga de archivo:** Permite seleccionar fotos o capturas de pantalla de códigos QR.
   - **Selector de simulación y código manual:** Permite probar el flujo de escaneo instantáneamente sin necesidad de disponer de una cámara física conectada.
   - Al escanear, el sistema abre de inmediato la ficha completa del equipo y su historial cronológico.

---

## 🗄️ Base de Datos Relacional (SQLite)
La base de datos relacional se ubica en `database/inventario.db` con tablas normalizadas:
- `usuarios`: Cuentas de acceso, RUT chileno único, contraseña con hash SHA-256, roles.
- `equipos`: Registro maestro de equipamientos, características técnicas, fechas y ubicaciones.
- `mantenciones`: Histórico relacional con clave foránea `equipo_id`, técnico, fecha, horas trabajadas y observaciones detalladas.
- Inicialización y poblado de datos automáticos (*seed*) con equipamiento representativo de Corrientes Débiles.

---

## 🚀 Cómo Iniciar la Aplicación

### Opción 1: Ejecutar con el script directo
```bash
./run.sh
```

### Opción 2: Ejecutar directamente con Python 3
```bash
python3 app.py
```

Luego abre tu navegador en:
👉 **`http://localhost:8080`**

---

## ☁️ Despliegue en Producción con Coolify

La aplicación está completamente configurada para desplegarse en **Coolify** de la misma manera que el sistema EEMM, bajo el dominio oficial:
👉 **`https://mantencion.cfelbc.cl`**

### Parámetros de Configuración en Coolify:

1. **Nuevo Recurso en Coolify**:
   - En tu panel de Coolify, pulsa en **+ New Resource** > **Application**.
   - Selecciona **Public Repository** o conecta con tu cuenta de GitHub.
   - URL del Repositorio: `https://github.com/Patrox43-debug/Corrientes-Debiles`
   - Rama (*Branch*): `main`

2. **Dominio Asignado (FQDN)**:
   ```text
   https://mantencion.cfelbc.cl
   ```
   *(Coolify y Traefik generarán y renovarán automáticamente el certificado SSL Let's Encrypt).*

3. **Build Pack**:
   - Selecciona **`Dockerfile`** (o `Docker Compose`).

4. **Puerto Expuesto (Ports Exposes)**:
   - Configura el puerto en: **`8080`** (o `8080:8080`).

5. **Verificación de Salud (Health Check)**:
   - Ruta (*Path*): `/api/health`
   - Intervalo: `20s`
   - Tiempo de espera: `5s`
   - Retries: `5`

6. **Almacenamiento Persistente (Storages / Persistent Volume)**:
   - **Mount Path (Destino en contenedor)**: `/app/data`
   - *(En el primer inicio, el sistema copia automáticamente la base de datos pre-cargada con el inventario UPS y los usuarios registrados a `/app/data/inventario.db`, manteniéndola protegida de forma permanente entre despliegues y reinicios).*

7. **Variables de Entorno (Environment Variables)**:
   ```env
   APP_URL=https://mantencion.cfelbc.cl
   DB_PATH=/app/data/inventario.db
   PORT=8080
   PYTHONUNBUFFERED=1
   ```

---

## 🧪 Pruebas Automatizadas
Para ejecutar la suite de pruebas unitarias e integración de la API y base de datos:
```bash
python3 tests/test_app.py
```
*Verifica autenticación, creación de equipos, registro de mantenciones, cálculo de estadísticas y filtros.*
