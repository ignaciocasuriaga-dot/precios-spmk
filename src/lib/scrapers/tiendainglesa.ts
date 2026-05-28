import { Product } from '@/types';
import { matchesBrand, parsePrice, calcDiscount, generateId, BRAND_SEARCH_TERMS } from '../utils';

export async function scrapeTiendaInglesa(): Promise<Product[]> {
  const products: Product[] = [];
  const timestamp = new Date().toISOString();
  const seen = new Set<string>();
  const BASE = 'https://www.tiendainglesa.com.uy';

  for (const terms of Object.values(BRAND_SEARCH_TERMS)) {
    const term = terms[0];
    try {
      const res = await fetch(`${BASE}/search?q=${encodeURIComponent(term)}`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PrecioUY/1.0)', 'Accept': 'text/html' },
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) continue;
      const html = await res.text();

      const blocks = [...html.matchAll(/<(?:div|article|li)[^>]*class="[^"]*product[^"]*"[^>]*>([\s\S]*?)(?=<(?:div|article|li)[^>]*class="[^"]*product|\s*<\/(?:ul|section|main|div class="shelf))/gi)];
      for (const [, block] of blocks) {
        const nameM = block.match(/class="[^"]*(?:title|name)[^"]*"[^>]*>([^<]{4,80})</i) || block.match(/<h[1-4][^>]*>([^<]{4,80})<\/h/i);
        const priceM = block.match(/\$\s*([\d\.]{2,})/);
        if (!nameM || !priceM) continue;
        const name = nameM[1].trim();
        const brand = matchesBrand(name);
        if (!brand) continue;
        const publishedPrice = parsePrice(priceM[1]);
        if (!publishedPrice || publishedPrice < 10) continue;
        const oldM = block.match(/(?:tachado|lined|old|regular|antes)[^>]*>\$?\s*([\d\.]+)/i);
        const regularPrice = oldM ? parsePrice(oldM[1]) : null;
        const offerPrice = regularPrice && regularPrice > publishedPrice ? publishedPrice : null;
        const hrefM = block.match(/href="([^"]+)"/);
        const imgM = block.match(/src="([^"]+\.(?:jpg|png|webp)[^"]*)"/i);
        const id = generateId(name, 'tienda-inglesa');
        if (seen.has(id)) continue;
        seen.add(id);
        products.push({ id, name, brand, supermarket: 'Tienda Inglesa', publishedPrice, regularPrice, offerPrice, discount: calcDiscount(regularPrice, offerPrice), pvpSugerido: null, gapPercent: null, url: hrefM ? (hrefM[1].startsWith('http') ? hrefM[1] : `${BASE}${hrefM[1]}`) : `${BASE}/search?q=${encodeURIComponent(term)}`, imageUrl: imgM?.[1] || '', scrapedAt: timestamp });
      }
      await new Promise(r => setTimeout(r, 1200));
    } catch (e) { console.error('[TI]', term, e); }
  }
  return products;
}
