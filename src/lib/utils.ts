export const TARGET_BRANDS = [
  'Bimbo',
  'Artesano',
  'Bimbo Vital',
  'Los Sorchantes',
  'Tía Rosa',
  'Merienda Hit',
  'Rapiditas',
  'Nutrabien',
  'Salmas',
  'Maestro Cubano',
] as const;

export const SUPERMARKETS = ['Tienda Inglesa','Tata','Disco','El Dorado'] as const;

export const SUPERMARKET_COLORS: Record<string, string> = {
  'Tienda Inglesa': 'bg-red-100 text-red-800 border-red-200',
  'Tata':           'bg-orange-100 text-orange-800 border-orange-200',
  'Disco':          'bg-purple-100 text-purple-800 border-purple-200',
  'El Dorado':      'bg-yellow-100 text-yellow-800 border-yellow-200',
};

// Un término de búsqueda por marca — corto y preciso para que la API lo encuentre
export const BRAND_SEARCH_TERMS: Record<string, string[]> = {
  'Bimbo':          ['bimbo'],
  'Artesano':       ['artesano'],
  'Bimbo Vital':    ['bimbo vital'],
  'Los Sorchantes': ['sorchantes'],
  'Tía Rosa':       ['tia rosa', 'tía rosa'],
  'Merienda Hit':   ['merienda hit'],
  'Rapiditas':      ['rapiditas'],
  'Nutrabien':      ['nutrabien', 'nutra bien'],
  'Salmas':         ['salmas'],
  'Maestro Cubano': ['maestro cubano'],
};

export const BIMBO_OWN_BRANDS = new Set<string>(TARGET_BRANDS);

export type ProductCategory = 'Panes' | 'Galletitas' | 'Grisines y Tortillas' | 'Otro';
export const PRODUCT_CATEGORIES: ProductCategory[] = ['Panes', 'Galletitas', 'Grisines y Tortillas'];

export function detectCategory(name: string, brand?: string): ProductCategory {
  const n = (name + ' ' + (brand || '')).toLowerCase();
  if (brand === 'Maestro Cubano' || brand === 'Rapiditas') return 'Grisines y Tortillas';
  if (n.includes('maestro cubano') || n.includes('rapiditas') || n.includes('grissini') || n.includes('grissin') || n.includes('tortilla') || n.includes('palito')) return 'Grisines y Tortillas';
  if (brand === 'Tía Rosa' || brand === 'Merienda Hit' || brand === 'Nutrabien' || brand === 'Salmas') return 'Galletitas';
  if (n.includes('tia rosa') || n.includes('tía rosa') || n.includes('merienda hit') || n.includes('nutrabien') || n.includes('nutra bien') || n.includes('salmas')) return 'Galletitas';
  if (n.includes('galletita') || n.includes('galleta') || n.includes('cracker')) return 'Galletitas';
  if (brand === 'Bimbo' || brand === 'Artesano' || brand === 'Bimbo Vital' || brand === 'Los Sorchantes') return 'Panes';
  if (n.includes('pan ') || n.includes('lactal') || n.includes('molde') || n.includes('tortuga') || n.includes('hamburguesa') || n.includes('hot dog') || n.includes('hotdog') || n.includes('viena') || n.includes('sorchante') || n.includes('artesano') || n.includes('bimbo')) return 'Panes';
  return 'Otro';
}

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
