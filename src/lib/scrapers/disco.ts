import { Product } from '@/types';
import { matchesBrand, calcDiscount, generateId, BRAND_SEARCH_TERMS } from '../utils';

export async function scrapeDisco(): Promise<Product[]> {
  const products: Product[] = [];
  const timestamp = new Date().toISOString();
  const seen = new Set<string>();
  const BASE = 'https://www.disco.com.uy';

  for (const [brand, terms] of Object.entries(BRAND_SEARCH_TERMS)) {
    for (const term of terms) {
      try {
        // Disco es VTEX - API directa
        const apiUrl = `${BASE}/api/catalog_system/pub/products/search/${encodeURIComponent(term)}?_from=0&_to=29`;
        const res = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Referer': BASE,
          },
          signal: AbortSignal.timeout(20000),
        });

        if (!res.ok) {
          // Probar URL alternativa
          const alt = `${BASE}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(term)}&_from=0&_to=29`;
          const res2 = await fetch(alt, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
            signal: AbortSignal.timeout(20000),
          });
          if (!res2.ok) continue;
          const data2 = await res2.json().catch(() => []);
          processVTEX(data2, 'Disco', BASE, timestamp, seen, products);
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        const data = await res.json().catch(() => []);
        processVTEX(data, 'Disco', BASE, timestamp, seen, products);
        await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
        console.error(`[DISCO] Error "${term}":`, e);
      }
    }
  }
  return products;
}

function processVTEX(data: any[], supermarket: string, base: string, timestamp: string, seen: Set<string>, products: Product[]) {
  if (!Array.isArray(data)) return;
  for (const item of data) {
    const name = item.productName || item.name || '';
    const detectedBrand = matchesBrand(name);
    if (!detectedBrand) continue;
    const sellers = item.items?.[0]?.sellers;
    if (!sellers?.length) continue;
    const offer = sellers[0]?.commertialOffer;
    if (!offer) continue;
    const publishedPrice = Number(offer.Price || offer.spotPrice || 0);
    if (!publishedPrice || publishedPrice < 5) continue;
    const regularPrice = offer.ListPrice && Number(offer.ListPrice) > publishedPrice ? Number(offer.ListPrice) : null;
    const offerPrice = regularPrice ? publishedPrice : null;
    const id = generateId(name, supermarket.toLowerCase().replace(/\s/g, '-'));
    if (seen.has(id)) continue;
    seen.add(id);
    products.push({
      id, name, brand: detectedBrand, supermarket,
      publishedPrice, regularPrice, offerPrice,
      discount: calcDiscount(regularPrice, offerPrice),
      pvpSugerido: null, gapPercent: null,
      url: item.link || `${base}/${item.linkText}/p`,
      imageUrl: item.items?.[0]?.images?.[0]?.imageUrl || '',
      scrapedAt: timestamp,
    });
  }
}
