import json
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import EntryCreate, Entry, ConfigUpdate, PersonaCreate, Persona
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
    pool = get_db()
    async with pool.acquire() as conn:
        categorias = await conn.fetchrow("SELECT id FROM config WHERE key = 'categorias'")
        if not categorias:
            await conn.execute(
                "INSERT INTO config (key, value) VALUES ('categorias', $1::jsonb)",
                json.dumps(["Empleado", "Visitante", "Residente"]),
            )
        destinos = await conn.fetchrow("SELECT id FROM config WHERE key = 'destinos'")
        if not destinos:
            await conn.execute(
                "INSERT INTO config (key, value) VALUES ('destinos', $1::jsonb)",
                json.dumps(["Casa 1", "Casa 2", "Casa 3", "Casa 4"]),
            )
        count = await conn.fetchval("SELECT COUNT(*) FROM personas")
        _ = count  # no seed personas
    print("Base de datos inicializada")


@app.on_event("shutdown")
async def shutdown():
    await disconnect_db()


def row_to_dict(row, fields):
    if not row:
        return None
    return {f: row[f] for f in fields}


# ─── Personas ─────────────────────────────────────────────────────────────────

@app.get("/api/personas")
async def list_personas(q: str = None):
    pool = get_db()
    async with pool.acquire() as conn:
        if q:
            q = q.upper()
            rows = await conn.fetch(
                "SELECT id, placa, nombre, categoria, destino FROM personas WHERE (UPPER(placa) LIKE $1 OR UPPER(nombre) LIKE $1) AND (eliminado IS NULL OR eliminado = FALSE) ORDER BY nombre",
                f"%{q}%",
            )
        else:
            rows = await conn.fetch(
                "SELECT id, placa, nombre, categoria, destino FROM personas WHERE eliminado IS NULL OR eliminado = FALSE ORDER BY nombre"
            )
    return [
        {"id": str(r["id"]), "placa": r["placa"], "nombre": r["nombre"], "categoria": r["categoria"], "destino": r["destino"] or ""}
        for r in rows
    ]


@app.post("/api/personas")
async def create_persona(persona: PersonaCreate):
    pool = get_db()
    async with pool.acquire() as conn:
        placa = persona.placa.upper()
        existing = await conn.fetchrow("SELECT id, eliminado FROM personas WHERE placa = $1", placa)
        if existing and (existing["eliminado"] is None or existing["eliminado"] == False):
            raise HTTPException(status_code=400, detail="Ya existe una persona con esa placa")
        if existing and existing["eliminado"] == True:
            row = await conn.fetchrow(
                "UPDATE personas SET nombre = $1, categoria = $2, destino = $3, eliminado = FALSE WHERE id = $4 RETURNING id, placa, nombre, categoria, destino",
                persona.nombre, persona.categoria, persona.destino or "", existing["id"],
            )
        else:
            row = await conn.fetchrow(
                "INSERT INTO personas (placa, nombre, categoria, destino) VALUES ($1, $2, $3, $4) RETURNING id, placa, nombre, categoria, destino",
                placa, persona.nombre, persona.categoria, persona.destino or "",
            )
    return {"id": str(row["id"]), "placa": row["placa"], "nombre": row["nombre"], "categoria": row["categoria"], "destino": row["destino"] or ""}


@app.delete("/api/personas/{persona_id}")
async def delete_persona(persona_id: int):
    pool = get_db()
    async with pool.acquire() as conn:
        result = await conn.execute("UPDATE personas SET eliminado = TRUE WHERE id = $1 AND (eliminado IS NULL OR eliminado = FALSE)", persona_id)
        if result == "UPDATE 0":
            raise HTTPException(status_code=404, detail="Persona no encontrada")
    return {"ok": True}


# ─── Ingreso Automático ───────────────────────────────────────────────────────

@app.post("/api/ingreso-automatico")
async def ingreso_automatico(data: dict):
    placa = data.get("placa", "").upper()
    pool = get_db()
    async with pool.acquire() as conn:
        persona = await conn.fetchrow(
            "SELECT id, placa, nombre, categoria, destino FROM personas WHERE placa = $1 AND (eliminado IS NULL OR eliminado = FALSE)",
            placa,
        )
        if not persona:
            raise HTTPException(status_code=404, detail="Placa no registrada")

        # Permitir sobrescribir datos desde el frontend sin modificar el registro original
        nombre = data.get("nombre", persona["nombre"])
        categoria = data.get("categoria", persona["categoria"])
        destino = data.get("destino", persona.get("destino") or categoria)
        now = datetime.now()

        activo = await conn.fetchrow(
            "SELECT id, placa, nombre, categoria, destino, ingreso, salida, activo FROM entries WHERE placa = $1 AND activo = TRUE ORDER BY ingreso DESC LIMIT 1",
            placa,
        )

        if categoria == "Residente":
            row = await conn.fetchrow(
                "INSERT INTO entries (placa, nombre, categoria, destino, ingreso, salida, activo) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
                placa, nombre, categoria, destino, None, now, False,
            )
            return {
                "accion": "salida",
                "entry": {
                    "id": str(row["id"]),
                    "placa": placa,
                    "nombre": nombre,
                    "categoria": categoria,
                    "destino": destino,
                    "ingreso": None,
                    "salida": now.isoformat(),
                    "activo": False,
                },
            }

        if activo:
            raise HTTPException(status_code=400, detail=f"El {categoria} ya tiene un ingreso activo")

        row = await conn.fetchrow(
            "INSERT INTO entries (placa, nombre, categoria, destino, ingreso, salida, activo) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
            placa, nombre, categoria, destino, now, None, True,
        )
        return {
            "accion": "ingreso",
            "entry": {
                "id": str(row["id"]),
                "placa": placa,
                "nombre": nombre,
                "categoria": categoria,
                "destino": destino,
                "ingreso": now.isoformat(),
                "salida": None,
                "activo": True,
            },
        }


# ─── Entries ──────────────────────────────────────────────────────────────────

@app.post("/api/entries")
async def create_entry(entry: EntryCreate):
    pool = get_db()
    now = datetime.now()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "INSERT INTO entries (placa, nombre, categoria, destino, ingreso, salida, activo) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id",
            entry.placa, entry.nombre, entry.categoria, entry.destino, now, None, True,
        )
    return {
        "id": str(row["id"]),
        "placa": entry.placa,
        "nombre": entry.nombre,
        "categoria": entry.categoria,
        "destino": entry.destino,
        "ingreso": now.isoformat(),
        "salida": None,
        "activo": True,
    }


@app.get("/api/entries")
async def get_entries(activo: bool = None, categoria: str = None, desde: str = None, hasta: str = None, sin_ingreso: bool = None):
    pool = get_db()
    conditions = []
    params = []
    idx = 1

    if activo is not None:
        conditions.append(f"activo = ${idx}")
        params.append(activo)
        idx += 1
    if categoria:
        conditions.append(f"categoria = ${idx}")
        params.append(categoria)
        idx += 1
    if desde:
        conditions.append(f"ingreso >= ${idx}")
        params.append(datetime.fromisoformat(desde))
        idx += 1
    if hasta:
        conditions.append(f"ingreso < ${idx}")
        params.append(datetime.fromisoformat(hasta + 'T23:59:59'))
        idx += 1
    if sin_ingreso:
        conditions.append(f"ingreso IS NULL")
        sql_order = " ORDER BY salida DESC"
    else:
        sql_order = " ORDER BY ingreso DESC"

    where = " WHERE " + " AND ".join(conditions) if conditions else ""
    sql = f"SELECT id, placa, nombre, categoria, destino, ingreso, salida, activo FROM entries{where}{sql_order}"

    async with pool.acquire() as conn:
        rows = await conn.fetch(sql, *params)
    return [
        {
            "id": str(r["id"]),
            "placa": r["placa"],
            "nombre": r["nombre"],
            "categoria": r["categoria"],
            "destino": r["destino"],
            "ingreso": r["ingreso"].isoformat() if r["ingreso"] else None,
            "salida": r["salida"].isoformat() if r["salida"] else None,
            "activo": r["activo"],
        }
        for r in rows
    ]


@app.get("/api/entries/{entry_id}")
async def get_entry(entry_id: int):
    pool = get_db()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT id, placa, nombre, categoria, destino, ingreso, salida, activo FROM entries WHERE id = $1",
            entry_id,
        )
    if not row:
        raise HTTPException(status_code=404, detail="Registro no encontrado")
    return {
        "id": str(row["id"]),
        "placa": row["placa"],
        "nombre": row["nombre"],
        "categoria": row["categoria"],
        "destino": row["destino"],
        "ingreso": row["ingreso"].isoformat() if row["ingreso"] else None,
        "salida": row["salida"].isoformat() if row["salida"] else None,
        "activo": row["activo"],
    }


@app.put("/api/entries/{entry_id}/salida")
async def registrar_salida(entry_id: int):
    pool = get_db()
    now = datetime.now()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "UPDATE entries SET salida = $1, activo = FALSE WHERE id = $2",
            now, entry_id,
        )
        if result == "UPDATE 0":
            raise HTTPException(status_code=404, detail="Registro no encontrado")
        row = await conn.fetchrow(
            "SELECT id, placa, nombre, categoria, destino, ingreso, salida, activo FROM entries WHERE id = $1",
            entry_id,
        )
    return {
        "id": str(row["id"]),
        "placa": row["placa"],
        "nombre": row["nombre"],
        "categoria": row["categoria"],
        "destino": row["destino"],
        "ingreso": row["ingreso"].isoformat() if row["ingreso"] else None,
        "salida": row["salida"].isoformat() if row["salida"] else None,
        "activo": row["activo"],
    }


@app.put("/api/entries/registrar-ingreso/{placa}")
async def registrar_ingreso_residente(placa: str):
    pool = get_db()
    placa = placa.upper()
    now = datetime.now()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "UPDATE entries SET ingreso = $1 WHERE placa = $2 AND ingreso IS NULL AND salida IS NOT NULL RETURNING id, placa, nombre, categoria, destino, ingreso, salida, activo",
            now, placa,
        )
        if not row:
            raise HTTPException(status_code=404, detail="No hay registro de salida pendiente")
    return {
        "id": str(row["id"]),
        "placa": row["placa"],
        "nombre": row["nombre"],
        "categoria": row["categoria"],
        "destino": row["destino"],
        "ingreso": row["ingreso"].isoformat(),
        "salida": row["salida"].isoformat() if row["salida"] else None,
        "activo": row["activo"],
    }


@app.get("/api/stats")
async def get_stats():
    pool = get_db()
    async with pool.acquire() as conn:
        total = await conn.fetchval("SELECT COUNT(*) FROM entries")
        activos = await conn.fetchval("SELECT COUNT(*) FROM entries WHERE activo = TRUE")
        empleados = await conn.fetchval("SELECT COUNT(*) FROM entries WHERE categoria = 'Empleado'")
        visitantes = await conn.fetchval("SELECT COUNT(*) FROM entries WHERE categoria = 'Visitante'")
        residentes = await conn.fetchval("SELECT COUNT(*) FROM entries WHERE categoria = 'Residente'")
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
    pool = get_db()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT key, value FROM config WHERE key = $1", key)
    if not row:
        raise HTTPException(status_code=404, detail="Configuración no encontrada")
    return {"key": row["key"], "value": json.loads(row["value"])}


@app.put("/api/config/{key}")
async def update_config(key: str, config: ConfigUpdate):
    pool = get_db()
    async with pool.acquire() as conn:
        await conn.execute(
            "INSERT INTO config (key, value) VALUES ($1, $2::jsonb) ON CONFLICT (key) DO UPDATE SET value = $2::jsonb",
            key, json.dumps(config.value),
        )
    return {"key": key, "value": config.value}
