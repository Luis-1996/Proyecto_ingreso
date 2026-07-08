import json
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
    cursor = await db.execute("SELECT id FROM config WHERE key = ?", ("categorias",))
    if not await cursor.fetchone():
        await db.execute(
            "INSERT INTO config (key, value) VALUES (?, ?)",
            ("categorias", json.dumps(["Empleado", "Visitante", "Residente"])),
        )
    cursor = await db.execute("SELECT id FROM config WHERE key = ?", ("destinos",))
    if not await cursor.fetchone():
        await db.execute(
            "INSERT INTO config (key, value) VALUES (?, ?)",
            ("destinos", json.dumps(["Casa 1", "Casa 2", "Casa 3", "Casa 4"])),
        )
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
    now = datetime.now().isoformat()

    cursor = await db.execute(
        "SELECT id, placa, nombre, categoria, destino, ingreso, salida, activo FROM entries WHERE placa = ? AND activo = 1 ORDER BY ingreso DESC LIMIT 1",
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
            "INSERT INTO entries (placa, nombre, categoria, destino, ingreso, salida, activo) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id",
            (placa, nombre, categoria, destino, None, now, 0),
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
                "ingreso": None,
                "salida": now,
                "activo": False,
            },
        }

    if activo:
        raise HTTPException(status_code=400, detail=f"El {categoria} ya tiene un ingreso activo")

    cursor = await db.execute(
        "INSERT INTO entries (placa, nombre, categoria, destino, ingreso, salida, activo) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id",
        (placa, nombre, categoria, destino, now, None, 1),
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
        "INSERT INTO entries (placa, nombre, categoria, destino, ingreso, salida, activo) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING id",
        (entry.placa, entry.nombre, entry.categoria, entry.destino, now, None, 1),
    )
    row = await cursor.fetchone()
    await db.commit()
    return {
        "id": str(row["id"]),
        "placa": entry.placa,
        "nombre": entry.nombre,
        "categoria": entry.categoria,
        "destino": entry.destino,
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
        h = datetime.fromisoformat(hasta + "T23:59:59").isoformat()
        params.append(h)
        params.append(h)
    if salida_desde:
        conditions.append("salida >= ?")
        params.append(datetime.fromisoformat(salida_desde).isoformat())
    if salida_hasta:
        conditions.append("salida < ?")
        params.append(datetime.fromisoformat(salida_hasta + "T23:59:59").isoformat())
    if sin_ingreso:
        conditions.append("ingreso IS NULL")
        sql_order = " ORDER BY salida DESC"
    elif salida_desde or salida_hasta:
        sql_order = " ORDER BY salida DESC"
    else:
        sql_order = " ORDER BY ingreso DESC"

    where = " WHERE " + " AND ".join(conditions) if conditions else ""
    sql = f"SELECT id, placa, nombre, categoria, destino, ingreso, salida, activo FROM entries{where}{sql_order}"

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
            "activo": bool(r["activo"]),
        }
        for r in rows
    ]


@app.get("/api/entries/{entry_id}")
async def get_entry(entry_id: int):
    db = get_db()
    cursor = await db.execute(
        "SELECT id, placa, nombre, categoria, destino, ingreso, salida, activo FROM entries WHERE id = ?",
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
        "SELECT id, placa, nombre, categoria, destino, ingreso, salida, activo FROM entries WHERE id = ?",
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
        "UPDATE entries SET ingreso = ? WHERE id = ? RETURNING id, placa, nombre, categoria, destino, ingreso, salida, activo",
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
