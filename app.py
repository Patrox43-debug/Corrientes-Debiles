#!/usr/bin/env python3
"""
Corrientes Débiles - Sistema de Inventario y Mantenimiento de Equipamientos
Servidor HTTP con API REST y SQLite integrado.
"""

import http.server
import socketserver
import os
import json
import urllib.parse
import mimetypes
import secrets
from datetime import datetime

from database import db

PORT = int(os.environ.get('PORT', 8080))
HOST = os.environ.get('HOST', '0.0.0.0')
APP_URL = os.environ.get('APP_URL', 'https://mantencion.cfelbc.cl')
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(BASE_DIR, 'static')

# In-memory session store: token -> user dict
SESSIONS = {}

class CustomRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STATIC_DIR, **kwargs)

    def send_json(self, data, status=200):
        response_bytes = json.dumps(data, ensure_ascii=False, default=str).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(response_bytes)))
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.end_headers()
        self.wfile.write(response_bytes)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
        self.end_headers()

    def get_auth_user(self):
        auth_header = self.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:].strip()
            return SESSIONS.get(token)
        return None

    def read_json_body(self):
        content_length = int(self.headers.get('Content-Length', 0))
        if content_length == 0:
            return {}
        body_bytes = self.rfile.read(content_length)
        try:
            return json.loads(body_bytes.decode('utf-8'))
        except Exception:
            return {}

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)

        # Endpoint especial para limpiar caché y recargar
        if path == '/reset':
            html = """<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Actualizando Corrientes Débiles...</title>
    <style>
        body { background: #0c0d0e; color: #f97316; font-family: system-ui, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; }
        .spinner { width: 50px; height: 50px; border: 4px solid #222; border-top-color: #f97316; border-radius: 50%; animation: spin 0.8s linear infinite; margin-bottom: 20px; }
        @keyframes spin { to { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="spinner"></div>
    <h2>Actualizando datos y limpiando caché...</h2>
    <p style="color:#aaa;">Eliminando Service Worker y datos de prueba obsoletos...</p>
    <script>
        async function clean() {
            if ('serviceWorker' in navigator) {
                try {
                    const regs = await navigator.serviceWorker.getRegistrations();
                    for (let reg of regs) {
                        await reg.unregister();
                    }
                } catch(e) {}
            }
            if ('caches' in window) {
                try {
                    const keys = await caches.keys();
                    for (let k of keys) {
                        await caches.delete(k);
                    }
                } catch(e) {}
            }
            try {
                localStorage.clear();
                sessionStorage.clear();
            } catch(e) {}
            setTimeout(() => {
                window.location.replace('/?v=' + Date.now());
            }, 500);
        }
        clean();
    </script>
</body>
</html>"""
            self.send_response(200)
            self.send_header('Content-Type', 'text/html; charset=utf-8')
            self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
            self.end_headers()
            self.wfile.write(html.encode('utf-8'))
            return

        # API Endpoints
        if path.startswith('/api/'):
            # Health check
            if path == '/api/health':
                return self.send_json({"status": "ok", "time": datetime.now().isoformat()})

            # Check initial setup status
            if path == '/api/setup/status':
                count = db.count_users()
                return self.send_json({"initialized": count > 0, "count": count})

            # Check authenticated user
            if path == '/api/me':
                user = self.get_auth_user()
                if user:
                    return self.send_json({"authenticated": True, "user": user})
                return self.send_json({"authenticated": False}, status=401)

            # Dashboard stats
            if path == '/api/stats':
                stats = db.get_dashboard_stats()
                return self.send_json({"success": True, "stats": stats})

            # Get equipment by QR code: /api/equipos/qr/<codigo>
            if path.startswith('/api/equipos/qr/'):
                qr_code = urllib.parse.unquote(path.replace('/api/equipos/qr/', ''))
                equipo = db.get_equipo_by_code(qr_code)
                if equipo:
                    return self.send_json({"success": True, "equipo": equipo})
                return self.send_json({"success": False, "error": f"No se encontró equipo con código QR '{qr_code}'"}, status=404)

            # Get single equipment by ID: /api/equipos/<id>
            if path.startswith('/api/equipos/'):
                parts = path.strip('/').split('/')
                if len(parts) == 3 and parts[2].isdigit():
                    equipo_id = int(parts[2])
                    equipo = db.get_equipo_by_id(equipo_id)
                    if equipo:
                        return self.send_json({"success": True, "equipo": equipo})
                    return self.send_json({"success": False, "error": "Equipo no encontrado"}, status=404)

            # Get all equipment with filters: /api/equipos
            if path == '/api/equipos':
                search = query.get('search', [None])[0]
                estado = query.get('estado', [None])[0]
                marca = query.get('marca', [None])[0]
                sort_by = query.get('sort_by', [None])[0]

                equipos = db.get_all_equipos(search_query=search, estado=estado, marca=marca, sort_by=sort_by)
                return self.send_json({"success": True, "total": len(equipos), "equipos": equipos})

            # Get all users (Admin only)
            if path == '/api/usuarios':
                user = self.get_auth_user()
                if not user or user.get('rol') != 'admin':
                    return self.send_json({"success": False, "error": "Acceso restringido a administradores"}, status=403)
                users = db.get_all_users()
                return self.send_json({"success": True, "users": users})

            # App Version for Android auto-update
            if path == '/api/app-version':
                version_name = "1.0.0"
                gradle_file = os.path.join(BASE_DIR, 'android-app', 'app', 'build.gradle')
                if os.path.exists(gradle_file):
                    try:
                        with open(gradle_file, 'r', encoding='utf-8') as gf:
                            for gline in gf:
                                if 'versionName' in gline and '"' in gline:
                                    version_name = gline.split('"')[1]
                                    break
                    except Exception:
                        pass
                apk_name = f"CDmantencion_v{version_name}.apk"
                return self.send_json({
                    "version_name": version_name,
                    "version_code": 1,
                    "release_tag": f"v{version_name}",
                    "apk_filename": apk_name,
                    "download_url": f"https://github.com/Patrox43-debug/Corrientes-Debiles/releases/download/v{version_name}/{apk_name}",
                    "latest_url": f"https://github.com/Patrox43-debug/Corrientes-Debiles/releases/latest/download/{apk_name}",
                    "notes": f"Compilación oficial CDmantencion v{version_name} para Android con firma criptográfica persistente y sincronización en la nube.",
                    "app_name": "CDmantencion"
                })

            # Cloud export for sync / backup
            if path == '/api/cloud/export':
                export_data = db.export_database_data()
                return self.send_json({"success": True, "data": export_data})

            return self.send_json({"error": "Endpoint not found"}, status=404)

        # Direct APK Download (versioned and standard aliases)
        if path.endswith('.apk') and ('CDmantencion' in path or 'CorrientesDebiles' in path):
            version_name = "1.0.0"
            gradle_file = os.path.join(BASE_DIR, 'android-app', 'app', 'build.gradle')
            if os.path.exists(gradle_file):
                try:
                    with open(gradle_file, 'r', encoding='utf-8') as gf:
                        for gline in gf:
                            if 'versionName' in gline and '"' in gline:
                                version_name = gline.split('"')[1]
                                break
                except Exception:
                    pass

            target_filename = f"CDmantencion_v{version_name}.apk"
            possible_paths = [
                os.path.join(BASE_DIR, target_filename),
                os.path.join(STATIC_DIR, target_filename),
                os.path.join(BASE_DIR, 'CDmantencion.apk'),
                os.path.join(STATIC_DIR, 'CDmantencion.apk')
            ]
            apk_path = next((p for p in possible_paths if os.path.exists(p)), None)

            if apk_path:
                with open(apk_path, 'rb') as f:
                    apk_content = f.read()
                self.send_response(200)
                self.send_header('Content-Type', 'application/vnd.android.package-archive')
                self.send_header('Content-Disposition', f'attachment; filename="{target_filename}"')
                self.send_header('Content-Length', str(len(apk_content)))
                self.end_headers()
                self.wfile.write(apk_content)
                return
            else:
                # Redirect to GitHub Releases download
                self.send_response(302)
                self.send_header('Location', f'https://github.com/Patrox43-debug/Corrientes-Debiles/releases/download/v{version_name}/{target_filename}')
                self.end_headers()
                return

        # Serve SPA static files
        if path == '/' or not os.path.exists(os.path.join(STATIC_DIR, path.lstrip('/'))):
            # Fallback to index.html for SPA routing
            index_path = os.path.join(STATIC_DIR, 'index.html')
            if os.path.exists(index_path):
                with open(index_path, 'rb') as f:
                    content = f.read()
                self.send_response(200)
                self.send_header('Content-Type', 'text/html; charset=utf-8')
                self.send_header('Content-Length', str(len(content)))
                self.end_headers()
                self.wfile.write(content)
                return

        return super().do_GET()

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        body = self.read_json_body()

        # Initial setup (create first admin user when database has 0 users)
        if path == '/api/setup':
            if db.count_users() > 0:
                return self.send_json({"success": False, "error": "El sistema ya ha sido configurado con un administrador."}, status=400)
            if not body.get('rut') or not body.get('nombre') or not body.get('password'):
                return self.send_json({"success": False, "error": "RUT, Nombre y Contraseña son obligatorios"}, status=400)
            
            body['rol'] = 'admin'
            admin_user = db.create_user(body)
            token = secrets.token_hex(24)
            SESSIONS[token] = admin_user
            return self.send_json({
                "success": True,
                "token": token,
                "user": admin_user,
                "message": f"Administrador '{admin_user['nombre']}' configurado exitosamente."
            }, status=201)

        # Login
        if path == '/api/login':
            rut = body.get('rut', '')
            password = body.get('password', '')
            if not rut or not password:
                return self.send_json({"success": False, "error": "RUT y contraseña requeridos"}, status=400)

            user = db.authenticate_user(rut, password)
            if not user:
                return self.send_json({"success": False, "error": "Credenciales inválidas. Verifique RUT y contraseña."}, status=401)

            # Generate token and store session
            token = secrets.token_hex(24)
            SESSIONS[token] = user
            return self.send_json({
                "success": True,
                "token": token,
                "user": user,
                "message": f"Bienvenido/a, {user['nombre']}"
            })

        # Logout
        if path == '/api/logout':
            auth_header = self.headers.get('Authorization', '')
            if auth_header.startswith('Bearer '):
                token = auth_header[7:].strip()
                SESSIONS.pop(token, None)
            return self.send_json({"success": True, "message": "Sesión cerrada correctamente"})

        # Create equipment
        if path == '/api/equipos':
            required_fields = ['nombre', 'marca', 'modelo', 'fecha_instalacion']
            for field in required_fields:
                if not body.get(field):
                    return self.send_json({"success": False, "error": f"El campo '{field}' es obligatorio"}, status=400)

            try:
                nuevo_equipo = db.create_equipo(body)
                return self.send_json({"success": True, "equipo": nuevo_equipo}, status=201)
            except Exception as e:
                return self.send_json({"success": False, "error": str(e)}, status=500)

        # Add maintenance log
        if path == '/api/mantenciones':
            required_fields = ['equipo_id', 'fecha_mantencion', 'nombre_tecnico', 'observaciones']
            for field in required_fields:
                if body.get(field) is None or str(body.get(field)).strip() == '':
                    return self.send_json({"success": False, "error": f"El campo '{field}' es obligatorio"}, status=400)

            try:
                equipo_actualizado = db.add_mantencion(body)
                return self.send_json({
                    "success": True,
                    "equipo": equipo_actualizado,
                    "message": "Mantención registrada con éxito en el historial"
                }, status=201)
            except Exception as e:
                return self.send_json({"success": False, "error": str(e)}, status=500)

        # Create user (Admin only)
        if path == '/api/usuarios':
            user = self.get_auth_user()
            if not user or user.get('rol') != 'admin':
                return self.send_json({"success": False, "error": "Acceso restringido a administradores"}, status=403)
            
            if not body.get('rut') or not body.get('nombre') or not body.get('password'):
                return self.send_json({"success": False, "error": "RUT, Nombre y Contraseña son obligatorios"}, status=400)
            
            try:
                new_user = db.create_user(body)
                return self.send_json({"success": True, "user": new_user, "message": "Usuario creado exitosamente"}, status=201)
            except Exception as e:
                err_msg = str(e)
                if "UNIQUE constraint failed" in err_msg:
                    err_msg = "Ya existe un usuario registrado con este RUT"
                return self.send_json({"success": False, "error": err_msg}, status=400)

        # Cloud sync push (merge data into cloud database)
        if path == '/api/cloud/sync':
            try:
                db.import_database_data(body)
                stats = db.get_dashboard_stats()
                return self.send_json({
                    "success": True,
                    "message": "Datos sincronizados correctamente con la base de datos",
                    "stats": stats
                })
            except Exception as e:
                return self.send_json({"success": False, "error": str(e)}, status=500)

        return self.send_json({"error": "Endpoint not found"}, status=404)

    def do_PUT(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        body = self.read_json_body()

        # Update user: /api/usuarios/<id> (Admin only)
        if path.startswith('/api/usuarios/'):
            user = self.get_auth_user()
            if not user or user.get('rol') != 'admin':
                return self.send_json({"success": False, "error": "Acceso restringido a administradores"}, status=403)
            
            parts = path.strip('/').split('/')
            if len(parts) == 3 and parts[2].isdigit():
                target_user_id = int(parts[2])
                try:
                    updated = db.update_user(target_user_id, body)
                    return self.send_json({"success": True, "user": updated, "message": "Usuario actualizado correctamente"})
                except Exception as e:
                    return self.send_json({"success": False, "error": str(e)}, status=400)

        # Update equipment: /api/equipos/<id>
        if path.startswith('/api/equipos/'):
            parts = path.strip('/').split('/')
            if len(parts) == 3 and parts[2].isdigit():
                equipo_id = int(parts[2])
                try:
                    updated = db.update_equipo(equipo_id, body)
                    return self.send_json({"success": True, "equipo": updated})
                except Exception as e:
                    return self.send_json({"success": False, "error": str(e)}, status=500)

        return self.send_json({"error": "Endpoint not found"}, status=404)

    def do_DELETE(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path

        # Delete user: /api/usuarios/<id> (Admin only)
        if path.startswith('/api/usuarios/'):
            user = self.get_auth_user()
            if not user or user.get('rol') != 'admin':
                return self.send_json({"success": False, "error": "Acceso restringido a administradores"}, status=403)
            
            parts = path.strip('/').split('/')
            if len(parts) == 3 and parts[2].isdigit():
                target_user_id = int(parts[2])
                if user['id'] == target_user_id:
                    return self.send_json({"success": False, "error": "No puedes eliminar tu propia cuenta de administrador en uso"}, status=400)
                try:
                    db.delete_user(target_user_id)
                    return self.send_json({"success": True, "message": "Usuario eliminado correctamente"})
                except Exception as e:
                    return self.send_json({"success": False, "error": str(e)}, status=500)

        # Delete equipment: /api/equipos/<id>
        if path.startswith('/api/equipos/'):
            parts = path.strip('/').split('/')
            if len(parts) == 3 and parts[2].isdigit():
                equipo_id = int(parts[2])
                try:
                    db.delete_equipo(equipo_id)
                    return self.send_json({"success": True, "message": "Equipo eliminado correctamente"})
                except Exception as e:
                    return self.send_json({"success": False, "error": str(e)}, status=500)

        return self.send_json({"error": "Endpoint not found"}, status=404)

def run_server(host=HOST, port=PORT):
    # Ensure database is initialized
    db.init_db()

    # Reuse address
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer((host, port), CustomRequestHandler) as httpd:
        print(f"==================================================")
        print(f"  ⚡ CORRIENTES DÉBILES - GESTOR DE EQUIPAMIENTOS")
        print(f"  Estilo Minimalista: Naranjo & Negro")
        print(f"  Dominio oficial: {APP_URL}")
        print(f"  Servidor activo en: http://{host if host != '0.0.0.0' else 'localhost'}:{port}")
        print(f"  Presione Ctrl+C para detener")
        print(f"==================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServidor detenido.")

if __name__ == '__main__':
    run_server()
