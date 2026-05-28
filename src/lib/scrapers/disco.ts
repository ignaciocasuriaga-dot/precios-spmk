import { Product } from '@/types';
import { matchesBrand, parsePrice, calcDiscount, generateId, BRAND_SEARCH_TERMS } from '../utils';

export async function scrapeDisco(): Promise<Product[]> {
  const products: Product[] = [];
  const timestamp = new Date().toISOString();
  const seen = new Set<string>();
  const BASE = 'https://www.disco.com.uy';

  for (const terms of Object.values(BRAND_SEARCH_TERMS)) {
    const term = terms[0];
    try {
      // Disco VTEX - búsqueda fulltext
      const url = `${BASE}/buscapagina?ft=${encodeURIComponent(term)}&PS=20&sl=&cc=&sm=0&PageNumber=0`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml',
          'Accept-Language': 'es-UY,es;q=0.9',
          'Referer': `${BASE}/`,
        },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) {
        // Intentar API VTEX directa
        const api = `${BASE}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(term)}&_from=0&_to=29`;
        const res2 = await fetch(api, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
          signal: AbortSignal.timeout(20000),
        });
        if (res2.ok) {
          const data = await res2.json().catch(() => []);
          processVTEXJson(data, 'Disco', BASE, timestamp, seen, products);
        }
        await new Promise(r => setTimeout(r, 1500));
        continue;
      }
      const html = await res.text();

      // Buscar JSON embebido VTEX
      const skuMatch = html.match(/var\s+skuJson_\d+\s*=\s*(\{[\s\S]*?\});/g) || [];
      for (const raw of skuMatch) {
        try {
          const json = JSON.parse(raw.replace(/var\s+skuJson_\d+\s*=\s*/, '').replace(/;$/, ''));
          const name = json.name || '';
          const brand = matchesBrand(name);
          if (!brand) continue;
          const price = json.skus?.[0]?.bestPrice / 100;
          const listPrice = json.skus?.[0]?.listPrice / 100;
          if (!price || price < 5) continue;
          const regularPrice = listPrice && listPrice > price ? listPrice : null;
          const offerPrice = regularPrice ? price : null;
          const id = generateId(name, 'disco');
          if (seen.has(id)) continue;
          seen.add(id);
          products.push({ id, name, brand, supermarket: 'Disco', publishedPrice: price, regularPrice, offerPrice, discount: calcDiscount(regularPrice, offerPrice), pvpSugerido: null, gapPercent: null, url: `${BASE}${json.link || ''}`, imageUrl: json.skus?.[0]?.image || '', scrapedAt: timestamp });
        } catch {}
      }

      // HTML fallback
      const nameRe = /<[^>]*class="[^"]*(?:product-name|productName|shelf-product-name)[^"]*"[^>]*>\s*(?:<a[^>]*>)?([^<]{4,100})/gi;
      const priceRe = /<[^>]*class="[^"]*(?:bestPrice|best-price)[^"]*"[^>]*>[\s\S]{0,20}?\$?\s*([\d\.]+)/gi;
      const names = [...html.matchAll(nameRe)].map(m => m[1].trim());
      const prices = [...html.matchAll(priceRe)].map(m => parsePrice(m[1]));
      for (let i = 0; i < Math.min(names.length, prices.length); i++) {
        const name = names[i];
        const brand = matchesBrand(name);
        if (!brand || !prices[i] || prices[i]! < 5) continue;
        const id = generateId(name, 'disco');
        if (seen.has(id)) continue;
        seen.add(id);
        products.push({ id, name, brand, supermarket: 'Disco', publishedPrice: prices[i]!, regularPrice: null, offerPrice: null, discount: null, pvpSugerido: null, gapPercent: null, url: BASE, imageUrl: '', scrapedAt: timestamp });
      }

      await new Promise(r => setTimeout(r, 1500));
    } catch (e) { console.error(`[DISCO] "${term}":`, e); }
  }
  return products;
}

function processVTEXJson(data: any[], supermarket: string, base: string, timestamp: string, seen: Set<string>, products: Product[]) {
  if (!Array.isArray(data)) return;
  for (const item of data) {
    const name = item.productName || '';
    const brand = matchesBrand(name);
    if (!brand) continue;
    const offer = item.items?.[0]?.sellers?.[0]?.commertialOffer;
    const price = Number(offer?.Price || 0);
    if (!price || price < 5) continue;
    const listPrice = Number(offer?.ListPrice || 0);
    const regularPrice = listPrice > price ? listPrice : null;
    const offerPrice = regularPrice ? price : null;
    const id = generateId(name, supermarket.toLowerCase().replace(/\s/g, '-'));
    if (seen.has(id)) continue;
    seen.add(id);
    products.push({ id, name, brand, supermarket, publishedPrice: price, regularPrice, offerPrice, discount: calcDiscount(regularPrice, offerPrice), pvpSugerido: null, gapPercent: null, url: `${base}/${item.linkText}/p`, imageUrl: item.items?.[0]?.images?.[0]?.imageUrl || '', scrapedAt: timestamp });
  }
}
