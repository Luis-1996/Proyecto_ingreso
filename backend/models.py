from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class EntryCreate(BaseModel):
    placa: str = Field(..., max_length=20)
    nombre: str = Field(..., max_length=100)
    categoria: str = Field(..., max_length=50)
    destino: str = Field(..., max_length=200)


class Entry(BaseModel):
    id: Optional[str] = None
    placa: str
    nombre: str
    categoria: str
    destino: str
    ingreso: datetime = Field(default_factory=datetime.now)
    salida: Optional[datetime] = None
    activo: bool = True


class ConfigUpdate(BaseModel):
    value: list[str]


class PersonaCreate(BaseModel):
    placa: str = Field(..., max_length=20)
    nombre: str = Field(..., max_length=100)
    categoria: str = Field(..., max_length=50)
    destino: str = Field(default="", max_length=200)


class Persona(BaseModel):
    id: Optional[str] = None
    placa: str
    nombre: str
    categoria: str
    destino: str = ""
