import { Product } from '@/types';
import { matchesBrand, parsePrice, generateId, BRAND_SEARCH_TERMS } from '../utils';

export async function scrapeElDorado(): Promise<Product[]> {
  const products: Product[] = [];
  const timestamp = new Date().toISOString();
  const seen = new Set<string>();
  // El Dorado Uruguay - múltiples URLs posibles
  const BASES = [
    'https://www.eldorado.com.uy',
    'https://eldorado.com.uy',
  ];

  for (const [brand, terms] of Object.entries(BRAND_SEARCH_TERMS)) {
    for (const term of terms) {
      let found = false;
      for (const BASE of BASES) {
        if (found) break;
        // Intentar API VTEX primero
        try {
          const apiUrl = `${BASE}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(term)}&_from=0&_to=29`;
          const res = await fetch(apiUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
              'Accept': 'application/json',
            },
            signal: AbortSignal.timeout(15000),
          });
          if (res.ok) {
            const ct = res.headers.get('content-type') || '';
            if (ct.includes('json')) {
              const data = await res.json().catch(() => []);
              if (Array.isArray(data) && data.length > 0) {
                for (const item of data) {
                  const name = item.productName || item.name || '';
                  const detectedBrand = matchesBrand(name);
                  if (!detectedBrand) continue;
                  const sellers = item.items?.[0]?.sellers;
                  const offer = sellers?.[0]?.commertialOffer;
                  const publishedPrice = Number(offer?.Price || 0);
                  if (!publishedPrice || publishedPrice < 5) continue;
                  const id = generateId(name, 'eldorado');
                  if (seen.has(id)) continue;
                  seen.add(id);
                  products.push({
                    id, name, brand: detectedBrand, supermarket: 'El Dorado',
                    publishedPrice, regularPrice: null, offerPrice: null, discount: null,
                    pvpSugerido: null, gapPercent: null,
                    url: `${BASE}/${item.linkText || ''}/p`,
                    imageUrl: item.items?.[0]?.images?.[0]?.imageUrl || '',
                    scrapedAt: timestamp,
                  });
                }
                found = true;
                break;
              }
            }
          }
        } catch {}

        // Fallback: búsqueda HTML
        try {
          const urls = [
            `${BASE}/busqueda?q=${encodeURIComponent(term)}`,
            `${BASE}/search?q=${encodeURIComponent(term)}`,
            `${BASE}/buscapagina?ft=${encodeURIComponent(term)}&PS=20`,
          ];
          for (const url of urls) {
            try {
              const res = await fetch(url, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                  'Accept': 'text/html',
                },
                signal: AbortSignal.timeout(15000),
              });
              if (!res.ok) continue;
              const html = await res.text();
              if (html.length < 500) continue;

              // Extraer precios y nombres del HTML
              const priceRe = /\$\s*([\d\.]{3,})/g;
              const nameRe = /<(?:h[1-4]|span|div)[^>]*class="[^"]*(?:name|title|product)[^"]*"[^>]*>([^<]{5,100})</gi;
              const names = [...html.matchAll(nameRe)].map(m => m[1].trim());
              const prices = [...html.matchAll(priceRe)].map(m => parsePrice(m[1])).filter(Boolean);

              for (let i = 0; i < Math.min(names.length, prices.length, 20); i++) {
                const name = names[i];
                const detectedBrand = matchesBrand(name);
                if (!detectedBrand) continue;
                const publishedPrice = prices[i]!;
                if (publishedPrice < 5) continue;
                const id = generateId(name, 'eldorado');
                if (seen.has(id)) continue;
                seen.add(id);
                products.push({
                  id, name, brand: detectedBrand, supermarket: 'El Dorado',
                  publishedPrice, regularPrice: null, offerPrice: null, discount: null,
                  pvpSugerido: null, gapPercent: null,
                  url, imageUrl: '', scrapedAt: timestamp,
                });
              }
              if (names.length > 0) { found = true; break; }
            } catch {}
          }
        } catch (e) {
          console.error(`[ELDORADO] Error "${term}" en ${BASE}:`, e);
        }
      }
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  return products;
}
