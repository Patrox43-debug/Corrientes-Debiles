FROM python:3.11-slim

# Evitar escritura de archivos .pyc y habilitar salida en tiempo real
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Instalar utilidades del sistema para comprobaciones de salud (Health Check en Coolify)
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Instalar dependencias de Python si existen
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el código fuente de la aplicación
COPY . .

# Crear directorio de datos persistentes
RUN mkdir -p /app/data /app/static

# Variables de entorno por defecto para Coolify
ENV PORT=8080
ENV HOST=0.0.0.0
ENV APP_URL=https://mantencion.cfelbc.cl
ENV DB_PATH=/app/data/inventario.db

# Volumen persistente para la base de datos SQLite
VOLUME ["/app/data"]

# Puerto oficial expuesto
EXPOSE 8080 8000

# Comprobación de salud nativa de Docker para Coolify / Traefik
HEALTHCHECK --interval=20s --timeout=5s --start-period=15s --retries=5 \
  CMD curl -f http://localhost:${PORT:-8080}/api/health || exit 1

# Comando de inicio del servidor HTTP
CMD ["python3", "app.py"]
