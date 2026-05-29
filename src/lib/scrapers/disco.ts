import { Product } from '@/types';
import { matchesBrand, calcDiscount, generateId } from '../utils';

const KNOWN_SKUS = [
  '660290','660362','661630','661650','663951','601812',
  '660289','660361','661629','661649',
];

const SEARCH_TERMS = [
  'bimbo', 'sorchantes', 'artesano', 'bimbo vital',
  'bauducco', 'visconti', 'marbella', 'campestre', 'fantastico',
  'precio lider', 'precio líder',
];

async function fetchSku(sku: string, BASE: string, superName: string, timestamp: string): Promise<Product | null> {
  try {
    const res = await fetch(
      `${BASE}/api/catalog_system/pub/products/search?fq=skuId:${sku}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
          'Referer': BASE,
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json().catch(() => []);
    if (!Array.isArray(data) || !data[0]) return null;
    const item = data[0];
    const name = item.productName || '';
    const brand = matchesBrand(name);
    if (!brand) return null;
    const offer = item.items?.[0]?.sellers?.[0]?.commertialOffer;
    const price = Number(offer?.Price || 0);
    if (!price || price < 5) return null;
    const listPrice = Number(offer?.ListPrice || 0);
    const regularPrice = listPrice > price ? listPrice : null;
    const id = generateId(name, superName.toLowerCase());
    return {
      id, name, brand, supermarket: superName,
      publishedPrice: price, regularPrice,
      offerPrice: regularPrice ? price : null,
      discount: calcDiscount(regularPrice, regularPrice ? price : null),
      pvpSugerido: null, gapPercent: null,
      url: item.link ? `${BASE}${item.link}` : `${BASE}/${item.linkText}/p`,
      imageUrl: item.items?.[0]?.images?.[0]?.imageUrl || '',
      scrapedAt: timestamp,
    };
  } catch { return null; }
}

async function scrapeStore(BASE: string, superName: string): Promise<Product[]> {
  const timestamp = new Date().toISOString();
  const seen = new Set<string>();
  const products: Product[] = [];

  const bySkus = await Promise.all(KNOWN_SKUS.map(s => fetchSku(s, BASE, superName, timestamp)));
  for (const p of bySkus) {
    if (p && !seen.has(p.id)) { seen.add(p.id); products.push(p); }
  }

  for (const term of SEARCH_TERMS) {
    try {
      const res = await fetch(
        `${BASE}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(term)}&_from=0&_to=49`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(8000),
        }
      );
      if (!res.ok) continue;
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) continue;
      const data = await res.json().catch(() => []);
      if (!Array.isArray(data)) continue;
      for (const item of data) {
        const name = item.productName || '';
        const brand = matchesBrand(name);
        if (!brand) continue;
        const offer = item.items?.[0]?.sellers?.[0]?.commertialOffer;
        const price = Number(offer?.Price || 0);
        if (!price || price < 5) continue;
        const listPrice = Number(offer?.ListPrice || 0);
        const regularPrice = listPrice > price ? listPrice : null;
        const id = generateId(name, superName.toLowerCase());
        if (seen.has(id)) continue;
        seen.add(id);
        products.push({
          id, name, brand, supermarket: superName,
          publishedPrice: price, regularPrice,
          offerPrice: regularPrice ? price : null,
          discount: calcDiscount(regularPrice, regularPrice ? price : null),
          pvpSugerido: null, gapPercent: null,
          url: item.link ? `${BASE}${item.link}` : '',
          imageUrl: item.items?.[0]?.images?.[0]?.imageUrl || '',
          scrapedAt: timestamp,
        });
      }
    } catch { continue; }
  }

  console.log(`[${superName.toUpperCase()}] Total: ${products.length} productos`);
  return products;
}

export async function scrapeDisco(): Promise<Product[]> {
  return scrapeStore('https://www.disco.com.uy', 'Disco');
}
