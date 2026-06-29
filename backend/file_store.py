import json
import os
import asyncio
import uuid
from datetime import datetime

DATA_FILE = os.path.join(os.path.dirname(__file__), "data.json")

_lock = asyncio.Lock()


def _load():
    if not os.path.exists(DATA_FILE):
        return {"entries": [], "config": []}
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def _save(data):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, default=str)


class FileCollection:
    def __init__(self, name):
        self.name = name

    async def find(self, filtro=None):
        filtro = filtro or {}
        async with _lock:
            data = _load()
            items = data.get(self.name, [])
            result = []
            for item in items:
                match = True
                for k, v in filtro.items():
                    if k == "_id":
                        if str(item.get("_id")) != str(v):
                            match = False
                    elif item.get(k) != v:
                        match = False
                if match:
                    result.append(item)
            return result

    async def find_one(self, filtro):
        items = await self.find(filtro)
        return items[0] if items else None

    async def insert_one(self, doc):
        doc = dict(doc)
        doc["_id"] = str(uuid.uuid4())
        async with _lock:
            data = _load()
            data.setdefault(self.name, []).append(doc)
            _save(data)
        return type("obj", (), {"inserted_id": doc["_id"]})()

    async def update_one(self, filtro, update):
        async with _lock:
            data = _load()
            items = data.get(self.name, [])
            modified = 0
            for item in items:
                match = True
                for k, v in filtro.items():
                    if k == "_id":
                        if str(item.get("_id")) != str(v):
                            match = False
                            break
                    elif item.get(k) != v:
                        match = False
                        break
                if match:
                    for op, fields in update.items():
                        if op == "$set":
                            item.update(fields)
                    modified += 1
            _save(data)
            return type("obj", (), {"modified_count": modified, "matched_count": modified})()

    async def insert_many(self, docs):
        for doc in docs:
            await self.insert_one(doc)

    async def count_documents(self, filtro=None):
        items = await self.find(filtro)
        return len(items)

    def find_one_and_update(self, filtro, update):
        class FakeCursor:
            def sort(self, *args, **kwargs):
                return self

            def __aiter__(self):
                return self

            async def __anext__(self):
                raise StopAsyncIteration

        return FakeCursor()


class FileDB:
    def __init__(self):
        self.entries = FileCollection("entries")
        self.config = FileCollection("config")
        self.personas = FileCollection("personas")
