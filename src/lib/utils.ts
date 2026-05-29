export const TARGET_BRANDS = [
  // Grupo Bimbo
  'Bimbo', 'Artesano', 'Bimbo Vital', 'Los Sorchantes',
  // Competencia Pan de Molde
  'Bauducco', 'Visconti', 'Sanosinharina', 'Marbella', 'Glu', 'Campestre', 'Fantastico',
  // Competencia Pan de Tortuga/Viena
  'Glu Free', 'Pagnifique',
  // Marcas propias de cadenas
  'Precio Líder', 'Ta-Ta', 'Tienda Inglesa',
] as const;

export type BreadCategory = 'Pan de Molde' | 'Pan de Tortuga' | 'Pan de Viena' | 'Otro';
export const BREAD_CATEGORIES: BreadCategory[] = ['Pan de Molde', 'Pan de Tortuga', 'Pan de Viena'];

export const BIMBO_OWN_BRANDS = new Set([
  'Bimbo', 'Artesano', 'Bimbo Vital', 'Los Sorchantes',
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
  if (n.includes('glu free') || n.includes('gluten free'))
    return 'Pan de Tortuga';
  if (n.includes('pagnifique'))
    return 'Pan de Tortuga';
  if (n.includes('lactal') || n.includes('molde') || n.includes('sandwich') ||
      n.includes('integral') || n.includes('blanco') || n.includes('artesano') ||
      n.includes('brioche') || n.includes('bauducco') || n.includes('visconti') ||
      n.includes('marbella') || n.includes('campestre') || n.includes('fantastico') ||
      n.includes('fantástico') || n.includes('vital') || n.includes('lacteado') ||
      n.includes('sin gluten') || n.includes('sanosinharina'))
    return 'Pan de Molde';
  // Brand-based fallback
  if (brand === 'Bimbo' || brand === 'Artesano' || brand === 'Bimbo Vital' ||
      brand === 'Bauducco' || brand === 'Visconti' || brand === 'Marbella' ||
      brand === 'Campestre' || brand === 'Fantastico' || brand === 'Glu' ||
      brand === 'Sanosinharina')
    return 'Pan de Molde';
  if (brand === 'Los Sorchantes')
    return 'Pan de Viena';
  if (brand === 'Glu Free' || brand === 'Pagnifique')
    return 'Pan de Tortuga';
  if (brand === 'Precio Líder' || brand === 'Ta-Ta' || brand === 'Tienda Inglesa')
    return 'Pan de Molde';
  return 'Otro';
}

export const SUPERMARKETS = ['Tienda Inglesa', 'Tata', 'Disco', 'El Dorado'] as const;

export const SUPERMARKET_COLORS: Record<string, string> = {
  'Tienda Inglesa': 'bg-red-100 text-red-800 border-red-200',
  'Tata':           'bg-orange-100 text-orange-800 border-orange-200',
  'Disco':          'bg-purple-100 text-purple-800 border-purple-200',
  'El Dorado':      'bg-yellow-100 text-yellow-800 border-yellow-200',
};

export const BRAND_SEARCH_TERMS: Record<string, string[]> = {
  'Bimbo':          ['bimbo'],
  'Artesano':       ['artesano'],
  'Bimbo Vital':    ['bimbo vital'],
  'Los Sorchantes': ['sorchantes'],
  'Bauducco':       ['bauducco'],
  'Visconti':       ['visconti'],
  'Sanosinharina':  ['sanosinharina', 'sano sin harina'],
  'Marbella':       ['marbella'],
  'Glu':            ['pan glu', 'glu sin gluten'],
  'Glu Free':       ['glu free'],
  'Campestre':      ['campestre'],
  'Fantastico':     ['fantastico', 'fantástico'],
  'Pagnifique':     ['pagnifique'],
  'Precio Líder':   ['precio lider', 'precio líder'],
  'Ta-Ta':          ['ta-ta'],
};

export function matchesBrand(text: string): string | null {
  if (!text) return null;
  const lower = text.toLowerCase();
  for (const [brand, terms] of Object.entries(BRAND_SEARCH_TERMS)) {
    if (terms.some(t => lower.includes(t.toLowerCase()))) return brand;
  }
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
