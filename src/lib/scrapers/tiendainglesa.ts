import { Product } from '@/types';
import { matchesBrand, parsePrice, calcDiscount, generateId, BRAND_SEARCH_TERMS } from '../utils';

export async function scrapeTiendaInglesa(): Promise<Product[]> {
  const products: Product[] = [];
  const timestamp = new Date().toISOString();
  const seen = new Set<string>();
  const BASE = 'https://www.tiendainglesa.com.uy';

  for (const [brand, terms] of Object.entries(BRAND_SEARCH_TERMS)) {
    for (const term of terms) {
      try {
        // Tienda Inglesa usa VTEX - intentar API primero
        const apiUrl = `${BASE}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(term)}&_from=0&_to=29`;
        const res = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
          },
          signal: AbortSignal.timeout(20000),
        });

        if (res.ok) {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('json')) {
            const data = await res.json().catch(() => []);
            if (Array.isArray(data) && data.length > 0) {
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
                const id = generateId(name, 'tienda-inglesa');
                if (seen.has(id)) continue;
                seen.add(id);
                products.push({
                  id, name, brand: detectedBrand, supermarket: 'Tienda Inglesa',
                  publishedPrice, regularPrice, offerPrice,
                  discount: calcDiscount(regularPrice, offerPrice),
                  pvpSugerido: null, gapPercent: null,
                  url: `${BASE}/${item.linkText}/p`,
                  imageUrl: item.items?.[0]?.images?.[0]?.imageUrl || '',
                  scrapedAt: timestamp,
                });
              }
              await new Promise(r => setTimeout(r, 1000));
              continue;
            }
          }
        }

        // Fallback: buscar por HTML
        const searchUrl = `${BASE}/buscapagina?ft=${encodeURIComponent(term)}&PS=20&sl=&cc=&sm=0&PageNumber=0`;
        const htmlRes = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html,application/xhtml+xml',
          },
          signal: AbortSignal.timeout(20000),
        });
        if (!htmlRes.ok) continue;
        const html = await htmlRes.text();
        extractFromHTML(html, 'Tienda Inglesa', BASE, timestamp, seen, products);
        await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
        console.error(`[TI] Error "${term}":`, e);
      }
    }
  }
  return products;
}

function extractFromHTML(html: string, supermarket: string, base: string, timestamp: string, seen: Set<string>, products: Product[]) {
  // Buscar JSON embebido en la página (VTEX)
  const jsonMatches = html.match(/vtex\.events\.addData\((\{[\s\S]*?\})\)/g) || [];
  for (const match of jsonMatches) {
    try {
      const json = JSON.parse(match.replace("vtex.events.addData(", "").slice(0, -1));
      if (json.productId && json.productName) {
        const name = json.productName;
        const brand = matchesBrand(name);
        if (!brand) continue;
        const price = json.productPriceTo || json.productPrice;
        if (!price) continue;
        const publishedPrice = Number(price);
        const id = generateId(name, supermarket.toLowerCase().replace(/\s/g, '-'));
        if (seen.has(id)) continue;
        seen.add(id);
        products.push({ id, name, brand, supermarket, publishedPrice, regularPrice: null, offerPrice: null, discount: null, pvpSugerido: null, gapPercent: null, url: `${base}/${json.productLinkText || ''}/p`, imageUrl: '', scrapedAt: timestamp });
      }
    } catch {}
  }

  // Buscar bloques de producto en HTML crudo
  const nameRe = /<[^>]*class="[^"]*(?:product[-_]?name|productName|shelf-product-name)[^"]*"[^>]*>([^<]{3,100})</gi;
  const priceRe = /<[^>]*class="[^"]*(?:best[-_]?price|salesprice|price-best)[^"]*"[^>]*>[\s\S]{0,50}?\$\s*([\d\.,]+)/gi;
  const names = [...html.matchAll(nameRe)].map(m => m[1].trim());
  const prices = [...html.matchAll(priceRe)].map(m => parsePrice(m[1]));
  for (let i = 0; i < Math.min(names.length, prices.length); i++) {
    const name = names[i];
    const brand = matchesBrand(name);
    if (!brand || !prices[i]) continue;
    const id = generateId(name, supermarket.toLowerCase().replace(/\s/g, '-'));
    if (seen.has(id)) continue;
    seen.add(id);
    products.push({ id, name, brand, supermarket, publishedPrice: prices[i]!, regularPrice: null, offerPrice: null, discount: null, pvpSugerido: null, gapPercent: null, url: base, imageUrl: '', scrapedAt: timestamp });
  }
}
