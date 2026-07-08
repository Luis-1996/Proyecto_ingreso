import os
import aiosqlite

DB_PATH = os.getenv("SQLITE_PATH", os.path.join(os.path.dirname(__file__), "data", "control_ingreso.db"))

db = None


async def connect_db():
    global db
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    db = await aiosqlite.connect(DB_PATH)
    db.row_factory = aiosqlite.Row
    await db.execute("PRAGMA journal_mode=WAL")
    await db.execute("PRAGMA foreign_keys=ON")
    print(f"Conectado a SQLite: {DB_PATH}")


async def disconnect_db():
    global db
    if db:
        await db.close()
        db = None


def get_db():
    return db
