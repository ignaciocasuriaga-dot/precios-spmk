export const TARGET_BRANDS = [
  'Los Sorchantes','Tia Rosa','Bimbo','Rapiditas','Artesano',
  'Maestro Cubano','Merienda Hit','Takis','Salmas','Nutrabien',
] as const;

export const SUPERMARKETS = ['Tienda Inglesa','Tata','Disco','El Dorado'] as const;

export const SUPERMARKET_COLORS: Record<string, string> = {
  'Tienda Inglesa': 'bg-red-100 text-red-800 border-red-200',
  'Tata':           'bg-orange-100 text-orange-800 border-orange-200',
  'Disco':          'bg-purple-100 text-purple-800 border-purple-200',
  'El Dorado':      'bg-yellow-100 text-yellow-800 border-yellow-200',
};

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
};

export function matchesBrand(text: string): string | null {
  const lower = text.toLowerCase();
  for (const [brand, terms] of Object.entries(BRAND_SEARCH_TERMS)) {
    if (terms.some(t => lower.includes(t))) return brand;
  }
  return null;
}

export function parsePrice(text: string): number | null {
  if (!text) return null;
  const cleaned = text.replace(/[^\d,\.]/g, '').replace(',', '.');
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
