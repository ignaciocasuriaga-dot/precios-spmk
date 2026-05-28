import { Product } from '@/types';
import { matchesBrand, parsePrice, generateId, BRAND_SEARCH_TERMS } from '../utils';

export async function scrapeElDorado(): Promise<Product[]> {
  const products: Product[] = [];
  const timestamp = new Date().toISOString();
  const seen = new Set<string>();
  const BASE = 'https://www.eldorado.com.uy';

  for (const terms of Object.values(BRAND_SEARCH_TERMS)) {
    const term = terms[0];
    try {
      const res = await fetch(`${BASE}/busqueda?q=${encodeURIComponent(term)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PrecioUY/1.0)', 'Accept': 'text/html' },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const html = await res.text();

      const nameMatches = [...html.matchAll(/class="[^"]*(?:title|name|producto)[^"]*"[^>]*>([^<]{4,80})</gi)];
      const priceMatches = [...html.matchAll(/\$\s*([\d\.,]{3,})/g)];

      for (let i = 0; i < Math.min(nameMatches.length, priceMatches.length); i++) {
        const name = nameMatches[i][1].trim();
        const brand = matchesBrand(name);
        if (!brand) continue;
        const publishedPrice = parsePrice(priceMatches[i][1]);
        if (!publishedPrice || publishedPrice < 10) continue;
        const id = generateId(name, 'eldorado');
        if (seen.has(id)) continue;
        seen.add(id);
        products.push({ id, name, brand, supermarket: 'El Dorado', publishedPrice, regularPrice: null, offerPrice: null, discount: null, pvpSugerido: null, gapPercent: null, url: `${BASE}/busqueda?q=${encodeURIComponent(term)}`, imageUrl: '', scrapedAt: timestamp });
      }
      await new Promise(r => setTimeout(r, 1200));
    } catch (e) { console.error('[ELDORADO]', term, e); }
  }
  return products;
}
