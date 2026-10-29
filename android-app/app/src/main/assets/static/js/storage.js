/**
 * Corrientes Débiles - Local Storage Database & Cloud Synchronization Engine
 * Provee persistencia 100% offline local en el dispositivo (teléfono/APK/navegador)
 * con capacidad de conmutar y sincronizar con base de datos en la nube.
 */

// Usuario Administrador oficial precargado
const SEED_USERS = [
    {
        id: 1,
        rut: "11.111.111-1",
        nombre: "Administrador",
        password: "admin123",
        rol: "admin",
        creado_en: "2026-10-28 20:00:00"
    },
    {
        id: 2,
        rut: "16.061.974-5",
        nombre: "Cristian Aros",
        password: "1234",
        rol: "tecnico",
        creado_en: "2026-10-29 10:40:00"
    }
];

const SEED_EQUIPOS = [
    {
        "id": 1,
        "codigo_qr": "EQ-UPS-001",
        "nombre": "UPS 10kVa - Recinto B1005",
        "marca": "APC by Schneider Electric",
        "modelo": "UPS Online 10kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 10kVa | N° de Serie: 1905P0852003 | Ubicación: Piso 1, Sector C Norte, Recinto B1005 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-23",
        "estado": "Operativo",
        "ubicacion": "Piso 1 | Sector C Norte | Recinto B1005",
        "piso": "Piso 1",
        "sector": "C Norte",
        "recinto": "B1005",
        "numero_serie": "1905P0852003",
        "capacidad": "10kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-23",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 2,
        "codigo_qr": "EQ-UPS-002",
        "nombre": "UPS 10kVa - Recinto REAS",
        "marca": "APC by Schneider Electric",
        "modelo": "UPS Online 10kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 10kVa | N° de Serie: 2008P4056001 | Ubicación: Piso 1, Sector REAS, Recinto REAS | Baterías Reemplazadas: Sí | Observaciones: 2026-07-23",
        "estado": "Operativo",
        "ubicacion": "Piso 1 | Sector REAS | Recinto REAS",
        "piso": "Piso 1",
        "sector": "REAS",
        "recinto": "REAS",
        "numero_serie": "2008P4056001",
        "capacidad": "10kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-23",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 3,
        "codigo_qr": "EQ-UPS-003",
        "nombre": "UPS 10kVa - Recinto B1041",
        "marca": "APC by Schneider Electric",
        "modelo": "UPS Online 10kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 0.0,
        "caracteristicas": "Capacidad: 10kVa | N° de Serie: 1905P0852004 | Ubicación: Piso 1, Sector B Sur, Recinto B1041 | Baterías Reemplazadas: No Aplica",
        "estado": "Operativo",
        "ubicacion": "Piso 1 | Sector B Sur | Recinto B1041",
        "piso": "Piso 1",
        "sector": "B Sur",
        "recinto": "B1041",
        "numero_serie": "1905P0852004",
        "capacidad": "10kVa",
        "baterias_cambiadas": "No Aplica",
        "observaciones": "-",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 4,
        "codigo_qr": "EQ-UPS-004",
        "nombre": "UPS 6kVa - Recinto A1024",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 6kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 6kVa | N° de Serie: U32NE00007 | Ubicación: Piso 1, Sector A Norte, Recinto A1024 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-23",
        "estado": "Operativo",
        "ubicacion": "Piso 1 | Sector A Norte | Recinto A1024",
        "piso": "Piso 1",
        "sector": "A Norte",
        "recinto": "A1024",
        "numero_serie": "U32NE00007",
        "capacidad": "6kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-23",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 5,
        "codigo_qr": "EQ-UPS-005",
        "nombre": "UPS 3kVa - Recinto A1085",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 3kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 3kVa | N° de Serie: T29NC00041 | Ubicación: Piso 1, Sector A Sur, Recinto A1085 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-21",
        "estado": "Operativo",
        "ubicacion": "Piso 1 | Sector A Sur | Recinto A1085",
        "piso": "Piso 1",
        "sector": "A Sur",
        "recinto": "A1085",
        "numero_serie": "T29NC00041",
        "capacidad": "3kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-21",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 6,
        "codigo_qr": "EQ-UPS-006",
        "nombre": "UPS 5kVa - Recinto A1024",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 5kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 5kVa | N° de Serie: U16ND00071 | Ubicación: Piso 1, Sector A Norte, Recinto A1024 | Baterías Reemplazadas: No Aplica | Observaciones: EN FALLA FUERA DE SERVICIO 24/08/26",
        "estado": "Fuera de Servicio",
        "ubicacion": "Piso 1 | Sector A Norte | Recinto A1024",
        "piso": "Piso 1",
        "sector": "A Norte",
        "recinto": "A1024",
        "numero_serie": "U16ND00071",
        "capacidad": "5kVa",
        "baterias_cambiadas": "No Aplica",
        "observaciones": "EN FALLA FUERA DE SERVICIO 24/08/26",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 7,
        "codigo_qr": "EQ-UPS-007",
        "nombre": "UPS 5kVa - Recinto B1054",
        "marca": "Por Identificar",
        "modelo": "UPS Online 5kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 0.0,
        "caracteristicas": "Capacidad: 5kVa | N° de Serie: S/I | Ubicación: Piso 1, Sector C Sur, Recinto B1054 | Baterías Reemplazadas: No Aplica | Observaciones: EN FALLA FUERA DE SERVICIO",
        "estado": "Fuera de Servicio",
        "ubicacion": "Piso 1 | Sector C Sur | Recinto B1054",
        "piso": "Piso 1",
        "sector": "C Sur",
        "recinto": "B1054",
        "numero_serie": "S/I",
        "capacidad": "5kVa",
        "baterias_cambiadas": "No Aplica",
        "observaciones": "EN FALLA FUERA DE SERVICIO",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 8,
        "codigo_qr": "EQ-UPS-008",
        "nombre": "UPS 6kVa - Recinto B1006",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 6kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 6kVa | N° de Serie: U52NE00103 | Ubicación: Piso 1, Sector C Norte, Recinto B1006 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-24",
        "estado": "Operativo",
        "ubicacion": "Piso 1 | Sector C Norte | Recinto B1006",
        "piso": "Piso 1",
        "sector": "C Norte",
        "recinto": "B1006",
        "numero_serie": "U52NE00103",
        "capacidad": "6kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-24",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 9,
        "codigo_qr": "EQ-UPS-009",
        "nombre": "UPS 5kVa - Recinto A1024",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 5kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 5kVa | N° de Serie: U52NE00005 | Ubicación: Piso 1, Sector A Norte, Recinto A1024 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-24",
        "estado": "Operativo",
        "ubicacion": "Piso 1 | Sector A Norte | Recinto A1024",
        "piso": "Piso 1",
        "sector": "A Norte",
        "recinto": "A1024",
        "numero_serie": "U52NE00005",
        "capacidad": "5kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-24",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 10,
        "codigo_qr": "EQ-UPS-010",
        "nombre": "UPS 6kVa - Recinto A2027",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 6kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 6kVa | N° de Serie: U52NE00063 | Ubicación: Piso 2, Sector A Norte, Recinto A2027 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-24",
        "estado": "Operativo",
        "ubicacion": "Piso 2 | Sector A Norte | Recinto A2027",
        "piso": "Piso 2",
        "sector": "A Norte",
        "recinto": "A2027",
        "numero_serie": "U52NE00063",
        "capacidad": "6kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-24",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 11,
        "codigo_qr": "EQ-UPS-011",
        "nombre": "UPS 10kVa - Recinto B2002",
        "marca": "APC by Schneider Electric",
        "modelo": "UPS Online 10kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 10kVa | N° de Serie: 1904P0771001 | Ubicación: Piso 2, Sector C Norte, Recinto B2002 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-24",
        "estado": "Operativo",
        "ubicacion": "Piso 2 | Sector C Norte | Recinto B2002",
        "piso": "Piso 2",
        "sector": "C Norte",
        "recinto": "B2002",
        "numero_serie": "1904P0771001",
        "capacidad": "10kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-24",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 12,
        "codigo_qr": "EQ-UPS-012",
        "nombre": "UPS 10kVa - Recinto B2059",
        "marca": "APC by Schneider Electric",
        "modelo": "UPS Online 10kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 10kVa | N° de Serie: 2007P3824004 | Ubicación: Piso 2, Sector B Sur, Recinto B2059 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-24",
        "estado": "Operativo",
        "ubicacion": "Piso 2 | Sector B Sur | Recinto B2059",
        "piso": "Piso 2",
        "sector": "B Sur",
        "recinto": "B2059",
        "numero_serie": "2007P3824004",
        "capacidad": "10kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-24",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 13,
        "codigo_qr": "EQ-UPS-013",
        "nombre": "UPS 3kVa - Recinto B2132",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 3kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 3kVa | N° de Serie: T31NC00160 | Ubicación: Piso 2, Sector C Norte, Recinto B2132 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-24",
        "estado": "Operativo",
        "ubicacion": "Piso 2 | Sector C Norte | Recinto B2132",
        "piso": "Piso 2",
        "sector": "C Norte",
        "recinto": "B2132",
        "numero_serie": "T31NC00160",
        "capacidad": "3kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-24",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 14,
        "codigo_qr": "EQ-UPS-014",
        "nombre": "UPS 5kVa - Recinto A2027",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 5kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 5kVa | N° de Serie: U32ND00014 | Ubicación: Piso 2, Sector A Norte, Recinto A2027 | Baterías Reemplazadas: No Aplica | Observaciones: EN FALLA FUERA DE SERVICIO 24/07/2026",
        "estado": "Fuera de Servicio",
        "ubicacion": "Piso 2 | Sector A Norte | Recinto A2027",
        "piso": "Piso 2",
        "sector": "A Norte",
        "recinto": "A2027",
        "numero_serie": "U32ND00014",
        "capacidad": "5kVa",
        "baterias_cambiadas": "No Aplica",
        "observaciones": "EN FALLA FUERA DE SERVICIO 24/07/2026",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 15,
        "codigo_qr": "EQ-UPS-015",
        "nombre": "UPS 5kVa - Recinto B2067",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 5kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 0.0,
        "caracteristicas": "Capacidad: 5kVa | N° de Serie: U42ND00044 | Ubicación: Piso 2, Sector C Sur, Recinto B2067 | Baterías Reemplazadas: No Aplica",
        "estado": "Fuera de Servicio",
        "ubicacion": "Piso 2 | Sector C Sur | Recinto B2067",
        "piso": "Piso 2",
        "sector": "C Sur",
        "recinto": "B2067",
        "numero_serie": "U42ND00044",
        "capacidad": "5kVa",
        "baterias_cambiadas": "No Aplica",
        "observaciones": "-",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 16,
        "codigo_qr": "EQ-UPS-016",
        "nombre": "UPS 6kVa - Recinto A2094",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 6kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 6kVa | N° de Serie: U52NE00012 | Ubicación: Piso 2, Sector A Sur, Recinto A2094 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-22",
        "estado": "Operativo",
        "ubicacion": "Piso 2 | Sector A Sur | Recinto A2094",
        "piso": "Piso 2",
        "sector": "A Sur",
        "recinto": "A2094",
        "numero_serie": "U52NE00012",
        "capacidad": "6kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-22",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 17,
        "codigo_qr": "EQ-UPS-017",
        "nombre": "UPS 10kVa - Recinto A3086",
        "marca": "APC by Schneider Electric",
        "modelo": "UPS Online 10kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 10kVa | N° de Serie: 2007P3814011 | Ubicación: Piso 3, Sector A Sur, Recinto A3086 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-22",
        "estado": "Operativo",
        "ubicacion": "Piso 3 | Sector A Sur | Recinto A3086",
        "piso": "Piso 3",
        "sector": "A Sur",
        "recinto": "A3086",
        "numero_serie": "2007P3814011",
        "capacidad": "10kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-22",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 18,
        "codigo_qr": "EQ-UPS-018",
        "nombre": "UPS 15kVa - Recinto B3005",
        "marca": "APC by Schneider Electric",
        "modelo": "UPS Online 15kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 15kVa | N° de Serie: 1904P0779001 | Ubicación: Piso 3, Sector C Norte, Recinto B3005 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-27",
        "estado": "Operativo",
        "ubicacion": "Piso 3 | Sector C Norte | Recinto B3005",
        "piso": "Piso 3",
        "sector": "C Norte",
        "recinto": "B3005",
        "numero_serie": "1904P0779001",
        "capacidad": "15kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-27",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 19,
        "codigo_qr": "EQ-UPS-019",
        "nombre": "UPS 3kVa - Recinto A3082",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 3kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 3kVa | N° de Serie: T29NC00053 | Ubicación: Piso 3, Sector A Sur, Recinto A3082 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-22",
        "estado": "Operativo",
        "ubicacion": "Piso 3 | Sector A Sur | Recinto A3082",
        "piso": "Piso 3",
        "sector": "A Sur",
        "recinto": "A3082",
        "numero_serie": "T29NC00053",
        "capacidad": "3kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-22",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 20,
        "codigo_qr": "EQ-UPS-020",
        "nombre": "UPS 3kVa - Recinto A3006",
        "marca": "EnerSafe",
        "modelo": "UPS Online 3kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 0.0,
        "caracteristicas": "Capacidad: 3kVa | N° de Serie: 310035756D2272290197 | Ubicación: Piso 3, Sector B Sur, Recinto A3006 | Baterías Reemplazadas: No | Observaciones: UPS de 3kVa. Marca EnerSafe. Funcionamiento OK.",
        "estado": "Operativo",
        "ubicacion": "Piso 3 | Sector B Sur | Recinto A3006",
        "piso": "Piso 3",
        "sector": "B Sur",
        "recinto": "A3006",
        "numero_serie": "310035756D2272290197",
        "capacidad": "3kVa",
        "baterias_cambiadas": "No",
        "observaciones": "UPS de 3kVa. Marca EnerSafe. Funcionamiento OK.",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 21,
        "codigo_qr": "EQ-UPS-021",
        "nombre": "UPS 5kVa - Recinto B3044",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 5kVa Doble Conversión",
        "fecha_instalacion": "2026-01-15",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 5kVa | N° de Serie: W21ND00027 | Ubicación: Piso 3, Sector C Sur, Recinto B3044 | Baterías Reemplazadas: Sí | Observaciones: Operativa desde 27 de Agosto 2026. Inventario Fijo: 21496",
        "estado": "Operativo",
        "ubicacion": "Piso 3 | Sector C Sur | Recinto B3044",
        "piso": "Piso 3",
        "sector": "C Sur",
        "recinto": "B3044",
        "numero_serie": "W21ND00027",
        "capacidad": "5kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "Operativa desde 27 de Agosto 2026. Inventario Fijo: 21496",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 22,
        "codigo_qr": "EQ-UPS-022",
        "nombre": "UPS 5kVa - Recinto A3030",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 5kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 0.0,
        "caracteristicas": "Capacidad: 5kVa | N° de Serie: U32ND00003 | Ubicación: Piso 3, Sector A Norte, Recinto A3030 | Baterías Reemplazadas: No Aplica | Observaciones: EN FALLA FUERA DE SERVICIO",
        "estado": "Fuera de Servicio",
        "ubicacion": "Piso 3 | Sector A Norte | Recinto A3030",
        "piso": "Piso 3",
        "sector": "A Norte",
        "recinto": "A3030",
        "numero_serie": "U32ND00003",
        "capacidad": "5kVa",
        "baterias_cambiadas": "No Aplica",
        "observaciones": "EN FALLA FUERA DE SERVICIO",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 23,
        "codigo_qr": "EQ-UPS-023",
        "nombre": "UPS 80kVa - Recinto Data Center",
        "marca": "Huawei Digital Power",
        "modelo": "UPS Online 80kVa Doble Conversión",
        "fecha_instalacion": "2025-01-15",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 80kVa | N° de Serie: H3QX18014 | Ubicación: Piso 3, Sector Data Center, Recinto Data Center | Baterías Reemplazadas: Sí | Observaciones: 2025",
        "estado": "Operativo",
        "ubicacion": "Piso 3 | Sector Data Center | Recinto Data Center",
        "piso": "Piso 3",
        "sector": "Data Center",
        "recinto": "Data Center",
        "numero_serie": "H3QX18014",
        "capacidad": "80kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2025",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 24,
        "codigo_qr": "EQ-UPS-024",
        "nombre": "UPS 80kVa - Recinto Data Center",
        "marca": "Huawei Digital Power",
        "modelo": "UPS Online 80kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 0.0,
        "caracteristicas": "Capacidad: 80kVa | N° de Serie: H3QX18013 | Ubicación: Piso 3, Sector Data Center, Recinto Data Center | Baterías Reemplazadas: No Aplica | Observaciones: EN FALLA FUERA DE SERVICIO",
        "estado": "Fuera de Servicio",
        "ubicacion": "Piso 3 | Sector Data Center | Recinto Data Center",
        "piso": "Piso 3",
        "sector": "Data Center",
        "recinto": "Data Center",
        "numero_serie": "H3QX18013",
        "capacidad": "80kVa",
        "baterias_cambiadas": "No Aplica",
        "observaciones": "EN FALLA FUERA DE SERVICIO",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 25,
        "codigo_qr": "EQ-UPS-025",
        "nombre": "UPS 5kVa - Recinto Cu",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 5kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 5kVa | N° de Serie: U32ND00012 | Ubicación: Cubierta (Cu), Sector Cu, Recinto Cu | Baterías Reemplazadas: Sí | Observaciones: 2026-07-27",
        "estado": "Operativo",
        "ubicacion": "Cubierta (Cu) | Sector Cu | Recinto Cu",
        "piso": "Cubierta (Cu)",
        "sector": "Cu",
        "recinto": "Cu",
        "numero_serie": "U32ND00012",
        "capacidad": "5kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-27",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 26,
        "codigo_qr": "EQ-UPS-026",
        "nombre": "UPS 10kVa - Recinto BS1049",
        "marca": "APC by Schneider Electric",
        "modelo": "UPS Online 10kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 10kVa | N° de Serie: 2009P3824004 | Ubicación: Subterráneo -1 (S1), Sector B Sur, Recinto BS1049 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-21",
        "estado": "Operativo",
        "ubicacion": "Subterráneo -1 (S1) | Sector B Sur | Recinto BS1049",
        "piso": "Subterráneo -1 (S1)",
        "sector": "B Sur",
        "recinto": "BS1049",
        "numero_serie": "2009P3824004",
        "capacidad": "10kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-21",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 27,
        "codigo_qr": "EQ-UPS-027",
        "nombre": "UPS 10kVa - Recinto BS1066",
        "marca": "APC by Schneider Electric",
        "modelo": "UPS Online 10kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 10kVa | N° de Serie: 2008P4056002 | Ubicación: Subterráneo -1 (S1), Sector B Norte, Recinto BS1066 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-21",
        "estado": "Operativo",
        "ubicacion": "Subterráneo -1 (S1) | Sector B Norte | Recinto BS1066",
        "piso": "Subterráneo -1 (S1)",
        "sector": "B Norte",
        "recinto": "BS1066",
        "numero_serie": "2008P4056002",
        "capacidad": "10kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-21",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 28,
        "codigo_qr": "EQ-UPS-028",
        "nombre": "UPS 3kVa - Recinto AS1097",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 3kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 3kVa | N° de Serie: T31NC00164 | Ubicación: Subterráneo -1 (S1), Sector A Sur, Recinto AS1097 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-21",
        "estado": "Operativo",
        "ubicacion": "Subterráneo -1 (S1) | Sector A Sur | Recinto AS1097",
        "piso": "Subterráneo -1 (S1)",
        "sector": "A Sur",
        "recinto": "AS1097",
        "numero_serie": "T31NC00164",
        "capacidad": "3kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-21",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 29,
        "codigo_qr": "EQ-UPS-029",
        "nombre": "UPS 3kVa - Recinto BS1067",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 3kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 3kVa | N° de Serie: T29NC00039 | Ubicación: Subterráneo -1 (S1), Sector B, Recinto BS1067 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-21",
        "estado": "Operativo",
        "ubicacion": "Subterráneo -1 (S1) | Sector B | Recinto BS1067",
        "piso": "Subterráneo -1 (S1)",
        "sector": "B",
        "recinto": "BS1067",
        "numero_serie": "T29NC00039",
        "capacidad": "3kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-21",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 30,
        "codigo_qr": "EQ-UPS-030",
        "nombre": "UPS 3kVa - Recinto AS1052",
        "marca": "EnerSafe",
        "modelo": "UPS Online 3kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 0.0,
        "caracteristicas": "Capacidad: 3kVa | N° de Serie: 310035756D2272290183 | Ubicación: Subterráneo -1 (S1), Sector B Sur, Recinto AS1052 | Baterías Reemplazadas: No | Observaciones: UPS de 3kVa. Marca EnerSafe. Funcionamiento OK.",
        "estado": "Operativo",
        "ubicacion": "Subterráneo -1 (S1) | Sector B Sur | Recinto AS1052",
        "piso": "Subterráneo -1 (S1)",
        "sector": "B Sur",
        "recinto": "AS1052",
        "numero_serie": "310035756D2272290183",
        "capacidad": "3kVa",
        "baterias_cambiadas": "No",
        "observaciones": "UPS de 3kVa. Marca EnerSafe. Funcionamiento OK.",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 31,
        "codigo_qr": "EQ-UPS-031",
        "nombre": "UPS 5kVa - Recinto A1030",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 5kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 5kVa | N° de Serie: U32ND00010 | Ubicación: Subterráneo -1 (S1), Sector A Norte, Recinto A1030 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-21",
        "estado": "Operativo",
        "ubicacion": "Subterráneo -1 (S1) | Sector A Norte | Recinto A1030",
        "piso": "Subterráneo -1 (S1)",
        "sector": "A Norte",
        "recinto": "A1030",
        "numero_serie": "U32ND00010",
        "capacidad": "5kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-21",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 32,
        "codigo_qr": "EQ-UPS-032",
        "nombre": "UPS 10kVa - Recinto AS2008",
        "marca": "APC by Schneider Electric",
        "modelo": "UPS Online 10kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 10kVa | N° de Serie: 2009P3824005 | Ubicación: Subterráneo -2 (S2), Sector A Sur, Recinto AS2008 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-20",
        "estado": "Operativo",
        "ubicacion": "Subterráneo -2 (S2) | Sector A Sur | Recinto AS2008",
        "piso": "Subterráneo -2 (S2)",
        "sector": "A Sur",
        "recinto": "AS2008",
        "numero_serie": "2009P3824005",
        "capacidad": "10kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-20",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 33,
        "codigo_qr": "EQ-UPS-033",
        "nombre": "UPS 3kVa - Recinto BS2013",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 3kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 3kVa | N° de Serie: T29NC00043 | Ubicación: Subterráneo -2 (S2), Sector B, Recinto BS2013 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-20",
        "estado": "Operativo",
        "ubicacion": "Subterráneo -2 (S2) | Sector B | Recinto BS2013",
        "piso": "Subterráneo -2 (S2)",
        "sector": "B",
        "recinto": "BS2013",
        "numero_serie": "T29NC00043",
        "capacidad": "3kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-20",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 34,
        "codigo_qr": "EQ-UPS-034",
        "nombre": "UPS 3kVa - Recinto AS2008",
        "marca": "Kaise",
        "modelo": "UPS Online 3kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 0.0,
        "caracteristicas": "Capacidad: 3kVa | N° de Serie: 900062209150018 | Ubicación: Subterráneo -2 (S2), Sector A Sur, Recinto AS2008 | Baterías Reemplazadas: No | Observaciones: UPS de 3kVa. Marca Kaise. Funcionamiento OK.",
        "estado": "Operativo",
        "ubicacion": "Subterráneo -2 (S2) | Sector A Sur | Recinto AS2008",
        "piso": "Subterráneo -2 (S2)",
        "sector": "A Sur",
        "recinto": "AS2008",
        "numero_serie": "900062209150018",
        "capacidad": "3kVa",
        "baterias_cambiadas": "No",
        "observaciones": "UPS de 3kVa. Marca Kaise. Funcionamiento OK.",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 35,
        "codigo_qr": "EQ-UPS-035",
        "nombre": "UPS 5kVa - Recinto BS2016",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 5kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 5kVa | N° de Serie: U32ND00009 | Ubicación: Subterráneo -2 (S2), Sector C Sur, Recinto BS2016 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-20",
        "estado": "Operativo",
        "ubicacion": "Subterráneo -2 (S2) | Sector C Sur | Recinto BS2016",
        "piso": "Subterráneo -2 (S2)",
        "sector": "C Sur",
        "recinto": "BS2016",
        "numero_serie": "U32ND00009",
        "capacidad": "5kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-20",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 36,
        "codigo_qr": "EQ-UPS-036",
        "nombre": "UPS 5kVa - Recinto AS2003",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 5kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 5kVa | N° de Serie: W21ND00007 | Ubicación: Subterráneo -2 (S2), Sector A Norte, Recinto AS2003 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-20",
        "estado": "Operativo",
        "ubicacion": "Subterráneo -2 (S2) | Sector A Norte | Recinto AS2003",
        "piso": "Subterráneo -2 (S2)",
        "sector": "A Norte",
        "recinto": "AS2003",
        "numero_serie": "W21ND00007",
        "capacidad": "5kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-20",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 37,
        "codigo_qr": "EQ-UPS-037",
        "nombre": "Punto UPS - Recinto AS3002",
        "marca": "Por Identificar",
        "modelo": "Módulo UPS",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 0.0,
        "caracteristicas": "Capacidad: S/I | N° de Serie: S/I (No instalada) | Ubicación: Subterráneo -3 (S3), Sector B Sur, Recinto AS3002 | Baterías Reemplazadas: No Aplica | Observaciones: SIN EXISTENCIA UPS",
        "estado": "Fuera de Servicio",
        "ubicacion": "Subterráneo -3 (S3) | Sector B Sur | Recinto AS3002",
        "piso": "Subterráneo -3 (S3)",
        "sector": "B Sur",
        "recinto": "AS3002",
        "numero_serie": "S/I (No instalada)",
        "capacidad": "S/I",
        "baterias_cambiadas": "No Aplica",
        "observaciones": "SIN EXISTENCIA UPS",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 38,
        "codigo_qr": "EQ-UPS-038",
        "nombre": "Punto UPS - Recinto BS3004",
        "marca": "Por Identificar",
        "modelo": "Módulo UPS",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 0.0,
        "caracteristicas": "Capacidad: S/I | N° de Serie: S/I (No instalada) | Ubicación: Subterráneo -3 (S3), Sector A Norte, Recinto BS3004 | Baterías Reemplazadas: No Aplica | Observaciones: SIN EXISTENCIA UPS",
        "estado": "Fuera de Servicio",
        "ubicacion": "Subterráneo -3 (S3) | Sector A Norte | Recinto BS3004",
        "piso": "Subterráneo -3 (S3)",
        "sector": "A Norte",
        "recinto": "BS3004",
        "numero_serie": "S/I (No instalada)",
        "capacidad": "S/I",
        "baterias_cambiadas": "No Aplica",
        "observaciones": "SIN EXISTENCIA UPS",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 39,
        "codigo_qr": "EQ-UPS-039",
        "nombre": "UPS 15kVa - Recinto AZ118",
        "marca": "APC by Schneider Electric",
        "modelo": "UPS Online 15kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 15kVa | N° de Serie: 1904P0779002 | Ubicación: Zócalo (Z), Sector A Sur, Recinto AZ118 | Baterías Reemplazadas: Sí | Observaciones: 2026-10-13",
        "estado": "Operativo",
        "ubicacion": "Zócalo (Z) | Sector A Sur | Recinto AZ118",
        "piso": "Zócalo (Z)",
        "sector": "A Sur",
        "recinto": "AZ118",
        "numero_serie": "1904P0779002",
        "capacidad": "15kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-10-13",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 40,
        "codigo_qr": "EQ-UPS-040",
        "nombre": "UPS 20kVa - Recinto BZ003",
        "marca": "APC by Schneider Electric",
        "modelo": "UPS Online 20kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 0.0,
        "caracteristicas": "Capacidad: 20kVa | N° de Serie: 2008P3855007 | Ubicación: Zócalo (Z), Sector B, Recinto BZ003 | Baterías Reemplazadas: No Aplica | Observaciones: EN FALLA FUERA DE SERVICIO",
        "estado": "Fuera de Servicio",
        "ubicacion": "Zócalo (Z) | Sector B | Recinto BZ003",
        "piso": "Zócalo (Z)",
        "sector": "B",
        "recinto": "BZ003",
        "numero_serie": "2008P3855007",
        "capacidad": "20kVa",
        "baterias_cambiadas": "No Aplica",
        "observaciones": "EN FALLA FUERA DE SERVICIO",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 41,
        "codigo_qr": "EQ-UPS-041",
        "nombre": "UPS 3kVa - Recinto AZ120",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 3kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 0.0,
        "caracteristicas": "Capacidad: 3kVa | N° de Serie: T29NC00042 | Ubicación: Zócalo (Z), Sector A Sur, Recinto AZ120 | Baterías Reemplazadas: No Aplica | Observaciones: EN FALLA FUERA DE SERVICIO",
        "estado": "Fuera de Servicio",
        "ubicacion": "Zócalo (Z) | Sector A Sur | Recinto AZ120",
        "piso": "Zócalo (Z)",
        "sector": "A Sur",
        "recinto": "AZ120",
        "numero_serie": "T29NC00042",
        "capacidad": "3kVa",
        "baterias_cambiadas": "No Aplica",
        "observaciones": "EN FALLA FUERA DE SERVICIO",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 42,
        "codigo_qr": "EQ-UPS-042",
        "nombre": "UPS 5kVa - Recinto BZ089",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 5kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 0.0,
        "caracteristicas": "Capacidad: 5kVa | N° de Serie: U32ND00004 | Ubicación: Zócalo (Z), Sector C Sur, Recinto BZ089 | Baterías Reemplazadas: No Aplica | Observaciones: EN FALLA FUERA DE SERVICIO",
        "estado": "Fuera de Servicio",
        "ubicacion": "Zócalo (Z) | Sector C Sur | Recinto BZ089",
        "piso": "Zócalo (Z)",
        "sector": "C Sur",
        "recinto": "BZ089",
        "numero_serie": "U32ND00004",
        "capacidad": "5kVa",
        "baterias_cambiadas": "No Aplica",
        "observaciones": "EN FALLA FUERA DE SERVICIO",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 43,
        "codigo_qr": "EQ-UPS-043",
        "nombre": "UPS 5kVa - Recinto P3Q4",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 5kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 5kVa | N° de Serie: U32ND00005 | Ubicación: Zócalo (Z), Sector B Sur, Recinto P3Q4 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-27",
        "estado": "Operativo",
        "ubicacion": "Zócalo (Z) | Sector B Sur | Recinto P3Q4",
        "piso": "Zócalo (Z)",
        "sector": "B Sur",
        "recinto": "P3Q4",
        "numero_serie": "U32ND00005",
        "capacidad": "5kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-27",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 44,
        "codigo_qr": "EQ-UPS-044",
        "nombre": "UPS 5kVa - Recinto P0Q1",
        "marca": "Por Identificar",
        "modelo": "UPS Online 5kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 5kVa | N° de Serie: S/I | Ubicación: Zócalo (Z), Sector B Sur, Recinto P0Q1 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-27",
        "estado": "Operativo",
        "ubicacion": "Zócalo (Z) | Sector B Sur | Recinto P0Q1",
        "piso": "Zócalo (Z)",
        "sector": "B Sur",
        "recinto": "P0Q1",
        "numero_serie": "S/I",
        "capacidad": "5kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-27",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 45,
        "codigo_qr": "EQ-UPS-045",
        "nombre": "UPS 5kVa - Recinto P5Q6",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 5kVa Doble Conversión",
        "fecha_instalacion": "2026-01-15",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 5kVa | N° de Serie: W21ND00012 | Ubicación: Zócalo (Z), Sector B Sur, Recinto P5Q6 | Baterías Reemplazadas: Sí | Observaciones: Operativa desde 27 de agosto 2026. Inventario fijo: 21497",
        "estado": "Operativo",
        "ubicacion": "Zócalo (Z) | Sector B Sur | Recinto P5Q6",
        "piso": "Zócalo (Z)",
        "sector": "B Sur",
        "recinto": "P5Q6",
        "numero_serie": "W21ND00012",
        "capacidad": "5kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "Operativa desde 27 de agosto 2026. Inventario fijo: 21497",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 46,
        "codigo_qr": "EQ-UPS-046",
        "nombre": "UPS 5kVa - Recinto P4Q5",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 5kVa Doble Conversión",
        "fecha_instalacion": "2025-01-15",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 5kVa | N° de Serie: U32ND00006 | Ubicación: Zócalo (Z), Sector B Sur, Recinto P4Q5 | Baterías Reemplazadas: Sí | Observaciones: 2025",
        "estado": "Operativo",
        "ubicacion": "Zócalo (Z) | Sector B Sur | Recinto P4Q5",
        "piso": "Zócalo (Z)",
        "sector": "B Sur",
        "recinto": "P4Q5",
        "numero_serie": "U32ND00006",
        "capacidad": "5kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2025",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 47,
        "codigo_qr": "EQ-UPS-047",
        "nombre": "UPS 5kVa - Recinto P2Q3",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 5kVa Doble Conversión",
        "fecha_instalacion": "2025-01-15",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 5kVa | N° de Serie: U16ND00068 | Ubicación: Zócalo (Z), Sector B Sur, Recinto P2Q3 | Baterías Reemplazadas: Sí | Observaciones: 2025",
        "estado": "Operativo",
        "ubicacion": "Zócalo (Z) | Sector B Sur | Recinto P2Q3",
        "piso": "Zócalo (Z)",
        "sector": "B Sur",
        "recinto": "P2Q3",
        "numero_serie": "U16ND00068",
        "capacidad": "5kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2025",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 48,
        "codigo_qr": "EQ-UPS-048",
        "nombre": "UPS 5kVa - Recinto BZ089",
        "marca": "Por Identificar",
        "modelo": "UPS Online 5kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 0.0,
        "caracteristicas": "Capacidad: 5kVa | N° de Serie: S/I | Ubicación: Zócalo (Z), Sector C Sur, Recinto BZ089 | Baterías Reemplazadas: No Aplica | Observaciones: EN FALLA FUERA DE SERVICIO",
        "estado": "Fuera de Servicio",
        "ubicacion": "Zócalo (Z) | Sector C Sur | Recinto BZ089",
        "piso": "Zócalo (Z)",
        "sector": "C Sur",
        "recinto": "BZ089",
        "numero_serie": "S/I",
        "capacidad": "5kVa",
        "baterias_cambiadas": "No Aplica",
        "observaciones": "EN FALLA FUERA DE SERVICIO",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 49,
        "codigo_qr": "EQ-UPS-049",
        "nombre": "UPS 5kVa - Recinto AZ022",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 5kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 5kVa | N° de Serie: W21ND00030 | Ubicación: Zócalo (Z), Sector B Norte, Recinto AZ022 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-21",
        "estado": "Operativo",
        "ubicacion": "Zócalo (Z) | Sector B Norte | Recinto AZ022",
        "piso": "Zócalo (Z)",
        "sector": "B Norte",
        "recinto": "AZ022",
        "numero_serie": "W21ND00030",
        "capacidad": "5kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-21",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 50,
        "codigo_qr": "EQ-UPS-050",
        "nombre": "UPS 6kVa - Recinto BZ039",
        "marca": "Kaise",
        "modelo": "UPS Online 6kVa Doble Conversión",
        "fecha_instalacion": "2026-01-15",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 6kVa | N° de Serie: 900062507090014 | Ubicación: Zócalo (Z), Sector B, Recinto BZ039 | Baterías Reemplazadas: Sí | Observaciones: Operativa desde 19 de Agosto 2026. Sin inventario Fijo. UPS de 6 KVA marca Kaise",
        "estado": "Operativo",
        "ubicacion": "Zócalo (Z) | Sector B | Recinto BZ039",
        "piso": "Zócalo (Z)",
        "sector": "B",
        "recinto": "BZ039",
        "numero_serie": "900062507090014",
        "capacidad": "6kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "Operativa desde 19 de Agosto 2026. Sin inventario Fijo. UPS de 6 KVA marca Kaise",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 51,
        "codigo_qr": "EQ-UPS-051",
        "nombre": "UPS 6kVa - Recinto P1Q2",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 6kVa Doble Conversión",
        "fecha_instalacion": "2025-01-15",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 6kVa | N° de Serie: U52NE00009 | Ubicación: Zócalo (Z), Sector B Sur, Recinto P1Q2 | Baterías Reemplazadas: Sí | Observaciones: 2025",
        "estado": "Operativo",
        "ubicacion": "Zócalo (Z) | Sector B Sur | Recinto P1Q2",
        "piso": "Zócalo (Z)",
        "sector": "B Sur",
        "recinto": "P1Q2",
        "numero_serie": "U52NE00009",
        "capacidad": "6kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2025",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 52,
        "codigo_qr": "EQ-UPS-052",
        "nombre": "UPS 6kVa - Recinto AZ022",
        "marca": "Delta Electronics",
        "modelo": "UPS Online 6kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 6kVa | N° de Serie: U52NE00010 | Ubicación: Zócalo (Z), Sector B Norte, Recinto AZ022 | Baterías Reemplazadas: Sí | Observaciones: 2026-07-21",
        "estado": "Operativo",
        "ubicacion": "Zócalo (Z) | Sector B Norte | Recinto AZ022",
        "piso": "Zócalo (Z)",
        "sector": "B Norte",
        "recinto": "AZ022",
        "numero_serie": "U52NE00010",
        "capacidad": "6kVa",
        "baterias_cambiadas": "Sí",
        "observaciones": "2026-07-21",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 53,
        "codigo_qr": "EQ-UPS-053",
        "nombre": "UPS 3kVa - Recinto B3004",
        "marca": "Por Identificar",
        "modelo": "UPS Online 3kVa Doble Conversión",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: 3kVa | N° de Serie: S/I | Ubicación: Piso 3, Sector C Norte, Recinto B3004 | Baterías Reemplazadas: No Aplica | Observaciones: Registrado en Conteo UPS Oficial 2026. Recinto B3004.",
        "estado": "Operativo",
        "ubicacion": "Piso 3 | Sector C Norte | Recinto B3004",
        "piso": "Piso 3",
        "sector": "C Norte",
        "recinto": "B3004",
        "numero_serie": "S/I",
        "capacidad": "3kVa",
        "baterias_cambiadas": "No Aplica",
        "observaciones": "Registrado en Conteo UPS Oficial 2026. Recinto B3004.",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    },
    {
        "id": 54,
        "codigo_qr": "EQ-UPS-054",
        "nombre": "Punto UPS - Recinto AS3016",
        "marca": "Por Identificar",
        "modelo": "Módulo UPS",
        "fecha_instalacion": "2023-08-20",
        "horas_trabajo": 2.0,
        "caracteristicas": "Capacidad: S/I | N° de Serie: S/I (No instalada) | Ubicación: Subterráneo -3 (S3), Sector F.D.S, Recinto AS3016 | Baterías Reemplazadas: No Aplica | Observaciones: Registrado en Conteo UPS Oficial 2026. Sin existencia / No instalada.",
        "estado": "Fuera de Servicio",
        "ubicacion": "Subterráneo -3 (S3) | Sector F.D.S | Recinto AS3016",
        "piso": "Subterráneo -3 (S3)",
        "sector": "F.D.S",
        "recinto": "AS3016",
        "numero_serie": "S/I (No instalada)",
        "capacidad": "S/I",
        "baterias_cambiadas": "No Aplica",
        "observaciones": "Registrado en Conteo UPS Oficial 2026. Sin existencia / No instalada.",
        "creado_en": "2026-07-20 09:00:00",
        "actualizado_en": "2026-10-28 20:30:00"
    }
];

const SEED_MANTENCIONES = [
    {
        "id": 1,
        "equipo_id": 1,
        "fecha_mantencion": "2026-07-23",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-23",
        "creado_en": "2026-07-23 10:00:00"
    },
    {
        "id": 2,
        "equipo_id": 2,
        "fecha_mantencion": "2026-07-23",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-23",
        "creado_en": "2026-07-23 10:00:00"
    },
    {
        "id": 3,
        "equipo_id": 4,
        "fecha_mantencion": "2026-07-23",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-23",
        "creado_en": "2026-07-23 10:00:00"
    },
    {
        "id": 4,
        "equipo_id": 5,
        "fecha_mantencion": "2026-07-21",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-21",
        "creado_en": "2026-07-21 10:00:00"
    },
    {
        "id": 5,
        "equipo_id": 6,
        "fecha_mantencion": "2026-08-24",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Correctiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Revisadas. Detalle: EN FALLA FUERA DE SERVICIO 24/08/26",
        "creado_en": "2026-08-24 10:00:00"
    },
    {
        "id": 6,
        "equipo_id": 8,
        "fecha_mantencion": "2026-07-24",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-24",
        "creado_en": "2026-07-24 10:00:00"
    },
    {
        "id": 7,
        "equipo_id": 9,
        "fecha_mantencion": "2026-07-24",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-24",
        "creado_en": "2026-07-24 10:00:00"
    },
    {
        "id": 8,
        "equipo_id": 10,
        "fecha_mantencion": "2026-07-24",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-24",
        "creado_en": "2026-07-24 10:00:00"
    },
    {
        "id": 9,
        "equipo_id": 11,
        "fecha_mantencion": "2026-07-24",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-24",
        "creado_en": "2026-07-24 10:00:00"
    },
    {
        "id": 10,
        "equipo_id": 12,
        "fecha_mantencion": "2026-07-24",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-24",
        "creado_en": "2026-07-24 10:00:00"
    },
    {
        "id": 11,
        "equipo_id": 13,
        "fecha_mantencion": "2026-07-24",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-24",
        "creado_en": "2026-07-24 10:00:00"
    },
    {
        "id": 12,
        "equipo_id": 14,
        "fecha_mantencion": "2026-07-24",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Correctiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Revisadas. Detalle: EN FALLA FUERA DE SERVICIO 24/07/2026",
        "creado_en": "2026-07-24 10:00:00"
    },
    {
        "id": 13,
        "equipo_id": 16,
        "fecha_mantencion": "2026-07-22",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-22",
        "creado_en": "2026-07-22 10:00:00"
    },
    {
        "id": 14,
        "equipo_id": 17,
        "fecha_mantencion": "2026-07-22",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-22",
        "creado_en": "2026-07-22 10:00:00"
    },
    {
        "id": 15,
        "equipo_id": 18,
        "fecha_mantencion": "2026-07-27",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-27",
        "creado_en": "2026-07-27 10:00:00"
    },
    {
        "id": 16,
        "equipo_id": 19,
        "fecha_mantencion": "2026-07-22",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-22",
        "creado_en": "2026-07-22 10:00:00"
    },
    {
        "id": 17,
        "equipo_id": 21,
        "fecha_mantencion": "2026-01-15",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: Operativa desde 27 de Agosto 2026. Inventario Fijo: 21496",
        "creado_en": "2026-01-15 10:00:00"
    },
    {
        "id": 18,
        "equipo_id": 23,
        "fecha_mantencion": "2025-01-15",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2025",
        "creado_en": "2025-01-15 10:00:00"
    },
    {
        "id": 19,
        "equipo_id": 25,
        "fecha_mantencion": "2026-07-27",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-27",
        "creado_en": "2026-07-27 10:00:00"
    },
    {
        "id": 20,
        "equipo_id": 26,
        "fecha_mantencion": "2026-07-21",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-21",
        "creado_en": "2026-07-21 10:00:00"
    },
    {
        "id": 21,
        "equipo_id": 27,
        "fecha_mantencion": "2026-07-21",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-21",
        "creado_en": "2026-07-21 10:00:00"
    },
    {
        "id": 22,
        "equipo_id": 28,
        "fecha_mantencion": "2026-07-21",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-21",
        "creado_en": "2026-07-21 10:00:00"
    },
    {
        "id": 23,
        "equipo_id": 29,
        "fecha_mantencion": "2026-07-21",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-21",
        "creado_en": "2026-07-21 10:00:00"
    },
    {
        "id": 24,
        "equipo_id": 31,
        "fecha_mantencion": "2026-07-21",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-21",
        "creado_en": "2026-07-21 10:00:00"
    },
    {
        "id": 25,
        "equipo_id": 32,
        "fecha_mantencion": "2026-07-20",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-20",
        "creado_en": "2026-07-20 10:00:00"
    },
    {
        "id": 26,
        "equipo_id": 33,
        "fecha_mantencion": "2026-07-20",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-20",
        "creado_en": "2026-07-20 10:00:00"
    },
    {
        "id": 27,
        "equipo_id": 35,
        "fecha_mantencion": "2026-07-20",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-20",
        "creado_en": "2026-07-20 10:00:00"
    },
    {
        "id": 28,
        "equipo_id": 36,
        "fecha_mantencion": "2026-07-20",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-20",
        "creado_en": "2026-07-20 10:00:00"
    },
    {
        "id": 29,
        "equipo_id": 39,
        "fecha_mantencion": "2026-10-13",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-10-13",
        "creado_en": "2026-10-13 10:00:00"
    },
    {
        "id": 30,
        "equipo_id": 43,
        "fecha_mantencion": "2026-07-27",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-27",
        "creado_en": "2026-07-27 10:00:00"
    },
    {
        "id": 31,
        "equipo_id": 44,
        "fecha_mantencion": "2026-07-27",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-27",
        "creado_en": "2026-07-27 10:00:00"
    },
    {
        "id": 32,
        "equipo_id": 45,
        "fecha_mantencion": "2026-01-15",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: Operativa desde 27 de agosto 2026. Inventario fijo: 21497",
        "creado_en": "2026-01-15 10:00:00"
    },
    {
        "id": 33,
        "equipo_id": 46,
        "fecha_mantencion": "2025-01-15",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2025",
        "creado_en": "2025-01-15 10:00:00"
    },
    {
        "id": 34,
        "equipo_id": 47,
        "fecha_mantencion": "2025-01-15",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2025",
        "creado_en": "2025-01-15 10:00:00"
    },
    {
        "id": 35,
        "equipo_id": 49,
        "fecha_mantencion": "2026-07-21",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-21",
        "creado_en": "2026-07-21 10:00:00"
    },
    {
        "id": 36,
        "equipo_id": 50,
        "fecha_mantencion": "2026-01-15",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: Operativa desde 19 de Agosto 2026. Sin inventario Fijo. UPS de 6 KVA marca Kaise",
        "creado_en": "2026-01-15 10:00:00"
    },
    {
        "id": 37,
        "equipo_id": 51,
        "fecha_mantencion": "2025-01-15",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2025",
        "creado_en": "2025-01-15 10:00:00"
    },
    {
        "id": 38,
        "equipo_id": 52,
        "fecha_mantencion": "2026-07-21",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Reemplazadas. Detalle: 2026-07-21",
        "creado_en": "2026-07-21 10:00:00"
    },
    {
        "id": 39,
        "equipo_id": 53,
        "fecha_mantencion": "2026-01-15",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Revisadas. Detalle: Registrado en Conteo UPS Oficial 2026. Recinto B3004.",
        "creado_en": "2026-01-15 10:00:00"
    },
    {
        "id": 40,
        "equipo_id": 54,
        "fecha_mantencion": "2026-01-15",
        "nombre_tecnico": "Servicio Técnico Especializado UPS",
        "horas_trabajo": 2.0,
        "tipo_mantencion": "Preventiva",
        "observaciones": "Cambio y revisión de baterías para UPS. Estado baterías: Revisadas. Detalle: Registrado en Conteo UPS Oficial 2026. Sin existencia / No instalada.",
        "creado_en": "2026-01-15 10:00:00"
    }
];

/**
 * Buscador Inteligente Multiformato de Equipamiento (Grado Industrial)
 * Reconoce códigos canónicos (EQ-UPS-001), sufijos (UPS-001, UPS 001, 001, 1),
 * números de serie con/sin prefijo (1905P0852003, S/N: 1905P0852003),
 * recintos (B1005, REAS, AZ022), nombres y URLs.
 */
function smartFindEquipo(query, equiposList) {
    if (!query) return null;
    const equipos = Array.isArray(equiposList) ? equiposList : [];
    if (equipos.length === 0) return null;

    let raw = String(query).trim();
    raw = raw.replace(/^["'`]+|["'`]+$/g, '').trim();
    if (!raw) return null;

    // 1. Manejo de JSON si viene empaquetado en el QR
    if ((raw.startsWith('{') && raw.endsWith('}')) || (raw.startsWith('[') && raw.endsWith(']'))) {
        try {
            const parsed = JSON.parse(raw);
            if (parsed && typeof parsed === 'object') {
                for (const k of ['codigo_qr', 'codigo', 'qr', 'id', 'sn', 'serial', 'numero_serie', 'recinto']) {
                    if (parsed[k]) {
                        raw = String(parsed[k]).trim();
                        break;
                    }
                }
            }
        } catch (e) {}
    }

    // 2. Extracción de URLs (parámetros qr=..., /equipo/..., #...)
    if (raw.includes('qr=')) {
        try {
            const match = raw.match(/[?&]qr=([^&#]+)/);
            if (match) raw = decodeURIComponent(match[1]).trim();
        } catch (e) {}
    } else if (raw.includes('/equipo/')) {
        const parts = raw.split('/equipo/').pop().split(/[?#]/);
        if (parts[0]) raw = decodeURIComponent(parts[0]).trim();
    } else if (raw.includes('#')) {
        raw = raw.split('#').pop().trim();
    }

    const cleanSn = raw.replace(/^(?:S\/?N|SER(?:IAL)?)\s*[:#-]?\s*/i, '').trim();
    const upperRaw = raw.toUpperCase();
    const upperSn = cleanSn.toUpperCase();
    const normRaw = upperRaw.replace(/[^A-Z0-9]/g, '');
    const normSn = upperSn.replace(/[^A-Z0-9]/g, '');

    // Nivel 1: Coincidencia Exacta en Código QR
    for (const eq of equipos) {
        if (!eq) continue;
        const cqr = (eq.codigo_qr || '').trim().toUpperCase();
        if (cqr && (cqr === upperRaw || cqr === upperSn)) {
            return eq;
        }
    }

    // Nivel 2: Coincidencia Exacta en N° de Serie
    for (const eq of equipos) {
        if (!eq) continue;
        const sn = (eq.numero_serie || '').trim().toUpperCase();
        if (sn && (sn === upperRaw || sn === upperSn)) {
            return eq;
        }
    }

    // Nivel 3: Coincidencia por ID numérico exacto (ej: "1", "54")
    if (/^\d+$/.test(raw)) {
        const targetId = parseInt(raw, 10);
        for (const eq of equipos) {
            if (eq && eq.id === targetId) {
                return eq;
            }
        }
    }

    // Nivel 4: Código normalizado (sin guiones/espacios o sin 'EQ-')
    // Ej: "UPS-001" o "UPS 001" <-> "EQ-UPS-001", "EQUPS001" <-> "EQ-UPS-001"
    if (normRaw) {
        for (const eq of equipos) {
            if (!eq) continue;
            const cqrNorm = (eq.codigo_qr || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (cqrNorm && (cqrNorm === normRaw || cqrNorm === `EQ${normRaw}` || `EQ${cqrNorm}` === normRaw)) {
                return eq;
            }
        }
    }

    // Nivel 5: Sufijo numérico (ej: "UPS-1", "EQ-UPS-1", "EQ-1", "001", "1")
    const numMatch = upperRaw.match(/^(?:EQ-?)?(?:UPS-?)?0*(\d+)$/);
    if (numMatch) {
        const targetNum = parseInt(numMatch[1], 10);
        const pad3 = String(targetNum).padStart(3, '0');
        for (const eq of equipos) {
            if (!eq) continue;
            const cqr = (eq.codigo_qr || '').toUpperCase();
            if (eq.id === targetNum || cqr.endsWith(`-${pad3}`) || cqr.endsWith(`-${targetNum}`)) {
                return eq;
            }
        }
    }

    // Nivel 6: N° de Serie normalizado (solo alfanumérico)
    if (normSn.length >= 4) {
        for (const eq of equipos) {
            if (!eq) continue;
            const snNorm = (eq.numero_serie || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (snNorm && (snNorm === normSn || normSn.includes(snNorm) || snNorm.includes(normSn))) {
                return eq;
            }
        }
    }

    // Nivel 7: Recinto Exacto (ej: "B1005", "REAS", "B1041", "AZ022", "A1024")
    for (const eq of equipos) {
        if (!eq) continue;
        const recinto = (eq.recinto || '').trim().toUpperCase();
        if (recinto && (recinto === upperRaw || recinto === upperSn)) {
            return eq;
        }
    }

    // Nivel 8: Recinto contenido en la consulta (ej: "Recinto B1005", "Sala REAS")
    for (const eq of equipos) {
        if (!eq) continue;
        const recinto = (eq.recinto || '').trim().toUpperCase();
        if (recinto && recinto.length >= 3 && upperRaw.includes(recinto)) {
            return eq;
        }
    }

    // Nivel 9: Nombre del equipo exacto o contenido
    for (const eq of equipos) {
        if (!eq) continue;
        const nombre = (eq.nombre || '').trim().toUpperCase();
        if (nombre && (upperRaw === nombre || (upperRaw.length >= 6 && nombre.includes(upperRaw)))) {
            return eq;
        }
    }

    // Nivel 10: Búsqueda en campo Características
    if (upperRaw.length >= 4) {
        for (const eq of equipos) {
            if (!eq) continue;
            const chars = (eq.caracteristicas || '').toUpperCase();
            if (chars.includes(upperRaw) || (normSn.length >= 4 && chars.includes(normSn))) {
                return eq;
            }
        }
    }

    return null;
}

if (typeof window !== 'undefined') {
    window.smartFindEquipo = smartFindEquipo;
}

class LocalDatabase {
    constructor() {
        this.init();
    }

    init() {
        const CURRENT_VERSION = 'v7_smart_qr_resolver_1.0.15';
        let existingEquipos = [];
        try {
            existingEquipos = JSON.parse(localStorage.getItem('cd_local_equipos') || '[]');
        } catch(e) { 
            existingEquipos = []; 
        }

        // Detectar si el almacenamiento local aún tiene los equipos de prueba antiguos (CCTV, Alarma, etc.)
        const hasDummyItems = existingEquipos.some(e => e && e.codigo_qr && (
            e.codigo_qr.startsWith('EQ-CCTV') || 
            e.codigo_qr.startsWith('EQ-ACS') || 
            e.codigo_qr.startsWith('EQ-INC') ||
            e.codigo_qr.startsWith('EQ-BMS') ||
            e.codigo_qr.startsWith('EQ-CIT') ||
            e.codigo_qr.startsWith('EQ-DET')
        ));

        // Si no hay equipos o tiene items de prueba antiguos, sembrar con los 54 UPS iniciales
        if (existingEquipos.length === 0 || hasDummyItems) {
            localStorage.setItem('cd_local_equipos', JSON.stringify(SEED_EQUIPOS));
            localStorage.setItem('cd_local_mantenciones', JSON.stringify(SEED_MANTENCIONES));
            localStorage.setItem('cd_db_seeded_version', CURRENT_VERSION);
            localStorage.setItem('cd_db_seeded_v2', 'true');
        } else {
            // Asegurar que ningún equipo de los 54 UPS falte, pero preservar equipos y cambios del usuario
            const existingCodes = new Set(existingEquipos.map(e => (e && e.codigo_qr ? e.codigo_qr.toUpperCase() : '')));
            let changed = false;
            SEED_EQUIPOS.forEach(seedEq => {
                if (!existingCodes.has(seedEq.codigo_qr.toUpperCase())) {
                    existingEquipos.push(seedEq);
                    changed = true;
                }
            });
            if (changed) {
                localStorage.setItem('cd_local_equipos', JSON.stringify(existingEquipos));
            }
            localStorage.setItem('cd_db_seeded_version', CURRENT_VERSION);
        }

        // Asegurar que los usuarios oficiales estén siempre presentes
        let existingUsers = [];
        try {
            existingUsers = JSON.parse(localStorage.getItem('cd_local_users') || '[]');
        } catch(e) { 
            existingUsers = []; 
        }

        const hasAdmin = existingUsers.some(u => RutUtils.format(u.rut) === '11.111.111-1');
        if (!hasAdmin) {
            existingUsers = existingUsers.filter(u => u.rol !== 'admin');
            existingUsers.unshift(SEED_USERS[0]);
        }

        const hasCristian = existingUsers.some(u => RutUtils.format(u.rut) === '16.061.974-5');
        if (!hasCristian) {
            existingUsers.push(SEED_USERS[1]);
        }
        localStorage.setItem('cd_local_users', JSON.stringify(existingUsers));
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
            else criticos++;
        });

        return {
            total_equipos: equipos.length,
            operativos,
            en_mantencion,
            criticos,
            otros_estados: criticos,
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
                    (eq.caracteristicas || '').toLowerCase().includes(query) ||
                    (eq.numero_serie || '').toLowerCase().includes(query) ||
                    (eq.recinto || '').toLowerCase().includes(query) ||
                    (eq.piso || '').toLowerCase().includes(query) ||
                    (eq.sector || '').toLowerCase().includes(query)
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
        if (!code) return null;
        const equipos = this.getEquiposRaw();
        const found = smartFindEquipo(code, equipos);
        if (!found) return null;
        return this.getEquipoById(found.id);
    }

    createEquipo(data) {
        const equipos = this.getEquiposRaw();
        const newId = equipos.length > 0 ? Math.max(...equipos.map(e => e.id)) + 1 : 1;
        const prefix = (data.nombre || 'EQ').substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'EQ');
        const defaultCode = `EQ-${prefix}-${String(newId).padStart(3, '0')}`;
        const code = (data.codigo_qr && data.codigo_qr.trim()) ? data.codigo_qr.trim().toUpperCase() : defaultCode;

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
            numero_serie: (data.numero_serie || '').trim(),
            piso: (data.piso || '').trim(),
            sector: (data.sector || '').trim(),
            recinto: (data.recinto || '').trim(),
            capacidad: (data.capacidad || '').trim(),
            baterias_cambiadas: (data.baterias_cambiadas || 'No').trim(),
            observaciones: (data.observaciones || '').trim(),
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
            nombre: data.nombre !== undefined ? data.nombre.trim() : equipos[index].nombre,
            marca: data.marca !== undefined ? data.marca.trim() : equipos[index].marca,
            modelo: data.modelo !== undefined ? data.modelo.trim() : equipos[index].modelo,
            fecha_instalacion: data.fecha_instalacion !== undefined ? data.fecha_instalacion.trim() : equipos[index].fecha_instalacion,
            horas_trabajo: data.horas_trabajo !== undefined ? (parseFloat(data.horas_trabajo) || 0.0) : equipos[index].horas_trabajo,
            caracteristicas: data.caracteristicas !== undefined ? data.caracteristicas.trim() : equipos[index].caracteristicas,
            estado: data.estado || equipos[index].estado,
            ubicacion: data.ubicacion !== undefined ? data.ubicacion.trim() : equipos[index].ubicacion,
            codigo_qr: (data.codigo_qr && data.codigo_qr.trim()) ? data.codigo_qr.trim().toUpperCase() : equipos[index].codigo_qr,
            numero_serie: data.numero_serie !== undefined ? data.numero_serie.trim() : (equipos[index].numero_serie || ''),
            piso: data.piso !== undefined ? data.piso.trim() : (equipos[index].piso || ''),
            sector: data.sector !== undefined ? data.sector.trim() : (equipos[index].sector || ''),
            recinto: data.recinto !== undefined ? data.recinto.trim() : (equipos[index].recinto || ''),
            capacidad: data.capacidad !== undefined ? data.capacidad.trim() : (equipos[index].capacidad || ''),
            baterias_cambiadas: data.baterias_cambiadas !== undefined ? data.baterias_cambiadas : (equipos[index].baterias_cambiadas || 'No'),
            observaciones: data.observaciones !== undefined ? data.observaciones.trim() : (equipos[index].observaciones || ''),
            actualizado_en: new Date().toISOString()
        };

        this.saveEquipos(equipos);
        return this.getEquipoById(eqId);
    }

    associateCodeToEquipo(id, code, field = 'codigo_qr') {
        const eqId = parseInt(id, 10);
        const equipos = this.getEquiposRaw();
        const index = equipos.findIndex(e => e.id === eqId);
        if (index === -1) throw new Error('Equipo no encontrado');

        const clean = String(code).trim();
        if (field === 'numero_serie') {
            equipos[index].numero_serie = clean;
        } else {
            equipos[index].codigo_qr = clean.toUpperCase();
        }

        const note = `[Código físico vinculado: ${clean}]`;
        const currentChars = equipos[index].caracteristicas || '';
        if (!currentChars.includes(note)) {
            equipos[index].caracteristicas = (currentChars + ' ' + note).trim();
        }
        equipos[index].actualizado_en = new Date().toISOString();
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
        return 'https://mantencion.cfelbc.cl';
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
