import { Product } from '@/types';
import { matchesBrand, calcDiscount, generateId, BRAND_SEARCH_TERMS } from '../utils';

export async function scrapeDisco(): Promise<Product[]> {
  const products: Product[] = [];
  const timestamp = new Date().toISOString();
  const seen = new Set<string>();
  const BASE = 'https://www.disco.com.uy';

  for (const terms of Object.values(BRAND_SEARCH_TERMS)) {
    const term = terms[0];
    try {
      const res = await fetch(`${BASE}/api/catalog_system/pub/products/search/${encodeURIComponent(term)}?_from=0&_to=19`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PrecioUY/1.0)', 'Accept': 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const data: any[] = await res.json().catch(() => []);
      if (!Array.isArray(data)) continue;

      for (const item of data) {
        const name = item.productName || '';
        const brand = matchesBrand(name);
        if (!brand) continue;
        const offer = item.items?.[0]?.sellers?.[0]?.commertialOffer;
        if (!offer) continue;
        const publishedPrice = offer.Price || offer.spotPrice;
        if (!publishedPrice || publishedPrice < 10) continue;
        const regularPrice = offer.ListPrice > publishedPrice ? offer.ListPrice : null;
        const offerPrice = regularPrice ? publishedPrice : null;
        const id = generateId(name, 'disco');
        if (seen.has(id)) continue;
        seen.add(id);
        products.push({ id, name, brand, supermarket: 'Disco', publishedPrice, regularPrice, offerPrice, discount: calcDiscount(regularPrice, offerPrice), pvpSugerido: null, gapPercent: null, url: `${BASE}/${item.linkText}/p`, imageUrl: item.items?.[0]?.images?.[0]?.imageUrl || '', scrapedAt: timestamp });
      }
      await new Promise(r => setTimeout(r, 1200));
    } catch (e) { console.error('[DISCO]', term, e); }
  }
  return products;
}
