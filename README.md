# Control de Ingreso

Aplicación minimalista para registro de entrada de empleados, visitantes y residentes.

## Stack

- **Backend:** Python / FastAPI + MongoDB (Motor)
- **Frontend:** Next.js + TypeScript + Tailwind CSS + shadcn/ui

## Requisitos

- Python 3.10+
- Node.js 18+
- MongoDB (local o remoto)

## Inicio rápido

```bash
# Instalar dependencias
cd backend && pip install -r requirements.txt && cd ..
cd frontend && npm install && cd ..

# Ejecutar ambos servicios
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000

## Estructura

```
├── backend/                # FastAPI + MongoDB
│   ├── main.py             # API endpoints
│   ├── models.py           # Pydantic models
│   ├── database.py         # Conexión MongoDB
│   └── .env
├── frontend/               # Next.js + shadcn/ui
│   ├── pages/
│   │   ├── ingreso.tsx     # Formulario + lista activa
│   │   ├── empleados.tsx   # Filtro por categoría
│   │   ├── visitantes.tsx
│   │   ├── residentes.tsx
│   │   └── configuracion.tsx  # Gestionar opciones
│   ├── components/
│   │   ├── EntryForm.tsx   # Formulario con selects
│   │   ├── EntryList.tsx   # Tabla de ingresos
│   │   ├── CategoryPage.tsx # Página filtrada reutilizable
│   │   ├── Layout.tsx      # Navbar + menú responsive
│   │   └── ui/             # Componentes shadcn
│   └── lib/
│       ├── api.ts          # Cliente API tipado
│       └── utils.ts        # cn() utility
└── package.json            # Script raíz (npm run dev)
```

## API

| Método | Ruta                          | Descripción               |
|--------|-------------------------------|---------------------------|
| POST   | `/api/entries`                | Crear ingreso             |
| GET    | `/api/entries`                | Listar (filtro: activo, categoria) |
| GET    | `/api/entries/{id}`           | Obtener ingreso           |
| PUT    | `/api/entries/{id}/salida`    | Registrar salida          |
| GET    | `/api/stats`                  | Estadísticas              |
| GET    | `/api/config/{key}`           | Obtener config (categorias, destinos) |
| PUT    | `/api/config/{key}`           | Actualizar config         |
