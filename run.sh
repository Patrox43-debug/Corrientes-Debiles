#!/usr/bin/env bash
# Script de inicio para Sistema de Inventario Corrientes Débiles

echo "============================================================"
echo "  ⚡ INICIANDO SISTEMA DE INVENTARIO Y MANTENCIONES"
echo "  Tema: Minimalista Naranjo & Negro (#09090b / #f97316)"
echo "  Ubicación: Corrientes Débiles"
echo "============================================================"

# Verificar Python 3
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 no está instalado en el sistema."
    exit 1
fi

echo "Iniciando servidor web y base de datos SQLite..."
echo "Accede en tu navegador a: http://localhost:8080"
echo "Presione Ctrl + C para detener."
echo "============================================================"

python3 app.py
