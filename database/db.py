import sqlite3
import os
import hashlib
from datetime import datetime

try:
    from database.seed_data import SEED_EQUIPOS, SEED_MANTENCIONES
except ImportError:
    try:
        from .seed_data import SEED_EQUIPOS, SEED_MANTENCIONES
    except ImportError:
        from seed_data import SEED_EQUIPOS, SEED_MANTENCIONES

DB_PATH = os.environ.get('DB_PATH', os.path.join(os.path.dirname(__file__), 'inventario.db'))

def get_connection():
    db_dir = os.path.dirname(os.path.abspath(DB_PATH))
    if db_dir and not os.path.exists(db_dir):
        os.makedirs(db_dir, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode('utf-8')).hexdigest()

def normalize_rut(rut_str: str) -> str:
    """Normalizes RUT to format XX.XXX.XXX-X or X.XXX.XXX-X in uppercase."""
    clean = rut_str.replace('.', '').replace('-', '').strip().upper()
    if len(clean) < 2:
        return clean
    body = clean[:-1]
    dv = clean[-1]
    # Format body with thousand dots
    reversed_body = body[::-1]
    dotted = '.'.join(reversed_body[i:i+3] for i in range(0, len(reversed_body), 3))[::-1]
    return f"{dotted}-{dv}"

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        rut TEXT UNIQUE NOT NULL,
        nombre TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        rol TEXT NOT NULL DEFAULT 'tecnico',
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS equipos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo_qr TEXT UNIQUE NOT NULL,
        nombre TEXT NOT NULL,
        marca TEXT NOT NULL,
        modelo TEXT NOT NULL,
        fecha_instalacion TEXT NOT NULL,
        horas_trabajo REAL NOT NULL DEFAULT 0.0,
        caracteristicas TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'Operativo',
        ubicacion TEXT NOT NULL,
        piso TEXT,
        sector TEXT,
        recinto TEXT,
        numero_serie TEXT,
        capacidad TEXT,
        baterias_cambiadas TEXT,
        observaciones TEXT,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS mantenciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        equipo_id INTEGER NOT NULL,
        fecha_mantencion TEXT NOT NULL,
        nombre_tecnico TEXT NOT NULL,
        horas_trabajo REAL NOT NULL,
        tipo_mantencion TEXT NOT NULL DEFAULT 'Preventiva',
        observaciones TEXT NOT NULL,
        creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (equipo_id) REFERENCES equipos(id) ON DELETE CASCADE
    )
    """)

    # Migration: Ensure all columns exist in equipos
    cursor.execute("PRAGMA table_info(equipos)")
    columns = [row[1] for row in cursor.fetchall()]
    new_cols = [
        ('horas_trabajo', 'REAL NOT NULL DEFAULT 0.0'),
        ('piso', 'TEXT'),
        ('sector', 'TEXT'),
        ('recinto', 'TEXT'),
        ('numero_serie', 'TEXT'),
        ('capacidad', 'TEXT'),
        ('baterias_cambiadas', 'TEXT'),
        ('observaciones', 'TEXT'),
    ]
    for col_name, col_def in new_cols:
        if col_name not in columns:
            cursor.execute(f"ALTER TABLE equipos ADD COLUMN {col_name} {col_def}")

    conn.commit()

    # Seed equipment if not exists
    cursor.execute("SELECT COUNT(*) FROM equipos")
    if cursor.fetchone()[0] == 0:
        for eq in SEED_EQUIPOS:
            cursor.execute("""
                INSERT INTO equipos 
                (id, codigo_qr, nombre, marca, modelo, fecha_instalacion, horas_trabajo, caracteristicas, estado, ubicacion, piso, sector, recinto, numero_serie, capacidad, baterias_cambiadas, observaciones, creado_en, actualizado_en)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                eq.get('id'), eq['codigo_qr'], eq['nombre'], eq['marca'], eq['modelo'], eq['fecha_instalacion'],
                eq.get('horas_trabajo', 0.0), eq.get('caracteristicas', ''), eq.get('estado', 'Operativo'),
                eq.get('ubicacion', 'General'), eq.get('piso'), eq.get('sector'), eq.get('recinto'),
                eq.get('numero_serie'), eq.get('capacidad'), eq.get('baterias_cambiadas'), eq.get('observaciones'),
                eq.get('creado_en', datetime.now().strftime('%Y-%m-%d %H:%M:%S')),
                eq.get('actualizado_en', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
            ))
        conn.commit()

        for m in SEED_MANTENCIONES:
            cursor.execute("""
                INSERT INTO mantenciones 
                (id, equipo_id, fecha_mantencion, nombre_tecnico, horas_trabajo, tipo_mantencion, observaciones, creado_en)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                m.get('id'), m['equipo_id'], m['fecha_mantencion'], m['nombre_tecnico'],
                m.get('horas_trabajo', 2.0), m.get('tipo_mantencion', 'Preventiva'),
                m.get('observaciones', ''), m.get('creado_en', datetime.now().strftime('%Y-%m-%d %H:%M:%S'))
            ))
        conn.commit()

    # Seed official administrator if no users exist
    cursor.execute("SELECT COUNT(*) FROM usuarios")
    if cursor.fetchone()[0] == 0:
        admin_rut = normalize_rut("11.111.111-1")
        admin_hash = hash_password("admin123")
        cursor.execute("""
            INSERT INTO usuarios (id, rut, nombre, password_hash, rol, creado_en)
            VALUES (1, ?, 'Administrador', ?, 'admin', ?)
        """, (admin_rut, admin_hash, datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
        conn.commit()

    # Seed technician user Cristian Aros if not exists
    tech_rut = normalize_rut("16.061.974-5")
    cursor.execute("SELECT id FROM usuarios WHERE rut = ?", (tech_rut,))
    if not cursor.fetchone():
        tech_hash = hash_password("1234")
        cursor.execute("""
            INSERT INTO usuarios (rut, nombre, password_hash, rol, creado_en)
            VALUES (?, 'Cristian Aros', ?, 'tecnico', ?)
        """, (tech_rut, tech_hash, datetime.now().strftime('%Y-%m-%d %H:%M:%S')))
        conn.commit()

    # Synchronize horas_trabajo on equipos if it is 0
    cursor.execute("""
        UPDATE equipos SET horas_trabajo = (
            SELECT COALESCE(SUM(m.horas_trabajo), 0.0)
            FROM mantenciones m
            WHERE m.equipo_id = equipos.id
        ) WHERE horas_trabajo = 0.0 OR horas_trabajo IS NULL
    """)
    conn.commit()

    conn.close()

def count_users() -> int:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM usuarios")
    count = cursor.fetchone()[0]
    conn.close()
    return count

def authenticate_user(rut: str, password: str):
    norm_rut = normalize_rut(rut)
    p_hash = hash_password(password)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "SELECT id, rut, nombre, rol, creado_en FROM usuarios WHERE rut = ? AND password_hash = ?",
        (norm_rut, p_hash)
    )
    user = cursor.fetchone()
    conn.close()
    if user:
        return dict(user)
    return None

def get_all_users():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, rut, nombre, rol, creado_en FROM usuarios ORDER BY id ASC")
    rows = cursor.fetchall()
    users = [dict(r) for r in rows]
    conn.close()
    return users

def get_user_by_id(user_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id, rut, nombre, rol, creado_en FROM usuarios WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    if row:
        return dict(row)
    return None

def create_user(data: dict):
    conn = get_connection()
    cursor = conn.cursor()
    norm_rut = normalize_rut(data['rut'])
    p_hash = hash_password(data['password'].strip())
    rol = data.get('rol', 'tecnico')
    nombre = data['nombre'].strip()

    cursor.execute(
        "INSERT INTO usuarios (rut, nombre, password_hash, rol) VALUES (?, ?, ?, ?)",
        (norm_rut, nombre, p_hash, rol)
    )
    user_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return get_user_by_id(user_id)

def update_user(user_id: int, data: dict):
    conn = get_connection()
    cursor = conn.cursor()
    nombre = data['nombre'].strip()
    rol = data.get('rol', 'tecnico')

    if data.get('rut'):
        norm_rut = normalize_rut(data['rut'])
        cursor.execute("UPDATE usuarios SET rut = ? WHERE id = ?", (norm_rut, user_id))

    cursor.execute("UPDATE usuarios SET nombre = ?, rol = ? WHERE id = ?", (nombre, rol, user_id))

    password = data.get('password', '').strip()
    if password:
        p_hash = hash_password(password)
        cursor.execute("UPDATE usuarios SET password_hash = ? WHERE id = ?", (p_hash, user_id))

    conn.commit()
    conn.close()
    return get_user_by_id(user_id)

def delete_user(user_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM usuarios WHERE id = ?", (user_id,))
    conn.commit()
    conn.close()
    return True

def get_dashboard_stats():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT COUNT(*) FROM equipos")
    total_equipos = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM equipos WHERE estado = 'Operativo'")
    operativos = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM equipos WHERE estado = 'En Mantención'")
    en_mantencion = cursor.fetchone()[0]

    cursor.execute("SELECT COUNT(*) FROM mantenciones")
    total_mantenciones = cursor.fetchone()[0]

    cursor.execute("SELECT DISTINCT marca FROM equipos ORDER BY marca")
    marcas = [row[0] for row in cursor.fetchall()]

    conn.close()
    return {
        "total_equipos": total_equipos,
        "operativos": operativos,
        "en_mantencion": en_mantencion,
        "otros_estados": total_equipos - (operativos + en_mantencion),
        "total_mantenciones": total_mantenciones,
        "marcas": marcas
    }

def get_all_equipos(search_query=None, estado=None, marca=None, sort_by=None):
    conn = get_connection()
    cursor = conn.cursor()

    # Query equipos with subquery for latest maintenance and aggregated metrics
    query = """
    SELECT 
        e.*,
        (
            SELECT m.fecha_mantencion 
            FROM mantenciones m 
            WHERE m.equipo_id = e.id 
            ORDER BY m.fecha_mantencion DESC, m.id DESC 
            LIMIT 1
        ) as ultima_mantencion_fecha,
        (
            SELECT m.nombre_tecnico 
            FROM mantenciones m 
            WHERE m.equipo_id = e.id 
            ORDER BY m.fecha_mantencion DESC, m.id DESC 
            LIMIT 1
        ) as ultima_mantencion_tecnico,
        (
            SELECT m.horas_trabajo 
            FROM mantenciones m 
            WHERE m.equipo_id = e.id 
            ORDER BY m.fecha_mantencion DESC, m.id DESC 
            LIMIT 1
        ) as ultima_mantencion_horas,
        (
            SELECT m.observaciones 
            FROM mantenciones m 
            WHERE m.equipo_id = e.id 
            ORDER BY m.fecha_mantencion DESC, m.id DESC 
            LIMIT 1
        ) as ultima_mantencion_obs,
        (
            SELECT COUNT(*) 
            FROM mantenciones m 
            WHERE m.equipo_id = e.id
        ) as total_mantenciones,
        (
            SELECT COALESCE(SUM(m.horas_trabajo), 0) 
            FROM mantenciones m 
            WHERE m.equipo_id = e.id
        ) as total_horas_trabajo
    FROM equipos e
    WHERE 1=1
    """

    params = []

    if search_query:
        search_term = f"%{search_query.strip()}%"
        query += """ AND (
            e.nombre LIKE ? OR 
            e.marca LIKE ? OR 
            e.modelo LIKE ? OR 
            e.codigo_qr LIKE ? OR 
            e.caracteristicas LIKE ? OR
            e.ubicacion LIKE ? OR
            COALESCE(e.numero_serie, '') LIKE ? OR
            COALESCE(e.recinto, '') LIKE ? OR
            COALESCE(e.piso, '') LIKE ? OR
            COALESCE(e.sector, '') LIKE ? OR
            EXISTS (
                SELECT 1 FROM mantenciones sm 
                WHERE sm.equipo_id = e.id AND (sm.nombre_tecnico LIKE ? OR sm.observaciones LIKE ?)
            )
        )"""
        params.extend([search_term] * 12)

    if estado and estado != 'Todos':
        query += " AND e.estado = ?"
        params.append(estado)

    if marca and marca != 'Todas':
        query += " AND e.marca = ?"
        params.append(marca)

    if sort_by == 'recientes':
        query += " ORDER BY e.id DESC"
    elif sort_by == 'antiguos':
        query += " ORDER BY e.id ASC"
    elif sort_by == 'mantencion_desc':
        query += " ORDER BY ultima_mantencion_fecha DESC NULLS LAST"
    elif sort_by == 'instalacion_desc':
        query += " ORDER BY e.fecha_instalacion DESC"
    else:
        query += " ORDER BY e.id DESC"

    cursor.execute(query, params)
    rows = cursor.fetchall()
    equipos = [dict(row) for row in rows]
    conn.close()
    return equipos

def get_equipo_by_id(equipo_id: int):
    conn = get_connection()
    cursor = conn.cursor()

    query = """
    SELECT 
        e.*,
        (
            SELECT m.fecha_mantencion 
            FROM mantenciones m 
            WHERE m.equipo_id = e.id 
            ORDER BY m.fecha_mantencion DESC, m.id DESC 
            LIMIT 1
        ) as ultima_mantencion_fecha,
        (
            SELECT m.nombre_tecnico 
            FROM mantenciones m 
            WHERE m.equipo_id = e.id 
            ORDER BY m.fecha_mantencion DESC, m.id DESC 
            LIMIT 1
        ) as ultima_mantencion_tecnico,
        (
            SELECT m.horas_trabajo 
            FROM mantenciones m 
            WHERE m.equipo_id = e.id 
            ORDER BY m.fecha_mantencion DESC, m.id DESC 
            LIMIT 1
        ) as ultima_mantencion_horas,
        (
            SELECT m.observaciones 
            FROM mantenciones m 
            WHERE m.equipo_id = e.id 
            ORDER BY m.fecha_mantencion DESC, m.id DESC 
            LIMIT 1
        ) as ultima_mantencion_obs,
        (
            SELECT COUNT(*) 
            FROM mantenciones m 
            WHERE m.equipo_id = e.id
        ) as total_mantenciones,
        (
            SELECT COALESCE(SUM(m.horas_trabajo), 0) 
            FROM mantenciones m 
            WHERE m.equipo_id = e.id
        ) as total_horas_trabajo
    FROM equipos e
    WHERE e.id = ?
    """
    cursor.execute(query, (equipo_id,))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    equipo = dict(row)

    # Get all maintenance records ordered chronologically
    cursor.execute("""
        SELECT * FROM mantenciones 
        WHERE equipo_id = ? 
        ORDER BY fecha_mantencion DESC, id DESC
    """, (equipo_id,))
    mantenciones = [dict(m) for m in cursor.fetchall()]
    equipo['mantenciones'] = mantenciones

    conn.close()
    return equipo

def get_equipo_by_code(codigo_qr: str):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id FROM equipos 
        WHERE codigo_qr = ? OR LOWER(codigo_qr) = LOWER(?)
           OR numero_serie = ? OR LOWER(numero_serie) = LOWER(?)
    """, (codigo_qr, codigo_qr, codigo_qr, codigo_qr))
    row = cursor.fetchone()
    conn.close()
    if row:
        return get_equipo_by_id(row['id'])
    return None

def create_equipo(data: dict):
    conn = get_connection()
    cursor = conn.cursor()

    # Generate QR Code string if not provided
    codigo_qr = data.get('codigo_qr', '').strip()
    if not codigo_qr:
        cursor.execute("SELECT MAX(id) FROM equipos")
        max_id = cursor.fetchone()[0] or 0
        codigo_qr = f"EQ-UPS-{max_id + 1:03d}"

    horas_trabajo = float(data.get('horas_trabajo', 0.0) or 0.0)

    cursor.execute("""
        INSERT INTO equipos 
        (codigo_qr, nombre, marca, modelo, fecha_instalacion, horas_trabajo, caracteristicas, estado, ubicacion, piso, sector, recinto, numero_serie, capacidad, baterias_cambiadas, observaciones)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        codigo_qr,
        data['nombre'].strip(),
        data['marca'].strip(),
        data['modelo'].strip(),
        data['fecha_instalacion'].strip(),
        horas_trabajo,
        data.get('caracteristicas', '').strip(),
        data.get('estado', 'Operativo'),
        data.get('ubicacion', 'General').strip(),
        data.get('piso', '').strip() if data.get('piso') else None,
        data.get('sector', '').strip() if data.get('sector') else None,
        data.get('recinto', '').strip() if data.get('recinto') else None,
        data.get('numero_serie', '').strip() if data.get('numero_serie') else None,
        data.get('capacidad', '').strip() if data.get('capacidad') else None,
        data.get('baterias_cambiadas', '').strip() if data.get('baterias_cambiadas') else None,
        data.get('observaciones', '').strip() if data.get('observaciones') else None
    ))
    equipo_id = cursor.lastrowid
    conn.commit()

    # Optional initial maintenance if provided
    if data.get('primera_mantencion_tecnico'):
        m_horas = float(data.get('primera_mantencion_horas', 1.0) or 1.0)
        cursor.execute("""
            INSERT INTO mantenciones 
            (equipo_id, fecha_mantencion, nombre_tecnico, horas_trabajo, tipo_mantencion, observaciones)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (
            equipo_id,
            data.get('primera_mantencion_fecha', data['fecha_instalacion']),
            data['primera_mantencion_tecnico'].strip(),
            m_horas,
            data.get('primera_mantencion_tipo', 'Instalación y Puesta en Marcha'),
            data.get('primera_mantencion_obs', 'Puesta en marcha inicial del equipamiento y verificación de operación.').strip()
        ))
        # If equipo horas_trabajo was 0, set to maintenance hours
        if horas_trabajo == 0.0:
            cursor.execute("UPDATE equipos SET horas_trabajo = ? WHERE id = ?", (m_horas, equipo_id))
        conn.commit()

    conn.close()
    return get_equipo_by_id(equipo_id)

def update_equipo(equipo_id: int, data: dict):
    conn = get_connection()
    cursor = conn.cursor()

    horas_trabajo = float(data.get('horas_trabajo', 0.0) or 0.0)

    cursor.execute("""
        UPDATE equipos SET
            nombre = ?,
            marca = ?,
            modelo = ?,
            fecha_instalacion = ?,
            horas_trabajo = ?,
            caracteristicas = ?,
            estado = ?,
            ubicacion = ?,
            piso = COALESCE(?, piso),
            sector = COALESCE(?, sector),
            recinto = COALESCE(?, recinto),
            numero_serie = COALESCE(?, numero_serie),
            capacidad = COALESCE(?, capacidad),
            baterias_cambiadas = COALESCE(?, baterias_cambiadas),
            observaciones = COALESCE(?, observaciones),
            actualizado_en = CURRENT_TIMESTAMP
        WHERE id = ?
    """, (
        data['nombre'].strip(),
        data['marca'].strip(),
        data['modelo'].strip(),
        data['fecha_instalacion'].strip(),
        horas_trabajo,
        data.get('caracteristicas', '').strip(),
        data.get('estado', 'Operativo'),
        data.get('ubicacion', 'General').strip(),
        data.get('piso'),
        data.get('sector'),
        data.get('recinto'),
        data.get('numero_serie'),
        data.get('capacidad'),
        data.get('baterias_cambiadas'),
        data.get('observaciones'),
        equipo_id
    ))
    conn.commit()
    conn.close()
    return get_equipo_by_id(equipo_id)

def delete_equipo(equipo_id: int):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM equipos WHERE id = ?", (equipo_id,))
    conn.commit()
    conn.close()
    return True

def add_mantencion(data: dict):
    conn = get_connection()
    cursor = conn.cursor()

    m_horas = float(data.get('horas_trabajo', 0.0) or 0.0)

    cursor.execute("""
        INSERT INTO mantenciones 
        (equipo_id, fecha_mantencion, nombre_tecnico, horas_trabajo, tipo_mantencion, observaciones)
        VALUES (?, ?, ?, ?, ?, ?)
    """, (
        int(data['equipo_id']),
        data['fecha_mantencion'].strip(),
        data['nombre_tecnico'].strip(),
        m_horas,
        data.get('tipo_mantencion', 'Preventiva'),
        data.get('observaciones', '').strip()
    ))

    # If estado was requested to update, update the equipo's state
    if data.get('actualizar_estado'):
        cursor.execute("UPDATE equipos SET estado = ?, actualizado_en = CURRENT_TIMESTAMP WHERE id = ?",
                       (data['actualizar_estado'], int(data['equipo_id'])))

    conn.commit()
    conn.close()
    return get_equipo_by_id(int(data['equipo_id']))

def export_database_data():
    """Exports all database tables for synchronization and cloud backups."""
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT id, rut, nombre, rol, creado_en FROM usuarios")
    usuarios = [dict(row) for row in cursor.fetchall()]

    cursor.execute("SELECT * FROM equipos")
    equipos = [dict(row) for row in cursor.fetchall()]

    cursor.execute("SELECT * FROM mantenciones")
    mantenciones = [dict(row) for row in cursor.fetchall()]

    conn.close()
    return {
        "version": "1.0",
        "timestamp": datetime.now().isoformat(),
        "usuarios": usuarios,
        "equipos": equipos,
        "mantenciones": mantenciones
    }

def import_database_data(data: dict):
    """Imports or merges synchronization data into the local SQLite database."""
    conn = get_connection()
    cursor = conn.cursor()

    imported_equipos = data.get('equipos', [])
    for eq in imported_equipos:
        cursor.execute("SELECT id FROM equipos WHERE codigo_qr = ?", (eq.get('codigo_qr'),))
        row = cursor.fetchone()
        horas = float(eq.get('horas_trabajo', 0.0) or 0.0)
        if row:
            cursor.execute("""
                UPDATE equipos SET
                    nombre = ?,
                    marca = ?,
                    modelo = ?,
                    fecha_instalacion = ?,
                    horas_trabajo = ?,
                    caracteristicas = ?,
                    estado = ?,
                    ubicacion = ?,
                    piso = COALESCE(?, piso),
                    sector = COALESCE(?, sector),
                    recinto = COALESCE(?, recinto),
                    numero_serie = COALESCE(?, numero_serie),
                    capacidad = COALESCE(?, capacidad),
                    baterias_cambiadas = COALESCE(?, baterias_cambiadas),
                    observaciones = COALESCE(?, observaciones),
                    actualizado_en = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (
                eq['nombre'], eq['marca'], eq['modelo'], eq['fecha_instalacion'],
                horas, eq.get('caracteristicas', ''), eq.get('estado', 'Operativo'),
                eq.get('ubicacion', 'General'),
                eq.get('piso'), eq.get('sector'), eq.get('recinto'),
                eq.get('numero_serie'), eq.get('capacidad'), eq.get('baterias_cambiadas'), eq.get('observaciones'),
                row[0]
            ))
        else:
            cursor.execute("""
                INSERT INTO equipos 
                (codigo_qr, nombre, marca, modelo, fecha_instalacion, horas_trabajo, caracteristicas, estado, ubicacion, piso, sector, recinto, numero_serie, capacidad, baterias_cambiadas, observaciones)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                eq.get('codigo_qr'), eq['nombre'], eq['marca'], eq['modelo'],
                eq['fecha_instalacion'], horas, eq.get('caracteristicas', ''),
                eq.get('estado', 'Operativo'), eq.get('ubicacion', 'General'),
                eq.get('piso'), eq.get('sector'), eq.get('recinto'),
                eq.get('numero_serie'), eq.get('capacidad'), eq.get('baterias_cambiadas'), eq.get('observaciones')
            ))

    # Import mantenciones
    imported_mant = data.get('mantenciones', [])
    for m in imported_mant:
        cursor.execute("""
            SELECT id FROM mantenciones 
            WHERE equipo_id = ? AND fecha_mantencion = ? AND nombre_tecnico = ?
        """, (m['equipo_id'], m['fecha_mantencion'], m['nombre_tecnico']))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO mantenciones 
                (equipo_id, fecha_mantencion, nombre_tecnico, horas_trabajo, tipo_mantencion, observaciones)
                VALUES (?, ?, ?, ?, ?, ?)
            """, (
                m['equipo_id'], m['fecha_mantencion'], m['nombre_tecnico'],
                float(m.get('horas_trabajo', 0.0) or 0.0),
                m.get('tipo_mantencion', 'Preventiva'), m.get('observaciones', '')
            ))

    conn.commit()
    conn.close()
    return True

if __name__ == '__main__':
    init_db()
    print("Database initialized successfully with schema and seed data.")
