interface McpToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

interface McpToolExport {
  tools: McpToolDefinition[];
  callTool: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  meter?: { credits: number };
  cost?: Record<string, unknown>;
  provider?: string;
}

/**
 * Rick and Morty MCP — wraps the Rick and Morty API (free, no auth)
 *
 * API: https://rickandmortyapi.com
 *
 * Tools:
 * - search_characters: by name + filters (status, species, gender)
 * - get_character:     full character record by ID
 * - get_episode:       single episode by ID
 * - search_episodes:   by name or episode code (e.g. "S01E03")
 * - get_location:      single location by ID
 */


const BASE_URL = 'https://rickandmortyapi.com/api';

// ── Raw API types ────────────────────────────────────────────────────

interface RawCharacter {
  id: number;
  name: string;
  status: string;
  species: string;
  type: string;
  gender: string;
  origin: { name: string; url: string };
  location: { name: string; url: string };
  image: string;
  episode: string[];
  url: string;
  created: string;
}

interface RawEpisode {
  id: number;
  name: string;
  air_date: string;
  episode: string;
  characters: string[];
  url: string;
  created: string;
}

interface RawLocation {
  id: number;
  name: string;
  type: string;
  dimension: string;
  residents: string[];
  url: string;
  created: string;
}

interface Paginated<T> {
  info?: { count: number; pages: number; next: string | null; prev: string | null };
  results?: T[];
  error?: string;
}

// ── Helpers ──────────────────────────────────────────────────────────

function reqNum(args: Record<string, unknown>, key: string, example: string): number {
  const v = args[key];
  const n = typeof v === 'number' ? v : typeof v === 'string' ? Number(v) : NaN;
  if (!Number.isFinite(n)) {
    throw new Error(`Required argument "${key}" is missing or invalid. Pass a number like ${example}.`);
  }
  return n;
}

async function rmFetch<T>(path: string): Promise<T | { error: string }> {
  const res = await fetch(`${BASE_URL}${path}`);
  if (res.status === 404) return { error: 'not_found' };
  if (!res.ok) throw new Error(`Rick and Morty API error: ${res.status}`);
  return res.json() as Promise<T>;
}

function idFromUrl(url: string): number | null {
  const m = url.match(/\/(\d+)$/);
  return m ? Number(m[1]) : null;
}

function formatCharacter(c: RawCharacter) {
  return {
    id: c.id,
    name: c.name,
    status: c.status,
    species: c.species,
    type: c.type || null,
    gender: c.gender,
    origin: c.origin.name,
    location: c.location.name,
    image: c.image,
    episode_count: c.episode.length,
    episode_ids: c.episode.map(idFromUrl).filter((n): n is number => n !== null),
    url: c.url,
  };
}

function formatEpisode(e: RawEpisode) {
  return {
    id: e.id,
    name: e.name,
    code: e.episode,
    air_date: e.air_date,
    character_count: e.characters.length,
    character_ids: e.characters.map(idFromUrl).filter((n): n is number => n !== null),
    url: e.url,
  };
}

function formatLocation(l: RawLocation) {
  return {
    id: l.id,
    name: l.name,
    type: l.type,
    dimension: l.dimension,
    resident_count: l.residents.length,
    resident_ids: l.residents.map(idFromUrl).filter((n): n is number => n !== null),
    url: l.url,
  };
}

// ── Tool definitions ─────────────────────────────────────────────────

const tools: McpToolExport['tools'] = [
  {
    name: 'search_characters',
    description:
      'Search Rick and Morty characters by name with optional filters for status (alive/dead/unknown), species (Human/Alien/etc.), and gender. Returns up to 20 matching characters per page with status, species, origin, current location, and episode appearances.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Character name to search for (partial match, e.g., "rick", "beth")' },
        status: { type: 'string', description: 'Filter by status: "alive", "dead", or "unknown".' },
        species: { type: 'string', description: 'Filter by species (e.g., "Human", "Alien", "Mythological Creature").' },
        gender: { type: 'string', description: 'Filter by gender: "female", "male", "genderless", or "unknown".' },
        page: { type: 'number', description: 'Page number (1-based, default 1). API returns 20 per page.' },
      },
      required: [],
    },
  },
  {
    name: 'get_character',
    description:
      'Get a single Rick and Morty character by numeric ID. Returns name, status, species, origin, current location, episode appearances, and image URL.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Character ID (1-826+). Example: 1 = Rick Sanchez.' },
      },
      required: ['id'],
    },
  },
  {
    name: 'search_episodes',
    description:
      'Search Rick and Morty episodes by name or episode code (S01E03 style). Returns episode metadata including air date, character list, and ID.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Episode name to search for (partial match).' },
        episode: { type: 'string', description: 'Episode code (e.g., "S01E03").' },
        page: { type: 'number', description: 'Page number (1-based, default 1).' },
      },
      required: [],
    },
  },
  {
    name: 'get_episode',
    description:
      'Get a single Rick and Morty episode by numeric ID. Returns title, code (e.g. "S01E03"), air date, and the list of characters that appear.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Episode ID. Example: 1 = Pilot.' },
      },
      required: ['id'],
    },
  },
  {
    name: 'get_location',
    description:
      'Get a single Rick and Morty location/planet/dimension by ID. Returns name, type, dimension, and residents.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'number', description: 'Location ID. Example: 1 = Earth (C-137).' },
      },
      required: ['id'],
    },
  },
];

// ── Tool implementations ─────────────────────────────────────────────

async function searchCharacters(args: Record<string, unknown>) {
  const params = new URLSearchParams();
  if (typeof args.name === 'string') params.set('name', args.name);
  if (typeof args.status === 'string') params.set('status', args.status);
  if (typeof args.species === 'string') params.set('species', args.species);
  if (typeof args.gender === 'string') params.set('gender', args.gender);
  if (typeof args.page === 'number') params.set('page', String(args.page));

  const data = await rmFetch<Paginated<RawCharacter>>(`/character${params.toString() ? '?' + params : ''}`);
  if ('error' in data) {
    return { found: false, count: 0, characters: [], hint: 'No characters matched. Try a broader name search.' };
  }
  return {
    total: data.info?.count ?? 0,
    pages: data.info?.pages ?? 0,
    page: typeof args.page === 'number' ? args.page : 1,
    has_more: !!data.info?.next,
    characters: (data.results ?? []).map(formatCharacter),
  };
}

async function getCharacter(args: Record<string, unknown>) {
  const id = reqNum(args, 'id', '1 (Rick Sanchez)');
  const data = await rmFetch<RawCharacter>(`/character/${id}`);
  if ('error' in data) return { found: false, id, hint: 'Character not found. IDs are 1–826+.' };
  return { found: true, ...formatCharacter(data) };
}

async function searchEpisodes(args: Record<string, unknown>) {
  const params = new URLSearchParams();
  if (typeof args.name === 'string') params.set('name', args.name);
  if (typeof args.episode === 'string') params.set('episode', args.episode);
  if (typeof args.page === 'number') params.set('page', String(args.page));

  const data = await rmFetch<Paginated<RawEpisode>>(`/episode${params.toString() ? '?' + params : ''}`);
  if ('error' in data) {
    return { found: false, count: 0, episodes: [], hint: 'No episodes matched.' };
  }
  return {
    total: data.info?.count ?? 0,
    pages: data.info?.pages ?? 0,
    page: typeof args.page === 'number' ? args.page : 1,
    has_more: !!data.info?.next,
    episodes: (data.results ?? []).map(formatEpisode),
  };
}

async function getEpisode(args: Record<string, unknown>) {
  const id = reqNum(args, 'id', '1 (Pilot)');
  const data = await rmFetch<RawEpisode>(`/episode/${id}`);
  if ('error' in data) return { found: false, id, hint: 'Episode not found.' };
  return { found: true, ...formatEpisode(data) };
}

async function getLocation(args: Record<string, unknown>) {
  const id = reqNum(args, 'id', '1 (Earth C-137)');
  const data = await rmFetch<RawLocation>(`/location/${id}`);
  if ('error' in data) return { found: false, id, hint: 'Location not found.' };
  return { found: true, ...formatLocation(data) };
}

// ── callTool router ──────────────────────────────────────────────────

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case 'search_characters': return searchCharacters(args);
    case 'get_character':     return getCharacter(args);
    case 'search_episodes':   return searchEpisodes(args);
    case 'get_episode':       return getEpisode(args);
    case 'get_location':      return getLocation(args);
    default: throw new Error(`Unknown tool: ${name}`);
  }
}

export default { tools, callTool, meter: { credits: 1 } } satisfies McpToolExport;
