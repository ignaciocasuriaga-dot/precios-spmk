import { Product } from '@/types';
import { matchesBrand, parsePrice, calcDiscount, generateId, BRAND_SEARCH_TERMS } from '../utils';

export async function scrapeTata(): Promise<Product[]> {
  const products: Product[] = [];
  const timestamp = new Date().toISOString();
  const seen = new Set<string>();
  const BASE = 'https://www.tata.com.uy';

  for (const terms of Object.values(BRAND_SEARCH_TERMS)) {
    const term = terms[0];
    try {
      // Tata VTEX - usar búsqueda por fulltext
      const url = `${BASE}/buscapagina?ft=${encodeURIComponent(term)}&PS=20&sl=&cc=&sm=0&PageNumber=0`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'es-UY,es;q=0.9',
          'Referer': `${BASE}/`,
          'Cache-Control': 'no-cache',
        },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) { await new Promise(r => setTimeout(r, 1500)); continue; }
      const html = await res.text();

      // Buscar JSON de productos embebido en VTEX
      const skuMatch = html.match(/var\s+skuJson_\d+\s*=\s*(\{[\s\S]*?\});/g) || [];
      for (const raw of skuMatch) {
        try {
          const json = JSON.parse(raw.replace(/var\s+skuJson_\d+\s*=\s*/, '').replace(/;$/, ''));
          const name = json.name || '';
          const brand = matchesBrand(name);
          if (!brand) continue;
          const price = json.skus?.[0]?.bestPrice / 100 || json.skus?.[0]?.listPrice / 100;
          if (!price || price < 5) continue;
          const id = generateId(name, 'tata');
          if (seen.has(id)) continue;
          seen.add(id);
          products.push({ id, name, brand, supermarket: 'Tata', publishedPrice: price, regularPrice: null, offerPrice: null, discount: null, pvpSugerido: null, gapPercent: null, url: `${BASE}${json.link || ''}`, imageUrl: json.skus?.[0]?.image || '', scrapedAt: timestamp });
        } catch {}
      }

      // Fallback: extraer de HTML con regex
      const nameRe = /<(?:span|h[1-4])[^>]*class="[^"]*(?:product-name|productName|shelf-product-name)[^"]*"[^>]*>\s*<a[^>]*>([^<]{4,100})/gi;
      const priceRe = /<[^>]*class="[^"]*(?:bestPrice|best-price|price-best)[^"]*"[^>]*>[\s\S]{0,20}?R?\$?\s*([\d\.]+)/gi;
      const hrefRe = /<a[^>]*href="([^"]*\/p[^"]*)"[^>]*>/gi;
      const names = [...html.matchAll(nameRe)].map(m => m[1].trim());
      const prices = [...html.matchAll(priceRe)].map(m => parsePrice(m[1]));
      const hrefs = [...html.matchAll(hrefRe)].map(m => m[1]);
      for (let i = 0; i < Math.min(names.length, prices.length); i++) {
        const name = names[i];
        const brand = matchesBrand(name);
        if (!brand || !prices[i] || prices[i]! < 5) continue;
        const id = generateId(name, 'tata');
        if (seen.has(id)) continue;
        seen.add(id);
        const href = hrefs[i] || '';
        products.push({ id, name, brand, supermarket: 'Tata', publishedPrice: prices[i]!, regularPrice: null, offerPrice: null, discount: null, pvpSugerido: null, gapPercent: null, url: href.startsWith('http') ? href : `${BASE}${href}`, imageUrl: '', scrapedAt: timestamp });
      }

      await new Promise(r => setTimeout(r, 1500));
    } catch (e) { console.error(`[TATA] "${term}":`, e); }
  }
  return products;
}
