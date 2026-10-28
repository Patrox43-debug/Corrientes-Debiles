/**
 * Corrientes Débiles - Local Storage Database & Cloud Synchronization Engine
 * Provee persistencia 100% offline local en el dispositivo (teléfono/APK/navegador)
 * con capacidad de conmutar y sincronizar con base de datos en la nube.
 */

// Sin credenciales precargadas: el sistema solicita crear el Administrador de forma segura en el primer inicio.
const SEED_USERS = [];

const SEED_EQUIPOS = [
    {
        id: 1,
        codigo_qr: "EQ-CCTV-001",
        nombre: "Cámara IP Domo PTZ Perimetral 4K",
        marca: "Dahua Technology",
        modelo: "DH-SD49425XB-HNR",
        fecha_instalacion: "2024-03-15",
        horas_trabajo: 5.5,
        caracteristicas: "Sensor 1/2.8\" CMOS 4MP | Zoom Óptico 25x | Visión IR 100m Smart IR | Soporta PoE+ (802.3at) | Protección IP66 & IK10 | Compresión H.265+ | Analíticas avanzadas de IA (Cruce perimetral, Detección humana/vehicular)",
        estado: "Operativo",
        ubicacion: "Acceso Perimetral Sur - Poste 4",
        creado_en: "2024-03-15T10:00:00"
    },
    {
        id: 2,
        codigo_qr: "EQ-NVR-002",
        nombre: "Grabador Digital NVR 32 Canales 4K",
        marca: "Hikvision",
        modelo: "DS-7732NI-I4/16P",
        fecha_instalacion: "2023-11-20",
        horas_trabajo: 6.5,
        caracteristicas: "32 Canales IP hasta 12MP | 4 Bahías SATA (32TB instalados en RAID 5) | Ancho de banda entrante 256 Mbps | 16 Puertos PoE integrados 802.3af/at | Salida HDMI 4K independiente | Doble interfaz LAN Gigabit redundante | Decodificación H.265+",
        estado: "Operativo",
        ubicacion: "Sala de Racks Central - U14",
        creado_en: "2023-11-20T14:30:00"
    },
    {
        id: 3,
        codigo_qr: "EQ-NET-003",
        nombre: "Switch Gestionable PoE+ 24 Puertos L2+",
        marca: "Cisco",
        modelo: "CBS350-24P-4G",
        fecha_instalacion: "2024-01-10",
        horas_trabajo: 3.5,
        caracteristicas: "24 Puertos 10/100/1000 Mbps PoE+ (Presupuesto 195W) | 4 Puertos SFP Gigabit Fibra | Capacidad de conmutación 56 Gbps | Enrutamiento estático IPv4/IPv6 L3 | VLAN 802.1Q | Soporte Spanning Tree RSTP/MSTP | Interfaz Web y CLI SSH",
        estado: "Operativo",
        ubicacion: "Rack Distribución Telecomunicaciones - Piso 1",
        creado_en: "2024-01-10T09:15:00"
    },
    {
        id: 4,
        codigo_qr: "EQ-INC-004",
        nombre: "Central de Detección de Incendio Direccionable",
        marca: "Notifier by Honeywell",
        modelo: "NFS2-640",
        fecha_instalacion: "2023-08-05",
        horas_trabajo: 7.0,
        caracteristicas: "2 Lazos SLC direccionables (hasta 636 puntos) | Protocolo FlashScan alta velocidad | Pantalla LCD retroiluminada de 80 caracteres | Baterías de respaldo 2x 12V 18Ah con cargador supervisado | 4 Circuitos de notificación NACs Clase A/B | Certificado UL/NFPA 72",
        estado: "Operativo",
        ubicacion: "Conserjería Central / Sala de Control y Monitoreo",
        creado_en: "2023-08-05T12:00:00"
    },
    {
        id: 5,
        codigo_qr: "EQ-ACC-005",
        nombre: "Panel de Control de Acceso IP 4 Puertas",
        marca: "ZKTeco",
        modelo: "InBio-460 Pro",
        fecha_instalacion: "2024-04-02",
        horas_trabajo: 5.0,
        caracteristicas: "Controlador para 4 puertas / 8 lectores (RS485 y Wiegand 26/34) | Capacidad 20.000 huellas y 100.000 tarjetas RFID | Comunicación TCP/IP encriptada TLS | 4 Relés auxiliares + 4 Relés de cerrojo magnético | Puerto batería de respaldo 12V 7Ah",
        estado: "En Mantención",
        ubicacion: "Tablero Eléctrico Acceso - Subterráneo Nivel -1",
        creado_en: "2024-04-02T16:45:00"
    },
    {
        id: 6,
        codigo_qr: "EQ-UPS-006",
        nombre: "Sistema UPS Online Doble Conversión 3kVA",
        marca: "APC by Schneider Electric",
        modelo: "Smart-UPS On-Line SRT3000XLI",
        fecha_instalacion: "2023-05-10",
        horas_trabajo: 4.5,
        caracteristicas: "Topología Doble Conversión Online de Onda Senoidal Pura | Capacidad 3000VA / 2700W | Factor de potencia 0.9 | Tarjeta de red y monitoreo remoto SNMP NMC3 | Display gráfico LCD interactivo | Banco interno de baterías 96V DC | Bypass estático automático y manual",
        estado: "Operativo",
        ubicacion: "Rack Servidores Principal - Espacio U1 a U4",
        creado_en: "2023-05-10T11:20:00"
    }
];

const SEED_MANTENCIONES = [
    {
        id: 1,
        equipo_id: 1,
        fecha_mantencion: "2024-08-10",
        nombre_tecnico: "Carlos Valenzuela",
        horas_trabajo: 2.0,
        tipo_mantencion: "Preventiva",
        observaciones: "Limpieza profunda de cúpula óptica y ajuste de sellos perimetrales. Verificación de movimiento Pan/Tilt en sus 360 grados y chequeo de iluminación IR nocturna."
    },
    {
        id: 2,
        equipo_id: 1,
        fecha_mantencion: "2026-05-18",
        nombre_tecnico: "Matías Henríquez",
        horas_trabajo: 3.5,
        tipo_mantencion: "Preventiva",
        observaciones: "Actualización de firmware de cámara a versión v3.12. Recalibración del preset de auto-enfoque y reapriete de herrajes en soporte de montaje exterior."
    },
    {
        id: 3,
        equipo_id: 2,
        fecha_mantencion: "2024-04-12",
        nombre_tecnico: "Andrés Morales",
        horas_trabajo: 2.5,
        tipo_mantencion: "Preventiva",
        observaciones: "Inspección de temperaturas internas de gabinete y discos. Limpieza de filtros antipolvo de ventiladores de fuente redundante y chequeo de sincronización horaria NTP."
    },
    {
        id: 4,
        equipo_id: 2,
        fecha_mantencion: "2026-07-22",
        nombre_tecnico: "Rodrigo Espinoza",
        horas_trabajo: 4.0,
        tipo_mantencion: "Correctiva",
        observaciones: "Sustitución de disco HDD bahía #3 por advertencia de sectores reasignados S.M.A.R.T. Reconstrucción exitosa de volumen RAID 5 y respaldo completo de perfiles de grabación."
    },
    {
        id: 5,
        equipo_id: 3,
        fecha_mantencion: "2024-07-15",
        nombre_tecnico: "Carlos Valenzuela",
        horas_trabajo: 1.5,
        tipo_mantencion: "Preventiva",
        observaciones: "Revisión de tablas MAC y puertos PoE. Medición de temperatura ambiente en rack de distribución."
    },
    {
        id: 6,
        equipo_id: 3,
        fecha_mantencion: "2026-09-05",
        nombre_tecnico: "Carlos Valenzuela",
        horas_trabajo: 2.0,
        tipo_mantencion: "Preventiva",
        observaciones: "Comprobación de potencias ópticas en módulos SFP de fibra monomodo (Piso 1 hacia Data Center). Test de consumo en vatios por puerto PoE de cámaras conectadas."
    },
    {
        id: 7,
        equipo_id: 4,
        fecha_mantencion: "2024-02-14",
        nombre_tecnico: "Gabriel Soto",
        horas_trabajo: 4.0,
        tipo_mantencion: "Preventiva",
        observaciones: "Inspección de lazos SLC 1 y 2 con simulador de humo aerosol. Comprobación de tensión de flotación de baterías 12V 18Ah."
    },
    {
        id: 8,
        equipo_id: 4,
        fecha_mantencion: "2026-08-30",
        nombre_tecnico: "Matías Henríquez",
        horas_trabajo: 3.0,
        tipo_mantencion: "Preventiva",
        observaciones: "Prueba general de estroboscópicas y sirenas audibles. Reemplazo preventivo reglamentario del banco de 2 baterías de respaldo de 12V 18Ah."
    },
    {
        id: 9,
        equipo_id: 5,
        fecha_mantencion: "2026-06-14",
        nombre_tecnico: "Andrés Morales",
        horas_trabajo: 2.0,
        tipo_mantencion: "Correctiva",
        observaciones: "Ajuste de temporizador de cierre en puerta de torniquetes. Corrección de falso contacto en sensor magnético reed switch de puerta #2."
    },
    {
        id: 10,
        equipo_id: 5,
        fecha_mantencion: "2026-10-15",
        nombre_tecnico: "Carlos Valenzuela",
        horas_trabajo: 3.0,
        tipo_mantencion: "Correctiva",
        observaciones: "Diagnóstico de fallo en relé de salida #3 (Puerta Emergencia Poniente). Se programa cambio de tarjeta de relés auxiliar. Estado temporal: En Mantención."
    },
    {
        id: 11,
        equipo_id: 6,
        fecha_mantencion: "2024-05-15",
        nombre_tecnico: "Gabriel Soto",
        horas_trabajo: 2.0,
        tipo_mantencion: "Preventiva",
        observaciones: "Prueba de descarga controlada en modo batería durante 15 minutos con carga de 1.8kW. Verificación de alarmas por interfaz de red SNMP."
    },
    {
        id: 12,
        equipo_id: 6,
        fecha_mantencion: "2026-10-02",
        nombre_tecnico: "Carlos Valenzuela",
        horas_trabajo: 2.5,
        tipo_mantencion: "Preventiva",
        observaciones: "Termografía infrarroja en terminales de entrada/salida AC. Medición de impedancia interna en celdas de batería de 96V DC y comprobación de conmutación limpia a bypass."
    }
];

class LocalDatabase {
    constructor() {
        this.init();
    }

    init() {
        if (!localStorage.getItem('cd_db_seeded_v2')) {
            if (!localStorage.getItem('cd_local_users')) {
                localStorage.setItem('cd_local_users', JSON.stringify([]));
            }
            if (!localStorage.getItem('cd_local_equipos')) {
                localStorage.setItem('cd_local_equipos', JSON.stringify(SEED_EQUIPOS));
            }
            if (!localStorage.getItem('cd_local_mantenciones')) {
                localStorage.setItem('cd_local_mantenciones', JSON.stringify(SEED_MANTENCIONES));
            }
            localStorage.setItem('cd_db_seeded_v2', 'true');
        }
    }

    hasUsers() {
        const users = this.getUsers();
        return Array.isArray(users) && users.length > 0;
    }

    registerFirstAdmin(data) {
        const users = this.getUsers();
        if (users.length > 0) {
            throw new Error('El sistema ya cuenta con un administrador.');
        }
        const adminUser = {
            id: 1,
            rut: RutUtils.format(data.rut),
            nombre: data.nombre.trim(),
            password: data.password.trim(),
            rol: 'admin',
            creado_en: new Date().toISOString()
        };
        users.push(adminUser);
        this.saveUsers(users);
        return {
            id: adminUser.id,
            rut: adminUser.rut,
            nombre: adminUser.nombre,
            rol: adminUser.rol
        };
    }

    getUsers() {
        return JSON.parse(localStorage.getItem('cd_local_users') || '[]');
    }

    saveUsers(users) {
        localStorage.setItem('cd_local_users', JSON.stringify(users));
    }

    getEquiposRaw() {
        return JSON.parse(localStorage.getItem('cd_local_equipos') || '[]');
    }

    saveEquipos(equipos) {
        localStorage.setItem('cd_local_equipos', JSON.stringify(equipos));
    }

    getMantencionesRaw() {
        return JSON.parse(localStorage.getItem('cd_local_mantenciones') || '[]');
    }

    saveMantenciones(mant) {
        localStorage.setItem('cd_local_mantenciones', JSON.stringify(mant));
    }

    /* Auth */
    authenticate(rut, password) {
        const cleanRut = RutUtils.format(rut);
        const users = this.getUsers();
        const user = users.find(u => {
            const uRut = RutUtils.format(u.rut);
            const rutMatch = uRut === cleanRut || u.rut.replace(/[^0-9kK]/g, '') === rut.replace(/[^0-9kK]/g, '');
            const passMatch = u.password === password;
            return rutMatch && passMatch;
        });

        if (user) {
            return {
                id: user.id,
                rut: RutUtils.format(user.rut),
                nombre: user.nombre,
                rol: user.rol
            };
        }
        return null;
    }

    /* Stats */
    getStats() {
        const equipos = this.getEquiposRaw();
        const mantenciones = this.getMantencionesRaw();
        
        let operativos = 0;
        let en_mantencion = 0;
        let criticos = 0;

        equipos.forEach(eq => {
            const st = (eq.estado || '').toLowerCase();
            if (st.includes('operativo')) operativos++;
            else if (st.includes('mantencion')) en_mantencion++;
            else if (st.includes('crítico') || st.includes('critico') || st.includes('falla')) criticos++;
            else operativos++;
        });

        return {
            total_equipos: equipos.length,
            operativos,
            en_mantencion,
            criticos,
            total_mantenciones: mantenciones.length
        };
    }

    /* Equipos */
    getEquipos(search = '') {
        const equipos = this.getEquiposRaw();
        const mantenciones = this.getMantencionesRaw();
        const query = search.trim().toLowerCase();

        return equipos
            .filter(eq => {
                if (!query) return true;
                return (
                    (eq.nombre || '').toLowerCase().includes(query) ||
                    (eq.marca || '').toLowerCase().includes(query) ||
                    (eq.modelo || '').toLowerCase().includes(query) ||
                    (eq.codigo_qr || '').toLowerCase().includes(query) ||
                    (eq.ubicacion || '').toLowerCase().includes(query) ||
                    (eq.caracteristicas || '').toLowerCase().includes(query)
                );
            })
            .map(eq => {
                // Attach latest maintenance info
                const eqMant = mantenciones
                    .filter(m => m.equipo_id === eq.id)
                    .sort((a, b) => (b.fecha_mantencion || '').localeCompare(a.fecha_mantencion || ''));

                const latest = eqMant[0] || null;

                return {
                    ...eq,
                    ultima_mantencion_fecha: latest ? latest.fecha_mantencion : null,
                    ultima_mantencion_tecnico: latest ? latest.nombre_tecnico : null,
                    ultima_mantencion_tipo: latest ? latest.tipo_mantencion : null,
                    ultima_mantencion_obs: latest ? latest.observaciones : null,
                    total_mantenciones: eqMant.length
                };
            })
            .sort((a, b) => b.id - a.id);
    }

    getEquipoById(id) {
        const eqId = parseInt(id, 10);
        const equipos = this.getEquiposRaw();
        const eq = equipos.find(e => e.id === eqId);
        if (!eq) return null;

        const mantenciones = this.getMantencionesRaw()
            .filter(m => m.equipo_id === eqId)
            .sort((a, b) => (b.fecha_mantencion || '').localeCompare(a.fecha_mantencion || ''));

        const latest = mantenciones[0] || null;

        return {
            ...eq,
            ultima_mantencion_fecha: latest ? latest.fecha_mantencion : null,
            ultima_mantencion_tecnico: latest ? latest.nombre_tecnico : null,
            ultima_mantencion_tipo: latest ? latest.tipo_mantencion : null,
            ultima_mantencion_obs: latest ? latest.observaciones : null,
            mantenciones
        };
    }

    getEquipoByCode(code) {
        const cleanCode = (code || '').trim().toUpperCase();
        const equipos = this.getEquiposRaw();
        const eq = equipos.find(e => (e.codigo_qr || '').toUpperCase() === cleanCode);
        if (!eq) return null;
        return this.getEquipoById(eq.id);
    }

    createEquipo(data) {
        const equipos = this.getEquiposRaw();
        const newId = equipos.length > 0 ? Math.max(...equipos.map(e => e.id)) + 1 : 1;
        const prefix = (data.nombre || 'EQ').substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'EQ');
        const code = `EQ-${prefix}-${String(newId).padStart(3, '0')}`;

        const newEquipo = {
            id: newId,
            codigo_qr: code,
            nombre: data.nombre.trim(),
            marca: data.marca.trim(),
            modelo: data.modelo.trim(),
            fecha_instalacion: data.fecha_instalacion.trim(),
            horas_trabajo: parseFloat(data.horas_trabajo || 0.0) || 0.0,
            caracteristicas: (data.caracteristicas || '').trim(),
            estado: data.estado || 'Operativo',
            ubicacion: (data.ubicacion || 'General').trim(),
            creado_en: new Date().toISOString()
        };

        equipos.unshift(newEquipo);
        this.saveEquipos(equipos);
        return newEquipo;
    }

    updateEquipo(id, data) {
        const eqId = parseInt(id, 10);
        const equipos = this.getEquiposRaw();
        const index = equipos.findIndex(e => e.id === eqId);
        if (index === -1) throw new Error('Equipo no encontrado');

        equipos[index] = {
            ...equipos[index],
            nombre: data.nombre.trim(),
            marca: data.marca.trim(),
            modelo: data.modelo.trim(),
            fecha_instalacion: data.fecha_instalacion.trim(),
            horas_trabajo: parseFloat(data.horas_trabajo || 0.0) || 0.0,
            caracteristicas: (data.caracteristicas || '').trim(),
            estado: data.estado || 'Operativo',
            ubicacion: (data.ubicacion || 'General').trim(),
            actualizado_en: new Date().toISOString()
        };

        this.saveEquipos(equipos);
        return this.getEquipoById(eqId);
    }

    deleteEquipo(id) {
        const eqId = parseInt(id, 10);
        const equipos = this.getEquiposRaw().filter(e => e.id !== eqId);
        const mantenciones = this.getMantencionesRaw().filter(m => m.equipo_id !== eqId);
        this.saveEquipos(equipos);
        this.saveMantenciones(mantenciones);
        return true;
    }

    addMantencion(data) {
        const eqId = parseInt(data.equipo_id, 10);
        const mantenciones = this.getMantencionesRaw();
        const newId = mantenciones.length > 0 ? Math.max(...mantenciones.map(m => m.id)) + 1 : 1;
        const horas = parseFloat(data.horas_trabajo || 0.0) || 0.0;

        const newMant = {
            id: newId,
            equipo_id: eqId,
            fecha_mantencion: data.fecha_mantencion.trim(),
            nombre_tecnico: data.nombre_tecnico.trim(),
            horas_trabajo: horas,
            tipo_mantencion: data.tipo_mantencion || 'Preventiva',
            observaciones: (data.observaciones || '').trim(),
            creado_en: new Date().toISOString()
        };

        mantenciones.push(newMant);
        this.saveMantenciones(mantenciones);

        // Update equipment state and hours
        const equipos = this.getEquiposRaw();
        const eqIndex = equipos.findIndex(e => e.id === eqId);
        if (eqIndex !== -1) {
            if (data.actualizar_estado) {
                equipos[eqIndex].estado = data.actualizar_estado;
            }
            equipos[eqIndex].horas_trabajo = (parseFloat(equipos[eqIndex].horas_trabajo) || 0.0) + horas;
            this.saveEquipos(equipos);
        }

        return this.getEquipoById(eqId);
    }

    /* Admin Users CRUD */
    createUser(data) {
        const users = this.getUsers();
        const cleanRut = RutUtils.format(data.rut);
        if (users.some(u => RutUtils.format(u.rut) === cleanRut)) {
            throw new Error('Ya existe un usuario registrado con este RUT');
        }

        const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
        const newUser = {
            id: newId,
            rut: cleanRut,
            nombre: data.nombre.trim(),
            password: data.password,
            rol: data.rol || 'tecnico',
            creado_en: new Date().toISOString()
        };

        users.push(newUser);
        this.saveUsers(users);
        return { id: newUser.id, rut: newUser.rut, nombre: newUser.nombre, rol: newUser.rol };
    }

    updateUser(id, data) {
        const uId = parseInt(id, 10);
        const users = this.getUsers();
        const index = users.findIndex(u => u.id === uId);
        if (index === -1) throw new Error('Usuario no encontrado');

        const cleanRut = RutUtils.format(data.rut);
        if (users.some(u => u.id !== uId && RutUtils.format(u.rut) === cleanRut)) {
            throw new Error('Ya existe otro usuario con este RUT');
        }

        users[index].rut = cleanRut;
        users[index].nombre = data.nombre.trim();
        users[index].rol = data.rol || users[index].rol;
        if (data.password && data.password.trim()) {
            users[index].password = data.password.trim();
        }

        this.saveUsers(users);
        return { id: users[index].id, rut: users[index].rut, nombre: users[index].nombre, rol: users[index].rol };
    }

    deleteUser(id) {
        const uId = parseInt(id, 10);
        const users = this.getUsers().filter(u => u.id !== uId);
        this.saveUsers(users);
        return true;
    }

    /* Backup & Synchronization */
    exportAll() {
        return {
            version: "1.0",
            exportDate: new Date().toISOString(),
            usuarios: this.getUsers().map(u => ({ id: u.id, rut: u.rut, nombre: u.nombre, rol: u.rol, creado_en: u.creado_en })),
            equipos: this.getEquiposRaw(),
            mantenciones: this.getMantencionesRaw()
        };
    }

    importAll(data) {
        if (data.equipos && Array.isArray(data.equipos)) {
            const currentEquipos = this.getEquiposRaw();
            data.equipos.forEach(importedEq => {
                const idx = currentEquipos.findIndex(e => e.codigo_qr === importedEq.codigo_qr);
                if (idx !== -1) {
                    currentEquipos[idx] = { ...currentEquipos[idx], ...importedEq };
                } else {
                    currentEquipos.push(importedEq);
                }
            });
            this.saveEquipos(currentEquipos);
        }

        if (data.mantenciones && Array.isArray(data.mantenciones)) {
            const currentMant = this.getMantencionesRaw();
            data.mantenciones.forEach(importedM => {
                const exists = currentMant.some(m => 
                    m.equipo_id === importedM.equipo_id && 
                    m.fecha_mantencion === importedM.fecha_mantencion &&
                    m.nombre_tecnico === importedM.nombre_tecnico
                );
                if (!exists) {
                    currentMant.push(importedM);
                }
            });
            this.saveMantenciones(currentMant);
        }

        return true;
    }
}

/**
 * Global Storage Manager
 * Coordinates Local vs Cloud modes
 */
class AppStorageManager {
    constructor() {
        this.localDb = new LocalDatabase();
        this.modeKey = 'cd_storage_mode';
        this.cloudUrlKey = 'cd_cloud_url';
    }

    getMode() {
        return localStorage.getItem(this.modeKey) || 'local';
    }

    setMode(mode) {
        localStorage.setItem(this.modeKey, mode);
    }

    getCloudUrl() {
        const saved = localStorage.getItem(this.cloudUrlKey);
        if (saved) return saved;
        if (typeof window !== 'undefined' && window.location && window.location.protocol.startsWith('http')) {
            return window.location.origin;
        }
        return 'http://localhost:8080';
    }

    setCloudUrl(url) {
        let clean = (url || '').trim().replace(/\/+$/, '');
        if (clean && !clean.startsWith('http://') && !clean.startsWith('https://')) {
            clean = 'http://' + clean;
        }
        localStorage.setItem(this.cloudUrlKey, clean);
    }

    async testCloudConnection(targetUrl) {
        const base = (targetUrl || this.getCloudUrl()).trim().replace(/\/+$/, '');
        const testEndpoint = `${base}/api/health`;
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 6000);
            const res = await fetch(testEndpoint, { signal: controller.signal });
            clearTimeout(timeoutId);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            return { success: true, message: `Conexión exitosa a la nube (${base})`, data };
        } catch (e) {
            return { success: false, message: `No se pudo conectar a ${base}: ${e.message}` };
        }
    }

    async pushLocalToCloud(targetUrl) {
        const base = (targetUrl || this.getCloudUrl()).trim().replace(/\/+$/, '');
        const payload = this.localDb.exportAll();
        const res = await fetch(`${base}/api/cloud/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`Error en el servidor de la nube (HTTP ${res.status})`);
        return await res.json();
    }

    async pullCloudToLocal(targetUrl) {
        const base = (targetUrl || this.getCloudUrl()).trim().replace(/\/+$/, '');
        const res = await fetch(`${base}/api/cloud/export`);
        if (!res.ok) throw new Error(`Error al descargar de la nube (HTTP ${res.status})`);
        const json = await res.json();
        if (json.success && json.data) {
            this.localDb.importAll(json.data);
            return { success: true, message: "Datos descargados y actualizados localmente con éxito" };
        }
        throw new Error("Respuesta inválida del servidor");
    }
}

// Global instance
window.appStorage = new AppStorageManager();
