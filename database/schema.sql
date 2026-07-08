-- SQLite Schema for Control de Ingreso
-- This is auto-created by the backend on startup,
-- this file is for reference/documentation only.

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
