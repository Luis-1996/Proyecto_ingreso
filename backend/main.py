import json
import os
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import EntryCreate, ConfigUpdate, PersonaCreate
from database import connect_db, disconnect_db, get_db

app = FastAPI(title="Control de Ingreso", version="3.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


async def cargar_schema(db):
    schema_path = os.path.join(os.path.dirname(__file__), "..", "database", "schema.sql")
    if not os.path.exists(schema_path):
        schema_path = os.path.join(os.getcwd(), "database", "schema.sql")
    if os.path.exists(schema_path):
        with open(schema_path, encoding="utf-8") as f:
            sql = f.read()
        await db.executescript(sql)
        print("Base de datos inicializada desde schema.sql")
        return True
    return False


SEED_SQL = """
INSERT OR IGNORE INTO config (key, value) VALUES
    ('categorias', '["Empleado", "Visitante", "Residente", "Seguridad"]'),
    ('destinos', '["Casa 1", "Casa 2", "Casa 3", "Casa 4", "Finca", "Establo"]');
INSERT OR IGNORE INTO personas (placa, nombre, categoria, destino) VALUES
    ('GHZ627', 'ALBEIRO VARCO', 'Residente', 'Casa 3'),
    ('EHK942', 'ANDRES URIBE', 'Residente', 'Casa 2'),
    ('JIV982', 'ANDRES URIBE', 'Residente', 'Casa 2'),
    ('KUP664', 'CARLA', 'Residente', 'Casa 2'),
    ('PZX341', 'CARLOS', 'Residente', 'Casa 4'),
    ('KOQ539', 'CARLOS', 'Residente', 'Casa 4'),
    ('FXQ560', 'CATALINA', 'Residente', 'Casa 1'),
    ('KCJ400', 'DANIEL', 'Residente', 'Casa 4'),
    ('NFN052', 'DANIEL', 'Residente', 'Casa 4'),
    ('GHY959', 'EMILIO URIBE', 'Residente', 'Casa 2'),
    ('MNW718', 'JUAN', 'Residente', 'Casa 4'),
    ('JSS065', 'LAURA', 'Residente', 'Casa 4'),
    ('PRP557', 'MARIA', 'Residente', 'Casa 4'),
    ('PMN646', 'MARITA', 'Residente', 'Casa 4'),
    ('LFN390', 'RICARDO JARAMILLO', 'Residente', 'Casa 4'),
    ('EON02H', 'RICARDO JARAMILLO', 'Residente', 'Casa 4'),
    ('EFW803', 'SEBASTIAN', 'Residente', 'Casa 1'),
    ('KFB28G', 'XIOMARA', 'Residente', 'Casa 3'),
    ('EDT47G', 'ALEXANDER GARCES-TRABAJADOR EXTERNO', 'Empleado', 'Casa 1'),
    ('AKL72H', 'ANDREA MANICURISTA', 'Empleado', 'Casa 4'),
    ('GZP45F', 'BRANDON JARAMILLO- TRABAJADOR EXTERNO', 'Empleado', 'Casa 1'),
    ('RBO85F', 'CLAUDIA EMPLEADA', 'Empleado', 'Casa 4'),
    ('USJ37F', 'DIEGO ESCOLTA', 'Empleado', 'Casa 1'),
    ('JUW01G', 'GLORIA EMPLEADA', 'Empleado', 'Casa 4'),
    ('JHP989', 'HECTOR JARDINERO', 'Empleado', 'Casa 2'),
    ('EHZ271', 'HECTOR JARDINERO', 'Empleado', 'Casa 2'),
    ('GYI99H', 'JHOAN OFICIOS VARIOS', 'Empleado', 'Finca'),
    ('MOTO', 'JORGE BAENA PELUQUERO', 'Empleado', 'Casa 4'),
    ('BICICLETA', 'LIBARDO JARDINERO', 'Empleado', 'Casa 4'),
    ('JLA833', 'LINA EMPLEADA', 'Empleado', 'Casa 1'),
    ('RBZ82F', 'MARCO CONTRATISTA', 'Empleado', 'Finca'),
    ('FUV85G', 'MARIO ESCOLTA', 'Empleado', 'Casa 4'),
    ('INP579', 'NATALIA PROFE', 'Empleado', 'Casa 1'),
    ('RCN92F', 'NORBERTO-OFICIOS VARIOS', 'Empleado', 'Casa 3'),
    ('DEW059', 'OSCAR MEJIA CONDUCTOR', 'Empleado', 'Casa 4'),
    ('KBX138', 'PACO MONTADOR', 'Empleado', 'Establo'),
    ('JFG43D', 'PAULA EMPLEADA', 'Empleado', 'Casa 4'),
    ('VCC33H', 'SANDRA EMPLEADA', 'Empleado', 'Casa 4'),
    ('KBQ773', 'SANTIAGO MONTADOR', 'Empleado', 'Establo'),
    ('EIB46C', 'YANETH UÑAS', 'Empleado', 'Casa 4'),
    ('ZMR23H', 'YOLIMA NIÑERA', 'Empleado', 'Casa 1'),
    ('KRU634', 'AMIGA JUAN', 'Visitante', 'Casa 4'),
    ('JCN087', 'CAMILA DUQUE', 'Visitante', 'Casa 2'),
    ('FIQ347', 'DOGUER', 'Visitante', 'Finca'),
    ('LVZ888', 'GABRIEL FERNANDEZ', 'Visitante', 'Casa 4'),
    ('BLB626', 'GABRIEL FERNANDEZ', 'Visitante', 'Casa 4'),
    ('KIY342', 'GUILLERMO FERNANDEZ', 'Visitante', 'Casa 4'),
    ('IZX526', 'HERMANA DE CATALINA', 'Visitante', 'Casa 1'),
    ('PJL179', 'HERMANA DE CATALINA', 'Visitante', 'Casa 1'),
    ('FXM375', 'IVAN SANTIAGO', 'Visitante', 'Casa 2'),
    ('NPQ677', 'JAIME ORTIZ SUEGRO TOMAS', 'Visitante', 'Casa 1'),
    ('JXF776', 'JORGE ISAZA', 'Visitante', 'Casa 2'),
    ('STA415', 'LOS VALENCIA INSUMOS', 'Visitante', 'Casa 3'),
    ('JYV635', 'MARIA EUGENIA CADAVID', 'Visitante', 'Casa 2'),
    ('LLY999', 'MIGUEL GONSALEZ', 'Visitante', 'Casa 2'),
    ('QTR508', 'MIGUEL SIERRA', 'Visitante', 'Casa 2'),
    ('NFQ068', 'OCTAVIO JARAMILLO', 'Visitante', 'Casa 4'),
    ('NTT923', 'PABLO', 'Visitante', 'Casa 2'),
    ('JON936', 'PAPÁ ANDRES URIBE', 'Visitante', 'Casa 2'),
    ('GRO364', 'PAPÁ DE CATALINA', 'Visitante', 'Casa 1'),
    ('JCR758', 'PAPÁ DE CATALINA', 'Visitante', 'Casa 1'),
    ('JLY981', 'PAPÁ EMILIO URIBE', 'Visitante', 'Casa 2'),
    ('KUQ782', 'PATRICIA VELEZ HERMA MARITA', 'Visitante', 'Casa 4'),
    ('LRO635', 'ROBERT NOVIO CARLA', 'Visitante', 'Casa 2'),
    ('FIY619', 'SARA GOMEZ', 'Visitante', 'Casa 2'),
    ('NPL020', 'SARA MEZA', 'Visitante', 'Casa 2'),
    ('RMD611', 'TOMAS GRAY *ANUNCIAR*', 'Visitante', 'Casa 2'),
    ('QTM667', 'TOMAS LOMDOÑO PRIMO SEBASTIAN', 'Visitante', 'Casa 1'),
    ('MLZ840', 'TOMAS LOMDOÑO PRIMO SEBASTIAN', 'Visitante', 'Casa 1'),
    ('NWM773', 'TOMAS SALDARRIAGA', 'Visitante', 'Casa 2'),
    ('FIW940', 'PRO-ACCION', 'Seguridad', 'Finca'),
    ('UBL26G', 'PRO-ACCION', 'Seguridad', 'Finca'),
    ('GYJ75H', 'PRO-ACCION', 'Seguridad', 'Finca'),
    ('AMT70F', 'PRO-ACCION', 'Seguridad', 'Finca');
"""

@app.on_event("startup")
async def startup():
    await connect_db()
    db = get_db()
    await db.executescript("""
        CREATE TABLE IF NOT EXISTS personas (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            placa TEXT NOT NULL UNIQUE,
            nombre TEXT NOT NULL,
            categoria TEXT NOT NULL,
            destino TEXT DEFAULT '',
            eliminado INTEGER DEFAULT 0
        );
        CREATE TABLE IF NOT EXISTS entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            placa TEXT NOT NULL,
            nombre TEXT NOT NULL,
            categoria TEXT NOT NULL,
            destino TEXT DEFAULT '',
            ingreso TEXT,
            salida TEXT,
            responsable TEXT DEFAULT '',
            activo INTEGER DEFAULT 1
        );
        CREATE TABLE IF NOT EXISTS config (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key TEXT NOT NULL UNIQUE,
            value TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_personas_placa ON personas(placa);
        CREATE INDEX IF NOT EXISTS idx_personas_nombre ON personas(nombre);
        CREATE INDEX IF NOT EXISTS idx_entries_placa ON entries(placa);
        CREATE INDEX IF NOT EXISTS idx_entries_activo ON entries(activo);
        CREATE INDEX IF NOT EXISTS idx_entries_categoria ON entries(categoria);
        CREATE INDEX IF NOT EXISTS idx_entries_ingreso ON entries(ingreso);
    """)
    try:
        await db.execute("ALTER TABLE entries ADD COLUMN responsable TEXT DEFAULT ''")
    except Exception:
        pass
    if not await cargar_schema(db):
        cursor = await db.execute("SELECT id FROM config WHERE key = ?", ("categorias",))
        if not await cursor.fetchone():
            await db.executescript(SEED_SQL)
            print("Datos semilla insertados (fallback)")
        else:
            print("La base de datos ya contiene datos")
    await db.commit()
    print("Base de datos inicializada")


@app.on_event("shutdown")
async def shutdown():
    await disconnect_db()


# ─── Personas ─────────────────────────────────────────────────────────────────

@app.get("/api/personas")
async def list_personas(q: str = None):
    db = get_db()
    if q:
        q = q.upper()
        cursor = await db.execute(
            "SELECT id, placa, nombre, categoria, destino FROM personas WHERE (UPPER(placa) LIKE ? OR UPPER(nombre) LIKE ?) AND (eliminado IS NULL OR eliminado = 0) ORDER BY nombre",
            (f"%{q}%", f"%{q}%"),
        )
    else:
        cursor = await db.execute(
            "SELECT id, placa, nombre, categoria, destino FROM personas WHERE eliminado IS NULL OR eliminado = 0 ORDER BY nombre"
        )
    rows = await cursor.fetchall()
    return [
        {"id": str(r["id"]), "placa": r["placa"], "nombre": r["nombre"], "categoria": r["categoria"], "destino": r["destino"] or ""}
        for r in rows
    ]


@app.post("/api/personas")
async def create_persona(persona: PersonaCreate):
    db = get_db()
    placa = persona.placa.upper()
    cursor = await db.execute("SELECT id, eliminado FROM personas WHERE placa = ?", (placa,))
    existing = await cursor.fetchone()
    if existing and (existing["eliminado"] is None or existing["eliminado"] == 0):
        raise HTTPException(status_code=400, detail="Ya existe una persona con esa placa")
    if existing and existing["eliminado"] == 1:
        cursor = await db.execute(
            "UPDATE personas SET nombre = ?, categoria = ?, destino = ?, eliminado = 0 WHERE id = ? RETURNING id, placa, nombre, categoria, destino",
            (persona.nombre, persona.categoria, persona.destino or "", existing["id"]),
        )
    else:
        cursor = await db.execute(
            "INSERT INTO personas (placa, nombre, categoria, destino) VALUES (?, ?, ?, ?) RETURNING id, placa, nombre, categoria, destino",
            (placa, persona.nombre, persona.categoria, persona.destino or ""),
        )
    row = await cursor.fetchone()
    await db.commit()
    return {"id": str(row["id"]), "placa": row["placa"], "nombre": row["nombre"], "categoria": row["categoria"], "destino": row["destino"] or ""}


@app.put("/api/personas/{persona_id}")
async def update_persona(persona_id: int, persona: PersonaCreate):
    db = get_db()
    placa = persona.placa.upper()
    cursor = await db.execute(
        "UPDATE personas SET placa = ?, nombre = ?, categoria = ?, destino = ? WHERE id = ? AND (eliminado IS NULL OR eliminado = 0)",
        (placa, persona.nombre, persona.categoria, persona.destino or "", persona_id),
    )
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    await db.commit()
    return {"id": str(persona_id), "placa": placa, "nombre": persona.nombre, "categoria": persona.categoria, "destino": persona.destino or ""}


@app.delete("/api/personas/{persona_id}")
async def delete_persona(persona_id: int):
    db = get_db()
    cursor = await db.execute(
        "UPDATE personas SET eliminado = 1 WHERE id = ? AND (eliminado IS NULL OR eliminado = 0)",
        (persona_id,),
    )
    await db.commit()
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Persona no encontrada")
    return {"ok": True}


# ─── Ingreso Automático ───────────────────────────────────────────────────────

@app.post("/api/ingreso-automatico")
async def ingreso_automatico(data: dict):
    placa = data.get("placa", "").upper()
    db = get_db()
    cursor = await db.execute(
        "SELECT id, placa, nombre, categoria, destino FROM personas WHERE placa = ? AND (eliminado IS NULL OR eliminado = 0)",
        (placa,),
    )
    persona = await cursor.fetchone()
    if not persona:
        raise HTTPException(status_code=404, detail="Placa no registrada")

    nombre = data.get("nombre", persona["nombre"])
    categoria = data.get("categoria", persona["categoria"])
    destino = data.get("destino", persona["destino"] if persona["destino"] else categoria)
    responsable = data.get("responsable", "")
    now = datetime.now().isoformat()

    cursor = await db.execute(
        "SELECT id, placa, nombre, categoria, destino, ingreso, salida, responsable, activo FROM entries WHERE placa = ? AND activo = 1 ORDER BY ingreso DESC LIMIT 1",
        (placa,),
    )
    activo = await cursor.fetchone()

    if categoria == "Residente":
        cursor = await db.execute(
            "SELECT id FROM entries WHERE placa = ? AND ingreso IS NULL AND salida IS NOT NULL LIMIT 1",
            (placa,),
        )
        if await cursor.fetchone():
            raise HTTPException(status_code=400, detail="El residente ya tiene una salida pendiente")

        cursor = await db.execute(
            "INSERT INTO entries (placa, nombre, categoria, destino, responsable, ingreso, salida, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
            (placa, nombre, categoria, destino, responsable, None, now, 0),
        )
        row = await cursor.fetchone()
        await db.commit()
        return {
            "accion": "salida",
            "entry": {
                "id": str(row["id"]),
                "placa": placa,
                "nombre": nombre,
                "categoria": categoria,
                "destino": destino,
                "responsable": row["responsable"] or "",
                "ingreso": None,
                "salida": now,
                "activo": False,
            },
        }

    if activo:
        raise HTTPException(status_code=400, detail=f"El {categoria} ya tiene un ingreso activo")

    cursor = await db.execute(
        "INSERT INTO entries (placa, nombre, categoria, destino, responsable, ingreso, salida, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
        (placa, nombre, categoria, destino, responsable, now, None, 1),
    )
    row = await cursor.fetchone()
    await db.commit()
    return {
        "accion": "ingreso",
        "entry": {
            "id": str(row["id"]),
            "placa": placa,
            "nombre": nombre,
            "categoria": categoria,
            "destino": destino,
            "responsable": row["responsable"] or "",
            "ingreso": now,
            "salida": None,
            "activo": True,
        },
    }


# ─── Entries ──────────────────────────────────────────────────────────────────

@app.post("/api/entries")
async def create_entry(entry: EntryCreate):
    db = get_db()
    now = datetime.now().isoformat()
    cursor = await db.execute(
        "INSERT INTO entries (placa, nombre, categoria, destino, responsable, ingreso, salida, activo) VALUES (?, ?, ?, ?, ?, ?, ?, ?) RETURNING id",
        (entry.placa, entry.nombre, entry.categoria, entry.destino, "", now, None, 1),
    )
    row = await cursor.fetchone()
    await db.commit()
    return {
        "id": str(row["id"]),
        "placa": entry.placa,
        "nombre": entry.nombre,
        "categoria": entry.categoria,
        "destino": entry.destino,
        "responsable": "",
        "ingreso": now,
        "salida": None,
        "activo": True,
    }


@app.get("/api/entries")
async def get_entries(activo: bool = None, categoria: str = None, desde: str = None, hasta: str = None, sin_ingreso: bool = None, salida_desde: str = None, salida_hasta: str = None):
    db = get_db()
    conditions = []
    params = []

    if activo is not None:
        conditions.append("activo = ?")
        params.append(1 if activo else 0)
    if categoria:
        conditions.append("categoria = ?")
        params.append(categoria)
    if desde:
        conditions.append("(ingreso >= ? OR salida >= ?)")
        d = datetime.fromisoformat(desde).isoformat()
        params.append(d)
        params.append(d)
    if hasta:
        conditions.append("(ingreso <= ? OR salida <= ?)")
        hs = hasta if "T" in hasta else hasta + "T23:59:59"
        h = datetime.fromisoformat(hs).isoformat()
        params.append(h)
        params.append(h)
    if salida_desde:
        conditions.append("salida >= ?")
        params.append(datetime.fromisoformat(salida_desde).isoformat())
    if salida_hasta:
        conditions.append("salida < ?")
        hs = salida_hasta if "T" in salida_hasta else salida_hasta + "T23:59:59"
        params.append(datetime.fromisoformat(hs).isoformat())
    if sin_ingreso:
        conditions.append("ingreso IS NULL")
        sql_order = " ORDER BY salida DESC"
    elif salida_desde or salida_hasta:
        sql_order = " ORDER BY salida DESC"
    else:
        sql_order = " ORDER BY ingreso DESC"

    where = " WHERE " + " AND ".join(conditions) if conditions else ""
    sql = f"SELECT id, placa, nombre, categoria, destino, ingreso, salida, responsable, activo FROM entries{where}{sql_order}"

    cursor = await db.execute(sql, params)
    rows = await cursor.fetchall()
    return [
        {
            "id": str(r["id"]),
            "placa": r["placa"],
            "nombre": r["nombre"],
            "categoria": r["categoria"],
            "destino": r["destino"],
            "ingreso": r["ingreso"] if r["ingreso"] else None,
            "salida": r["salida"] if r["salida"] else None,
            "responsable": r["responsable"] or "",
            "activo": bool(r["activo"]),
        }
        for r in rows
    ]


@app.get("/api/entries/{entry_id}")
async def get_entry(entry_id: int):
    db = get_db()
    cursor = await db.execute(
        "SELECT id, placa, nombre, categoria, destino, ingreso, salida, responsable, activo FROM entries WHERE id = ?",
        (entry_id,),
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    return {
        "id": str(row["id"]),
        "placa": row["placa"],
        "nombre": row["nombre"],
        "categoria": row["categoria"],
        "destino": row["destino"],
        "ingreso": row["ingreso"] if row["ingreso"] else None,
        "salida": row["salida"] if row["salida"] else None,
        "responsable": row["responsable"] or "",
        "activo": bool(row["activo"]),
    }


@app.put("/api/entries/{entry_id}/salida")
async def registrar_salida(entry_id: int):
    db = get_db()
    now = datetime.now().isoformat()
    cursor = await db.execute(
        "UPDATE entries SET salida = ?, activo = 0 WHERE id = ?",
        (now, entry_id),
    )
    if cursor.rowcount == 0:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    cursor = await db.execute(
        "SELECT id, placa, nombre, categoria, destino, ingreso, salida, responsable, activo FROM entries WHERE id = ?",
        (entry_id,),
    )
    row = await cursor.fetchone()
    await db.commit()
    return {
        "id": str(row["id"]),
        "placa": row["placa"],
        "nombre": row["nombre"],
        "categoria": row["categoria"],
        "destino": row["destino"],
        "ingreso": row["ingreso"] if row["ingreso"] else None,
        "salida": row["salida"] if row["salida"] else None,
        "responsable": row["responsable"] or "",
        "activo": bool(row["activo"]),
    }


@app.put("/api/entries/registrar-ingreso/{placa}")
async def registrar_ingreso_residente(placa: str):
    db = get_db()
    placa = placa.upper()
    now = datetime.now().isoformat()
    cursor = await db.execute(
        "SELECT id FROM entries WHERE placa = ? AND ingreso IS NULL AND salida IS NOT NULL ORDER BY salida DESC LIMIT 1",
        (placa,),
    )
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="No hay registro de salida pendiente")

    cursor = await db.execute(
        "UPDATE entries SET ingreso = ? WHERE id = ? RETURNING id, placa, nombre, categoria, destino, ingreso, salida, responsable, activo",
        (now, row["id"]),
    )
    result = await cursor.fetchall()
    row = result[0]
    await db.commit()
    return {
        "id": str(row["id"]),
        "placa": row["placa"],
        "nombre": row["nombre"],
        "categoria": row["categoria"],
        "destino": row["destino"],
        "ingreso": row["ingreso"] if row["ingreso"] else None,
        "salida": row["salida"] if row["salida"] else None,
        "responsable": row["responsable"] or "",
        "activo": bool(row["activo"]),
    }


@app.get("/api/stats")
async def get_stats():
    db = get_db()
    cursor = await db.execute("SELECT COUNT(*) FROM entries")
    total = (await cursor.fetchone())[0]
    cursor = await db.execute("SELECT COUNT(*) FROM entries WHERE activo = 1")
    activos = (await cursor.fetchone())[0]
    cursor = await db.execute("SELECT COUNT(*) FROM entries WHERE categoria = 'Empleado'")
    empleados = (await cursor.fetchone())[0]
    cursor = await db.execute("SELECT COUNT(*) FROM entries WHERE categoria = 'Visitante'")
    visitantes = (await cursor.fetchone())[0]
    cursor = await db.execute("SELECT COUNT(*) FROM entries WHERE categoria = 'Residente'")
    residentes = (await cursor.fetchone())[0]
    return {
        "total": total,
        "activos": activos,
        "empleados": empleados,
        "visitantes": visitantes,
        "residentes": residentes,
    }


# ─── Config ───────────────────────────────────────────────────────────────────

@app.get("/api/config/{key}")
async def get_config(key: str):
    db = get_db()
    cursor = await db.execute("SELECT key, value FROM config WHERE key = ?", (key,))
    row = await cursor.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    return {"key": row["key"], "value": json.loads(row["value"])}


@app.put("/api/config/{key}")
async def update_config(key: str, config: ConfigUpdate):
    db = get_db()
    await db.execute(
        "INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
        (key, json.dumps(config.value)),
    )
    await db.commit()
    return {"key": key, "value": config.value}


if __name__ == "__main__":
    import uvicorn
    port = int(os.environ.get("BACKEND_PORT", "8002"))
    uvicorn.run(app, host="127.0.0.1", port=port, reload=False, workers=1)
