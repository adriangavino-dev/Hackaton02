// Mock server SOLO para desarrollo local. Implementa el contrato congelado de
// TropelCare Control API (indicaciones-backend.md) de forma deterministica para
// poder desarrollar y verificar el frontend sin el backend en vivo.
//
// NO es el entregable. Cuando tengas la API real, apunta VITE_API_BASE_URL a ella.
//
// Sin dependencias externas: usa solo modulos nativos de Node.
import { createServer } from 'node:http';

const PORT = Number(process.env.MOCK_PORT ?? 8787);
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? 'dev-admin-token';
const PASSWORD = process.env.TEAM_PASSWORD ?? 'password-del-equipo';
const EMAIL = 'operator@tuckersoft.com';

// ---- PRNG deterministico (mulberry32) ----
function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];
const pad = (n, width) => String(n).padStart(width, '0');

// ---- Enums ----
const SPECIES = ['BLOBITO', 'CHISPA', 'GRUNON', 'DORMILON', 'GLITCHY'];
const VITAL = ['ESTABLE', 'HAMBRIENTO', 'AGITADO', 'MUTANDO', 'CRITICO'];
const SIGNAL_TYPES = [
  'HAMBRE', 'ABANDONO', 'MUTACION', 'FUGA', 'CONFLICTO', 'REPRODUCCION_MASIVA', 'SENAL_CORRUPTA',
];
const SEVERITY = ['LEVE', 'MODERADO', 'GRAVE', 'CRITICO'];
const STATUS = ['RECIBIDA', 'PROCESANDO', 'ATENDIDA'];
const CLIMATE = ['PIXEL_FOREST', 'NEON_CAVE', 'CLOUD_AQUARIUM', 'RETRO_ARCADE'];
const COLOR_TOKENS = ['emerald', 'cyan', 'violet', 'amber', 'rose', 'sky', 'lime', 'fuchsia'];
const GUARDIANS = ['Ada', 'Linus', 'Grace', 'Alan', 'Hedy', 'Dennis', 'Margaret', 'Edsger'];
const NAME_ROOTS = [
  'Pixelin', 'Chispo', 'Grunko', 'Dormo', 'Glitchy', 'Bloop', 'Nebu', 'Zappy',
  'Mumu', 'Tato', 'Quark', 'Fizz', 'Wibble', 'Doodle', 'Sprocket', 'Bitsy',
];

// ---- Generacion deterministica por workspace ----
const workspaceCache = new Map();

function buildWorkspace(teamCode) {
  if (workspaceCache.has(teamCode)) return workspaceCache.get(teamCode);
  const rng = mulberry32(hashString(`${teamCode}|tropelcare|v1`));
  const baseTime = Date.parse('2026-06-22T15:00:00Z');

  // Sectores (12)
  const sectors = [];
  for (let i = 0; i < 12; i++) {
    const capacity = 15 + Math.floor(rng() * 20);
    const currentLoad = Math.floor(rng() * capacity);
    sectors.push({
      id: `sec_${pad(i + 1, 3)}`,
      sectorCode: `SEC-${pad(i + 1, 2)}`,
      name: sectorName(i, rng),
      climate: CLIMATE[i % CLIMATE.length],
      capacity,
      currentLoad,
      stabilityLevel: 40 + Math.floor(rng() * 60),
      updatedAt: new Date(baseTime - i * 3600_000).toISOString(),
    });
  }

  // Tropeles (120)
  const tropels = [];
  for (let i = 0; i < 120; i++) {
    const sector = sectors[Math.floor(rng() * sectors.length)];
    const species = pick(rng, SPECIES);
    tropels.push({
      id: `trp_${pad(i + 1, 3)}`,
      name: `${pick(rng, NAME_ROOTS)}-${pad(i + 1, 3)}`,
      species,
      vitalState: pick(rng, VITAL),
      energyLevel: Math.floor(rng() * 101),
      chaosIndex: Math.floor(rng() * 101),
      mutationStage: Math.floor(rng() * 6),
      guardianName: pick(rng, GUARDIANS),
      sector: { id: sector.id, name: sector.name, sectorCode: sector.sectorCode },
      createdAt: new Date(baseTime - (i + 50) * 3600_000).toISOString(),
      updatedAt: new Date(baseTime - i * 1800_000 - Math.floor(rng() * 1000_000)).toISOString(),
    });
  }

  // Senales (600). createdAt unico y decreciente para orden estable.
  const signals = [];
  for (let i = 0; i < 600; i++) {
    const tropel = tropels[Math.floor(rng() * tropels.length)];
    const createdAt = new Date(baseTime - i * 60_000 - Math.floor(rng() * 30_000)).toISOString();
    const status = pick(rng, STATUS);
    signals.push({
      id: `sig_${pad(i + 1, 4)}`,
      signalType: pick(rng, SIGNAL_TYPES),
      severity: pick(rng, SEVERITY),
      status,
      rawContent: rawContent(rng),
      tropel: { id: tropel.id, name: tropel.name, species: tropel.species },
      createdAt,
      updatedAt: createdAt,
    });
  }
  // Orden estable: createdAt DESC, id DESC.
  signals.sort((a, b) => cmpSignalDesc(a, b));

  // Story stages (8 por sector)
  const storiesBySector = new Map();
  for (const sector of sectors) {
    const stages = [];
    for (let order = 0; order < 8; order++) {
      stages.push({
        id: `stage_${sector.id}_${order}`,
        order,
        title: stageTitle(order),
        narrative: stageNarrative(sector, order, rng),
        dominantEvent: pick(rng, SIGNAL_TYPES),
        metrics: {
          stability: clamp(sector.stabilityLevel + Math.floor((rng() - 0.5) * 30), 0, 100),
          energy: Math.floor(rng() * 101),
          alerts: Math.floor(rng() * 12),
        },
        assetKey: `${sector.climate.toLowerCase()}-${stagePhase(order)}`,
        colorToken: COLOR_TOKENS[order % COLOR_TOKENS.length],
        progress: Number((order / 7).toFixed(4)),
      });
    }
    storiesBySector.set(sector.id, stages);
  }

  const ws = { teamCode, sectors, tropels, signals, storiesBySector, scenario: emptyScenario() };
  workspaceCache.set(teamCode, ws);
  return ws;
}

function emptyScenario() {
  return { delayMs: 0, failNextRead: false, failNextPatch: false };
}

function sectorName(i, rng) {
  const dirs = ['Norte', 'Sur', 'Este', 'Oeste', 'Central', 'Profundo'];
  const places = ['Bosque', 'Caverna', 'Acuario', 'Arcade', 'Cresta', 'Valle'];
  return `${pick(rng, places)} ${dirs[i % dirs.length]}`;
}
function rawContent(rng) {
  const frags = [
    'Patron de energia por debajo del umbral',
    'Pico de caos detectado en el sector',
    'Mutacion espontanea registrada',
    'Senal corrupta intermitente',
    'Aumento subito de poblacion',
    'Guardian sin respuesta',
    'Fuga parcial contenida',
  ];
  return pick(rng, frags);
}
function stageTitle(order) {
  return [
    'Primer pulso', 'Despertar', 'Tension creciente', 'Punto de quiebre',
    'Cascada', 'Contencion', 'Estabilizacion', 'Nuevo equilibrio',
  ][order];
}
function stagePhase(order) {
  return ['dawn', 'rise', 'tension', 'peak', 'cascade', 'hold', 'calm', 'dusk'][order];
}
function stageNarrative(sector, order, rng) {
  const moods = [
    'La actividad despierta entre destellos',
    'Las criaturas se agitan sin causa aparente',
    'El sector vibra con una energia inusual',
    'Todo converge hacia un instante critico',
    'Las alertas se multiplican en cadena',
    'Los operadores recuperan el control',
    'La calma regresa lentamente',
    'Un nuevo orden emerge del caos',
  ];
  return `${moods[order]} en ${sector.name}. ${pick(rng, [
    'Los sensores confirman el cambio.',
    'El indice de estabilidad responde.',
    'La narrativa del Tropel continua.',
  ])}`;
}
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function cmpSignalDesc(a, b) {
  if (a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
  return a.id < b.id ? 1 : -1;
}

// ---- Auth (token opaco para dev, no JWT firmado) ----
function makeToken(teamCode) {
  const payload = { workspaceId: teamCode, teamCode, exp: Date.now() + 4 * 3600_000 };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}
function readToken(req) {
  const auth = req.headers['authorization'];
  if (!auth || !auth.startsWith('Bearer ')) return null;
  try {
    const payload = JSON.parse(Buffer.from(auth.slice(7), 'base64url').toString('utf8'));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

// ---- Cursor opaco ----
function encodeCursor(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}
function decodeCursor(cursor) {
  try {
    return JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}
function filterHash(parts) {
  return hashString(parts.join('|')).toString(36);
}

// ---- HTTP helpers ----
function send(res, status, body, extraHeaders = {}) {
  const json = body === undefined ? '' : JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Admin-Token',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
    ...extraHeaders,
  });
  res.end(json);
}
function apiError(res, status, code, message, path, details) {
  send(res, status, {
    error: code,
    message,
    timestamp: new Date().toISOString(),
    path,
    ...(details ? { details } : {}),
  });
}
function readBody(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => (data += c));
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : {});
      } catch {
        resolve(null);
      }
    });
  });
}
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// Consume el escenario (delay + fallo) una sola vez en lecturas.
async function applyReadScenario(ws, res, path) {
  const sc = ws.scenario;
  if (sc.delayMs > 0) await delay(sc.delayMs);
  if (sc.failNextRead) {
    ws.scenario = emptyScenario();
    apiError(res, 500, 'INTERNAL_ERROR', 'Fallo inducido (escenario docente).', path);
    return true;
  }
  if (sc.delayMs > 0) ws.scenario = { ...sc, delayMs: 0 };
  return false;
}

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const path = url.pathname;
  const method = req.method ?? 'GET';

  if (method === 'OPTIONS') return send(res, 204, undefined);

  // Health
  if (path === '/api/v1/health') return send(res, 200, { status: 'ok' });
  if (path === '/api/v1/ready') return send(res, 200, { status: 'ready' });

  // Admin (escenario / reset)
  if (path.startsWith('/api/v1/admin/')) {
    if (req.headers['x-admin-token'] !== ADMIN_TOKEN) {
      return apiError(res, 401, 'UNAUTHORIZED', 'Admin token invalido.', path);
    }
    const m = path.match(/^\/api\/v1\/admin\/workspaces\/([^/]+)\/(reset|scenario)$/);
    if (m && method === 'POST') {
      const ws = buildWorkspace(m[1]);
      if (m[2] === 'reset') {
        workspaceCache.delete(m[1]);
        return send(res, 200, { ok: true, teamCode: m[1] });
      }
      const body = await readBody(req);
      if (body === null) return apiError(res, 400, 'VALIDATION_ERROR', 'Body invalido.', path);
      if (body.clear) {
        ws.scenario = emptyScenario();
      } else {
        ws.scenario = {
          delayMs: clamp(Number(body.delayMs ?? 0), 0, 3000),
          failNextRead: Boolean(body.failNextRead),
          failNextPatch: Boolean(body.failNextPatch),
        };
      }
      return send(res, 200, { ok: true, scenario: ws.scenario });
    }
    return apiError(res, 404, 'NOT_FOUND', 'Ruta admin no encontrada.', path);
  }

  // Login (publico)
  if (path === '/api/v1/auth/login' && method === 'POST') {
    const body = await readBody(req);
    if (!body || typeof body.teamCode !== 'string') {
      return apiError(res, 400, 'VALIDATION_ERROR', 'teamCode requerido.', path);
    }
    if (!/^TEAM-\d{3}$/.test(body.teamCode) || body.email !== EMAIL || body.password !== PASSWORD) {
      return apiError(res, 401, 'UNAUTHORIZED', 'Credenciales invalidas.', path);
    }
    return send(res, 200, {
      token: makeToken(body.teamCode),
      expiresAt: new Date(Date.now() + 4 * 3600_000).toISOString(),
      user: {
        id: 'usr_001',
        displayName: 'Operator 1',
        email: EMAIL,
        teamCode: body.teamCode,
        role: 'OPERATOR',
      },
    });
  }

  // A partir de aqui todo requiere JWT.
  const auth = readToken(req);
  if (!auth) return apiError(res, 401, 'UNAUTHORIZED', 'Token requerido o expirado.', path);
  const ws = buildWorkspace(auth.teamCode);

  if (path === '/api/v1/auth/me' && method === 'GET') {
    return send(res, 200, {
      id: 'usr_001',
      displayName: 'Operator 1',
      email: EMAIL,
      teamCode: auth.teamCode,
      role: 'OPERATOR',
    });
  }

  if (path === '/api/v1/dashboard/summary' && method === 'GET') {
    if (await applyReadScenario(ws, res, path)) return;
    const criticalTropels = ws.tropels.filter((t) => t.vitalState === 'CRITICO').length;
    const openSignals = ws.signals.filter((s) => s.status !== 'ATENDIDA').length;
    const signalsBySeverity = { LEVE: 0, MODERADO: 0, GRAVE: 0, CRITICO: 0 };
    for (const s of ws.signals) signalsBySeverity[s.severity]++;
    const stabilityAvg = Math.round(
      ws.sectors.reduce((acc, s) => acc + s.stabilityLevel, 0) / ws.sectors.length,
    );
    return send(res, 200, {
      totalTropels: ws.tropels.length,
      criticalTropels,
      openSignals,
      sectorStabilityAvg: stabilityAvg,
      signalsBySeverity,
      generatedAt: new Date().toISOString(),
    });
  }

  // Tropeles
  if (path === '/api/v1/tropels' && method === 'GET') {
    if (await applyReadScenario(ws, res, path)) return;
    return handleTropels(ws, url, res, path);
  }
  const trpDetail = path.match(/^\/api\/v1\/tropels\/([^/]+)$/);
  if (trpDetail && method === 'GET') {
    if (await applyReadScenario(ws, res, path)) return;
    const t = ws.tropels.find((x) => x.id === trpDetail[1]);
    if (!t) return apiError(res, 404, 'NOT_FOUND', 'Tropel no encontrado.', path);
    return send(res, 200, t);
  }

  // Feed de senales
  if (path === '/api/v1/signals/feed' && method === 'GET') {
    if (await applyReadScenario(ws, res, path)) return;
    return handleFeed(ws, url, res, path);
  }
  const sigStatus = path.match(/^\/api\/v1\/signals\/([^/]+)\/status$/);
  if (sigStatus && method === 'PATCH') {
    return handlePatch(ws, sigStatus[1], req, res, path);
  }
  const sigDetail = path.match(/^\/api\/v1\/signals\/([^/]+)$/);
  if (sigDetail && method === 'GET') {
    if (await applyReadScenario(ws, res, path)) return;
    const s = ws.signals.find((x) => x.id === sigDetail[1]);
    if (!s) return apiError(res, 404, 'NOT_FOUND', 'Senal no encontrada.', path);
    return send(res, 200, s);
  }

  // Sectores
  if (path === '/api/v1/sectors' && method === 'GET') {
    if (await applyReadScenario(ws, res, path)) return;
    return send(res, 200, {
      items: ws.sectors.map((s) => ({
        id: s.id,
        sectorCode: s.sectorCode,
        name: s.name,
        climate: s.climate,
        capacity: s.capacity,
        currentLoad: s.currentLoad,
        stabilityLevel: s.stabilityLevel,
      })),
    });
  }
  const story = path.match(/^\/api\/v1\/sectors\/([^/]+)\/story$/);
  if (story && method === 'GET') {
    if (await applyReadScenario(ws, res, path)) return;
    const sector = ws.sectors.find((s) => s.id === story[1]);
    if (!sector) return apiError(res, 404, 'NOT_FOUND', 'Sector no encontrado.', path);
    return send(res, 200, {
      sector: { id: sector.id, name: sector.name, climate: sector.climate },
      stages: ws.storiesBySector.get(sector.id),
    });
  }

  return apiError(res, 404, 'NOT_FOUND', 'Ruta no encontrada.', path);
});

function handleTropels(ws, url, res, path) {
  const page = Number(url.searchParams.get('page') ?? '0');
  const sizeRaw = Number(url.searchParams.get('size') ?? '20');
  const species = url.searchParams.get('species') ?? '';
  const vitalState = url.searchParams.get('vitalState') ?? '';
  const sectorId = url.searchParams.get('sectorId') ?? '';
  const q = (url.searchParams.get('q') ?? '').trim();
  const sort = url.searchParams.get('sort') ?? 'updatedAt,desc';

  if (!Number.isInteger(page) || page < 0) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'Parametro page invalido.', path);
  }
  if (![10, 20, 50].includes(sizeRaw)) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'Parametro size invalido.', path);
  }
  if (q.length > 80) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'q excede 80 caracteres.', path);
  }
  if (!['name,asc', 'updatedAt,desc', 'chaosIndex,desc'].includes(sort)) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'Parametro sort invalido.', path);
  }
  if (species && !SPECIES.includes(species)) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'species invalido.', path);
  }
  if (vitalState && !VITAL.includes(vitalState)) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'vitalState invalido.', path);
  }

  let list = ws.tropels.filter((t) => {
    if (species && t.species !== species) return false;
    if (vitalState && t.vitalState !== vitalState) return false;
    if (sectorId && t.sector.id !== sectorId) return false;
    if (q && !t.name.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  list = list.slice().sort((a, b) => {
    switch (sort) {
      case 'name,asc':
        return a.name.localeCompare(b.name);
      case 'chaosIndex,desc':
        return b.chaosIndex - a.chaosIndex || (a.id < b.id ? 1 : -1);
      case 'updatedAt,desc':
      default:
        return a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : a.id < b.id ? 1 : -1;
    }
  });

  const totalElements = list.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / sizeRaw));
  const start = page * sizeRaw;
  const content = list.slice(start, start + sizeRaw);
  return send(res, 200, { content, totalElements, totalPages, currentPage: page, size: sizeRaw });
}

function handleFeed(ws, url, res, path) {
  const cursor = url.searchParams.get('cursor');
  const limitRaw = Number(url.searchParams.get('limit') ?? '15');
  const signalType = url.searchParams.get('signalType') ?? '';
  const severity = url.searchParams.get('severity') ?? '';
  const status = url.searchParams.get('status') ?? '';
  const q = (url.searchParams.get('q') ?? '').trim();

  if (!Number.isInteger(limitRaw) || limitRaw < 1 || limitRaw > 30) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'limit invalido (1-30).', path);
  }
  const fh = filterHash([signalType, severity, status, q.toLowerCase()]);

  let after = null;
  if (cursor) {
    const decoded = decodeCursor(cursor);
    if (!decoded || decoded.fh !== fh) {
      return apiError(res, 400, 'VALIDATION_ERROR', 'Cursor invalido para estos filtros.', path);
    }
    after = decoded;
  }

  const filtered = ws.signals.filter((s) => {
    if (signalType && s.signalType !== signalType) return false;
    if (severity && s.severity !== severity) return false;
    if (status && s.status !== status) return false;
    if (q && !s.rawContent.toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });
  // Ya estan ordenadas createdAt DESC, id DESC.

  let startIdx = 0;
  if (after) {
    startIdx = filtered.findIndex(
      (s) => cmpSignalDesc(s, { createdAt: after.createdAt, id: after.id }) > 0,
    );
    if (startIdx === -1) startIdx = filtered.length;
  }

  const slice = filtered.slice(startIdx, startIdx + limitRaw);
  const last = slice[slice.length - 1];
  const hasMore = startIdx + limitRaw < filtered.length;
  const nextCursor =
    hasMore && last ? encodeCursor({ createdAt: last.createdAt, id: last.id, fh }) : null;

  return send(res, 200, {
    items: slice,
    nextCursor,
    hasMore,
    totalEstimate: filtered.length,
  });
}

async function handlePatch(ws, id, req, res, path) {
  const sc = ws.scenario;
  if (sc.delayMs > 0) await delay(sc.delayMs);
  if (sc.failNextPatch) {
    ws.scenario = emptyScenario();
    return apiError(res, 500, 'INTERNAL_ERROR', 'Fallo inducido en PATCH (escenario).', path);
  }
  const body = await readBody(req);
  if (!body || (body.status !== 'PROCESANDO' && body.status !== 'ATENDIDA')) {
    return apiError(res, 400, 'VALIDATION_ERROR', 'status debe ser PROCESANDO o ATENDIDA.', path);
  }
  const signal = ws.signals.find((s) => s.id === id);
  if (!signal) return apiError(res, 404, 'NOT_FOUND', 'Senal no encontrada.', path);
  signal.status = body.status;
  signal.updatedAt = new Date().toISOString();
  return send(res, 200, signal);
}

server.listen(PORT, () => {
  console.log(`[mock] TropelCare Control API en http://localhost:${PORT}/api/v1`);
  console.log(`[mock] Login: TEAM-0XX / ${EMAIL} / ${PASSWORD}`);
});
