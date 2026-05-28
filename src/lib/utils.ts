export const TARGET_BRANDS = [
  // Grupo Bimbo
  'Bimbo', 'Los Sorchantes', 'Artesano', 'Tia Rosa', 'Nutrabien',
  'Rapiditas', 'Salmas', 'Merienda Hit', 'Takis',
  // Competencia pan
  'Bauducco', 'Fargo', 'Magnific', 'Maestro Cubano',
  'Marca Propia', 'Precio Líder',
] as const;

export type BreadCategory = 'Pan de Molde' | 'Pan de Tortuga' | 'Pan de Viena' | 'Otro';
export const BREAD_CATEGORIES: BreadCategory[] = ['Pan de Molde', 'Pan de Tortuga', 'Pan de Viena'];

// Todas las marcas del Grupo Bimbo monitoreadas
export const BIMBO_OWN_BRANDS = new Set([
  'Bimbo', 'Los Sorchantes', 'Artesano', 'Tia Rosa',
  'Nutrabien', 'Rapiditas', 'Salmas', 'Merienda Hit', 'Takis',
]);

export function detectCategory(name: string, brand?: string): BreadCategory {
  const n = (name + ' ' + (brand || '')).toLowerCase();
  if (n.includes('tortuga') || n.includes('hamburguesa') || n.includes('hot dog') ||
      n.includes('hotdog') || n.includes('perrito'))
    return 'Pan de Tortuga';
  if (n.includes('viena') || n.includes('vienés') || n.includes('vienes') ||
      n.includes('frances') || n.includes('francés') || n.includes('baguette') ||
      n.includes('sorchante') || n.includes('cubano') || n.includes('criollito') ||
      n.includes('pan franc'))
    return 'Pan de Viena';
  if (n.includes('lactal') || n.includes('molde') || n.includes('sandwich') ||
      n.includes('integral') || n.includes('blanco') || n.includes('artesano') ||
      n.includes('nutrabien') || n.includes('brioche') || n.includes('tia rosa') ||
      n.includes('tiarosa') || n.includes('bauducco') || n.includes('fargo') ||
      n.includes('magnific'))
    return 'Pan de Molde';
  if (n.includes('rapidita') || n.includes('salma') || n.includes('takis') ||
      n.includes('merienda hit') || n.includes('meriendahit'))
    return 'Otro';
  if (brand === 'Bimbo' || brand === 'Artesano' || brand === 'Nutrabien' ||
      brand === 'Tia Rosa' || brand === 'Bauducco' || brand === 'Fargo' ||
      brand === 'Magnific')
    return 'Pan de Molde';
  if (brand === 'Los Sorchantes' || brand === 'Maestro Cubano')
    return 'Pan de Viena';
  if (brand === 'Marca Propia' || brand === 'Precio Líder')
    return 'Pan de Molde';
  return 'Otro';
}

export const SUPERMARKETS = ['Tienda Inglesa','Tata','Disco','El Dorado'] as const;

export const SUPERMARKET_COLORS: Record<string, string> = {
  'Tienda Inglesa': 'bg-red-100 text-red-800 border-red-200',
  'Tata':           'bg-orange-100 text-orange-800 border-orange-200',
  'Disco':          'bg-purple-100 text-purple-800 border-purple-200',
  'El Dorado':      'bg-yellow-100 text-yellow-800 border-yellow-200',
};

// Un término de búsqueda por marca — corto y preciso para que la API lo encuentre
export const BRAND_SEARCH_TERMS: Record<string, string[]> = {
  'Los Sorchantes': ['sorchantes'],
  'Tia Rosa':       ['tia rosa'],
  'Bimbo':          ['bimbo'],
  'Rapiditas':      ['rapiditas'],
  'Artesano':       ['artesano'],
  'Maestro Cubano': ['maestro cubano'],
  'Merienda Hit':   ['merienda hit'],
  'Takis':          ['takis'],
  'Salmas':         ['salmas'],
  'Nutrabien':      ['nutrabien'],
  // Competencia
  'Bauducco':       ['bauducco'],
  'Fargo':          ['fargo'],
  'Magnific':       ['magnific'],
  'Marca Propia':   ['marca propia', 'precio lider', 'precio líder', 'seleccion', 'selección'],
  'Precio Líder':   ['precio lider', 'precio líder'],
};

export function matchesBrand(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [brand, terms] of Object.entries(BRAND_SEARCH_TERMS)) {
    if (terms.some(t => lower.includes(t.toLowerCase()))) return brand;
  }
  // Detección adicional por nombre de marca directa
  if (lower.includes('sorchante')) return 'Los Sorchantes';
  if (lower.includes('tia rosa') || lower.includes('tiarosa')) return 'Tia Rosa';
  if (lower.includes('bimbo')) return 'Bimbo';
  if (lower.includes('rapidita')) return 'Rapiditas';
  if (lower.includes('artesano')) return 'Artesano';
  if (lower.includes('maestro cubano') || lower.includes('maestrocubano')) return 'Maestro Cubano';
  if (lower.includes('merienda hit') || lower.includes('meriendahit')) return 'Merienda Hit';
  if (lower.includes('takis')) return 'Takis';
  if (lower.includes('salmas')) return 'Salmas';
  if (lower.includes('nutrabien') || lower.includes('nutra bien')) return 'Nutrabien';
  if (lower.includes('bauducco')) return 'Bauducco';
  if (lower.includes('fargo')) return 'Fargo';
  if (lower.includes('magnific')) return 'Magnific';
  if (lower.includes('precio lider') || lower.includes('precio líder')) return 'Precio Líder';
  if (lower.includes('marca propia') || lower.includes('seleccion') || lower.includes('selección')) return 'Marca Propia';
  return null;
}

export function parsePrice(text: string | number): number | null {
  if (typeof text === 'number') return isNaN(text) ? null : text;
  if (!text) return null;
  const cleaned = String(text).replace(/[^\d,\.]/g, '').replace(',', '.');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

export function calcDiscount(regular: number | null, offer: number | null): number | null {
  if (!regular || !offer || regular <= offer) return null;
  return Math.round(((regular - offer) / regular) * 100);
}

export function calcGap(pvp: number | null, published: number): number | null {
  if (!pvp || !published || pvp === 0) return null;
  return Math.round(((pvp - published) / pvp) * 100);
}

export function generateId(name: string, supermarket: string): string {
  return `${supermarket}-${name}`.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').slice(0, 100);
}

export function formatPrice(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return `$${n.toLocaleString('es-UY', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function formatPct(n: number | null | undefined): string {
  if (n === null || n === undefined) return '—';
  return `${n > 0 ? '+' : ''}${n}%`;
}
