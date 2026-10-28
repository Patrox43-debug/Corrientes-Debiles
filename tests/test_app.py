import threading
import time
import urllib.request
import json
import socketserver
import os
import sys

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app import CustomRequestHandler, PORT
from database import db

TEST_PORT = 8999

def run_test_server():
    socketserver.TCPServer.allow_reuse_address = True
    server = socketserver.TCPServer(("127.0.0.1", TEST_PORT), CustomRequestHandler)
    server.serve_forever()

def test_suite():
    # Initialize DB
    db.init_db()

    # Start server in thread
    t = threading.Thread(target=run_test_server, daemon=True)
    t.start()
    time.sleep(0.5)

    base_url = f"http://127.0.0.1:{TEST_PORT}"
    print(f"Testing server on {base_url}...")

    # 1. Test GET /
    with urllib.request.urlopen(f"{base_url}/") as res:
        assert res.status == 200
        html = res.read().decode('utf-8')
        assert "CORRIENTES" in html
        assert "login-form" in html
        print("✓ Test 1: GET / (index.html) OK")

    # 2. Test GET /css/style.css
    with urllib.request.urlopen(f"{base_url}/css/style.css") as res:
        assert res.status == 200
        css = res.read().decode('utf-8')
        assert "--orange-primary" in css
        print("✓ Test 2: GET /css/style.css OK")

    # 3. Test GET /js/app.js
    with urllib.request.urlopen(f"{base_url}/js/app.js") as res:
        assert res.status == 200
        js = res.read().decode('utf-8')
        assert "AppController" in js
        print("✓ Test 3: GET /js/app.js OK")

    # 4. Test GET /api/stats
    with urllib.request.urlopen(f"{base_url}/api/stats") as res:
        assert res.status == 200
        data = json.loads(res.read().decode('utf-8'))
        assert data['success'] is True
        stats = data['stats']
        assert stats['total_equipos'] >= 6
        assert stats['operativos'] >= 1
        print("✓ Test 4: GET /api/stats OK -> Stats:", stats)

    # 5. Test GET /api/equipos
    with urllib.request.urlopen(f"{base_url}/api/equipos") as res:
        assert res.status == 200
        data = json.loads(res.read().decode('utf-8'))
        assert data['success'] is True
        assert len(data['equipos']) >= 6
        first_eq = data['equipos'][0]
        assert 'ultima_mantencion_fecha' in first_eq
        assert 'ultima_mantencion_tecnico' in first_eq
        assert 'caracteristicas' in first_eq
        print(f"✓ Test 5: GET /api/equipos OK -> Loaded {len(data['equipos'])} equipos")

    # 5.5 Test GET /api/setup/status and POST /api/setup
    test_rut = "11.111.111-1"
    test_pass = "admin123"

    with urllib.request.urlopen(f"{base_url}/api/setup/status") as res:
        assert res.status == 200
        setup_status = json.loads(res.read().decode('utf-8'))
        print("✓ Test 5.5: GET /api/setup/status OK ->", setup_status)

    if not setup_status.get('initialized'):
        setup_payload = json.dumps({
            "rut": test_rut,
            "nombre": "Administrador",
            "password": test_pass
        }).encode('utf-8')
        setup_req = urllib.request.Request(f"{base_url}/api/setup", data=setup_payload, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(setup_req) as res:
            assert res.status == 201
            setup_res = json.loads(res.read().decode('utf-8'))
            assert setup_res['success'] is True
            print("✓ Test 5.6: POST /api/setup (Dynamic Admin Setup) OK")

    # 6. Test POST /api/login (Success)
    login_data = json.dumps({"rut": test_rut, "password": test_pass}).encode('utf-8')
    req = urllib.request.Request(f"{base_url}/api/login", data=login_data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as res:
        assert res.status == 200
        data = json.loads(res.read().decode('utf-8'))
        assert data['success'] is True
        assert 'token' in data
        assert data['user']['rut'] == '11.111.111-1'
        token = data['token']
        print("✓ Test 6: POST /api/login (Success) OK -> Token received")

    # 7. Test POST /api/login (Invalid password)
    try:
        bad_login = json.dumps({"rut": test_rut, "password": "wrongpassword"}).encode('utf-8')
        bad_req = urllib.request.Request(f"{base_url}/api/login", data=bad_login, headers={'Content-Type': 'application/json'})
        urllib.request.urlopen(bad_req)
        assert False, "Should have failed with 401"
    except urllib.error.HTTPError as e:
        assert e.code == 401
        print("✓ Test 7: POST /api/login (Invalid rejection) OK")

    # 8. Test GET /api/equipos/qr/EQ-UPS-001
    with urllib.request.urlopen(f"{base_url}/api/equipos/qr/EQ-UPS-001") as res:
        assert res.status == 200
        data = json.loads(res.read().decode('utf-8'))
        assert data['success'] is True
        eq = data['equipo']
        assert eq['codigo_qr'] == 'EQ-UPS-001'
        assert len(eq['mantenciones']) >= 1
        print(f"✓ Test 8: GET /api/equipos/qr/EQ-UPS-001 OK -> {eq['nombre']} ({len(eq['mantenciones'])} mantenciones)")

    # 9. Test POST /api/mantenciones (Add maintenance record without technician hours)
    mant_payload = json.dumps({
        "equipo_id": 1,
        "fecha_mantencion": "2026-10-27",
        "nombre_tecnico": "Rodrigo Valdés",
        "tipo_mantencion": "Preventiva",
        "actualizar_estado": "Operativo",
        "observaciones": "Mantención de prueba automatizada: chequeo de conectores PoE y rotación de domo."
    }).encode('utf-8')
    req = urllib.request.Request(
        f"{base_url}/api/mantenciones",
        data=mant_payload,
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(req) as res:
        assert res.status == 201
        data = json.loads(res.read().decode('utf-8'))
        assert data['success'] is True
        assert data['equipo']['ultima_mantencion_fecha'] == "2026-10-27"
        assert data['equipo']['ultima_mantencion_tecnico'] == "Rodrigo Valdés"
        print("✓ Test 9: POST /api/mantenciones OK -> Latest maintenance updated")

    # 10. Test POST /api/equipos (Create new equipment with horas_trabajo)
    new_eq_payload = json.dumps({
        "nombre": "Cámara Térmica Biespectral",
        "marca": "Hikvision",
        "modelo": "DS-2TD2617-6/PA",
        "fecha_instalacion": "2026-10-27",
        "horas_trabajo": 4.5,
        "estado": "Operativo",
        "ubicacion": "Subestación Eléctrica Principal",
        "caracteristicas": "Sensor térmico 160x120 + Sensor óptico 4MP, Detección temprana de incendios por sobrecalentamiento, Alarma con luz estroboscópica y audio integrado."
    }).encode('utf-8')
    req = urllib.request.Request(
        f"{base_url}/api/equipos",
        data=new_eq_payload,
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(req) as res:
        assert res.status == 201
        data = json.loads(res.read().decode('utf-8'))
        assert data['success'] is True
        assert data['equipo']['horas_trabajo'] == 4.5
        created_id = data['equipo']['id']
        created_qr = data['equipo']['codigo_qr']
        print(f"✓ Test 10: POST /api/equipos OK -> Created ID: {created_id}, QR: {created_qr}, Horas: {data['equipo']['horas_trabajo']}")

    # 11. Test PUT /api/equipos/<id>
    update_payload = json.dumps({
        "nombre": "Cámara Térmica Biespectral Industrial",
        "marca": "Hikvision",
        "modelo": "DS-2TD2617-6/PA",
        "fecha_instalacion": "2026-10-27",
        "horas_trabajo": 6.0,
        "estado": "En Mantención",
        "ubicacion": "Subestación Eléctrica Principal - Torre Norte",
        "caracteristicas": "Actualizado: Sensor térmico calibrado."
    }).encode('utf-8')
    req = urllib.request.Request(
        f"{base_url}/api/equipos/{created_id}",
        data=update_payload,
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'},
        method='PUT'
    )
    with urllib.request.urlopen(req) as res:
        assert res.status == 200
        data = json.loads(res.read().decode('utf-8'))
        assert data['success'] is True
        assert data['equipo']['estado'] == 'En Mantención'
        assert data['equipo']['horas_trabajo'] == 6.0
        print(f"✓ Test 11: PUT /api/equipos/{created_id} OK -> Updated successfully (Horas: {data['equipo']['horas_trabajo']})")

    # 12. Test DELETE /api/equipos/<id>
    req = urllib.request.Request(
        f"{base_url}/api/equipos/{created_id}",
        headers={'Authorization': f'Bearer {token}'},
        method='DELETE'
    )
    with urllib.request.urlopen(req) as res:
        assert res.status == 200
        data = json.loads(res.read().decode('utf-8'))
        assert data['success'] is True
        print(f"✓ Test 12: DELETE /api/equipos/{created_id} OK -> Deleted successfully")

    # 13. Test GET /api/usuarios (Admin)
    req = urllib.request.Request(
        f"{base_url}/api/usuarios",
        headers={'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(req) as res:
        assert res.status == 200
        data = json.loads(res.read().decode('utf-8'))
        assert data['success'] is True
        assert len(data['users']) >= 1
        print(f"✓ Test 13: GET /api/usuarios OK -> Found {len(data['users'])} users")

    # 14. Test POST /api/usuarios (Create user)
    new_user_payload = json.dumps({
        "rut": "44.444.444-4",
        "nombre": "Loreto Vega (Técnica)",
        "password": "claveSegura123",
        "rol": "tecnico"
    }).encode('utf-8')
    req = urllib.request.Request(
        f"{base_url}/api/usuarios",
        data=new_user_payload,
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}
    )
    with urllib.request.urlopen(req) as res:
        assert res.status == 201
        data = json.loads(res.read().decode('utf-8'))
        assert data['success'] is True
        new_uid = data['user']['id']
        assert data['user']['rut'] == "44.444.444-4"
        print(f"✓ Test 14: POST /api/usuarios OK -> Created user id {new_uid}")

    # 15. Test PUT /api/usuarios/<id> (Update user)
    update_user_payload = json.dumps({
        "rut": "44.444.444-4",
        "nombre": "Loreto Vega (Supervisora)",
        "password": "nuevaClave456",
        "rol": "admin"
    }).encode('utf-8')
    req = urllib.request.Request(
        f"{base_url}/api/usuarios/{new_uid}",
        data=update_user_payload,
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'},
        method='PUT'
    )
    with urllib.request.urlopen(req) as res:
        assert res.status == 200
        data = json.loads(res.read().decode('utf-8'))
        assert data['success'] is True
        assert data['user']['rol'] == "admin"
        print(f"✓ Test 15: PUT /api/usuarios/{new_uid} OK -> Updated user to admin")

    # 16. Test DELETE /api/usuarios/<id>
    req = urllib.request.Request(
        f"{base_url}/api/usuarios/{new_uid}",
        headers={'Authorization': f'Bearer {token}'},
        method='DELETE'
    )
    with urllib.request.urlopen(req) as res:
        assert res.status == 200
        data = json.loads(res.read().decode('utf-8'))
        assert data['success'] is True
        print(f"✓ Test 16: DELETE /api/usuarios/{new_uid} OK -> Deleted user successfully")

    # 17. Test GET /api/app-version & /CDmantencion.apk (APK Versioning and Download Route)
    with urllib.request.urlopen(f"{base_url}/api/app-version") as res:
        assert res.status == 200
        ver_data = json.loads(res.read().decode('utf-8'))
        assert "version_name" in ver_data
        assert ver_data["app_name"] == "CDmantencion"
        print(f"✓ Test 17a: GET /api/app-version OK -> Version {ver_data['version_name']}")

    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None

    opener = urllib.request.build_opener(NoRedirect)
    try:
        resp = opener.open(f"{base_url}/CDmantencion.apk")
        assert resp.status in (200, 302)
        resp.read()
        resp.close()
    except urllib.error.HTTPError as e:
        assert e.code == 302
        assert "releases" in e.headers.get("Location", "")
    print("✓ Test 17b: GET /CDmantencion.apk OK -> Handled APK download/release redirect")

    # 18. Test GET /api/cloud/export (Cloud Database Export)
    with urllib.request.urlopen(f"{base_url}/api/cloud/export") as res:
        assert res.status == 200
        data = json.loads(res.read().decode('utf-8'))
        assert data['success'] is True
        assert 'data' in data
        assert len(data['data']['equipos']) >= 6
        assert len(data['data']['mantenciones']) >= 10
        print(f"✓ Test 18: GET /api/cloud/export OK -> Exported {len(data['data']['equipos'])} equipos and {len(data['data']['mantenciones'])} mantenciones")

    # 19. Test POST /api/cloud/sync (Cloud Synchronization Push)
    sync_payload = json.dumps({
        "equipos": [{
            "codigo_qr": "EQ-TEST-999",
            "nombre": "Cámara Térmica PTZ Perimetral",
            "marca": "FLIR",
            "modelo": "FC-632",
            "fecha_instalacion": "2026-10-01",
            "horas_trabajo": 12.0,
            "caracteristicas": "Sensor microbolómetro no refrigerado 640x512",
            "estado": "Operativo",
            "ubicacion": "Subestación Eléctrica"
        }],
        "mantenciones": []
    }).encode('utf-8')
    req = urllib.request.Request(
        f"{base_url}/api/cloud/sync",
        data=sync_payload,
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req) as res:
        assert res.status == 200
        data = json.loads(res.read().decode('utf-8'))
        assert data['success'] is True
        print("✓ Test 19: POST /api/cloud/sync OK -> Sync accepted")

    # Clean up sync test item and test maintenance
    try:
        import sqlite3
        conn = sqlite3.connect('database/inventario.db')
        c = conn.cursor()
        c.execute("DELETE FROM equipos WHERE codigo_qr LIKE '%TEST%'")
        c.execute("DELETE FROM mantenciones WHERE observaciones LIKE '%prueba automatizada%'")
        conn.commit()
        conn.close()
    except Exception:
        pass

    print("\n🎉 ALL 19 TESTS PASSED SUCCESSFULLY!")

if __name__ == '__main__':
    test_suite()
