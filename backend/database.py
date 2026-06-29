import os
import json
import asyncpg
from dotenv import load_dotenv

load_dotenv()

DSN = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/control_ingreso")

pool = None


async def connect_db():
    global pool
    pool = await asyncpg.create_pool(DSN, min_size=1, max_size=5)
    print("Conectado a PostgreSQL")


async def disconnect_db():
    global pool
    if pool:
        await pool.close()
        pool = None


def get_db():
    return pool
