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
      // Tienda Inglesa usa su propio motor de búsqueda (no VTEX estándar)
      const url = `${BASE}/search?q=${encodeURIComponent(term)}&internalSearch=true`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'es-UY,es;q=0.9',
          'Referer': BASE,
        },
        signal: AbortSignal.timeout(20000),
      });
      if (!res.ok) { await new Promise(r => setTimeout(r, 1500)); continue; }
      const html = await res.text();
      parseAndAdd(html, 'Tienda Inglesa', BASE, timestamp, seen, products);
      await new Promise(r => setTimeout(r, 1500));
    } catch (e) { console.error(`[TI] "${term}":`, e); }
  }
  return products;
}

function parseAndAdd(html: string, supermarket: string, base: string, timestamp: string, seen: Set<string>, products: Product[]) {
  // JSON-LD en la página
  const jsonLdMatches = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/gi)];
  for (const [, raw] of jsonLdMatches) {
    try {
      const data = JSON.parse(raw);
      const items = data['@type'] === 'ItemList' ? (data.itemListElement || []) : [data];
      for (const item of items) {
        const product = item.item || item;
        const name = product.name || '';
        const brand = matchesBrand(name);
        if (!brand) continue;
        const offer = Array.isArray(product.offers) ? product.offers[0] : product.offers;
        const price = parsePrice(String(offer?.price || ''));
        if (!price || price < 5) continue;
        const id = generateId(name, supermarket.toLowerCase().replace(/\s/g, '-'));
        if (seen.has(id)) continue;
        seen.add(id);
        products.push({ id, name, brand, supermarket, publishedPrice: price, regularPrice: null, offerPrice: null, discount: null, pvpSugerido: null, gapPercent: null, url: product.url || base, imageUrl: product.image || '', scrapedAt: timestamp });
      }
    } catch {}
  }

  // Buscar precios con data attributes o spans
  const blocks = html.match(/<(?:div|li|article)[^>]*class="[^"]*(?:product|item)[^"]*"[^>]*>[\s\S]{50,800}?(?=<(?:div|li|article)[^>]*class="[^"]*(?:product|item)|<\/(?:ul|section|main)))/gi) || [];
  for (const block of blocks) {
    const nameM = block.match(/(?:data-product-name|class="[^"]*(?:product-name|productName|item-title)[^"]*")[^>]*>([^<]{4,100})/i)
      || block.match(/<[^>]*title="([^"]{4,100})"/i);
    const priceM = block.match(/(?:data-price|class="[^"]*(?:price|valor)[^"]*")[^>]*>\$?\s*([\d\.]+)/i)
      || block.match(/\$\s*([\d\.]{3,6})/);
    if (!nameM || !priceM) continue;
    const name = nameM[1].trim().replace(/&amp;/g, '&');
    const brand = matchesBrand(name);
    if (!brand) continue;
    const price = parsePrice(priceM[1]);
    if (!price || price < 5) continue;
    const hrefM = block.match(/href="([^"]+\.producto[^"]*)"/i) || block.match(/href="([^"]+)"/i);
    const id = generateId(name, supermarket.toLowerCase().replace(/\s/g, '-'));
    if (seen.has(id)) continue;
    seen.add(id);
    products.push({ id, name, brand, supermarket, publishedPrice: price, regularPrice: null, offerPrice: null, discount: null, pvpSugerido: null, gapPercent: null, url: hrefM ? (hrefM[1].startsWith('http') ? hrefM[1] : `${base}${hrefM[1]}`) : base, imageUrl: '', scrapedAt: timestamp });
  }
}
