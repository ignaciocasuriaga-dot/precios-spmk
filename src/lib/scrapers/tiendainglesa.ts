import { Product } from '@/types';
import { matchesBrand, calcDiscount, generateId } from '../utils';

const SEARCH_TERMS = [
  'bimbo', 'sorchantes', 'artesano', 'bimbo vital',
  'bauducco', 'sanosinharina', 'glu', 'pagnifique',
  'tienda inglesa',
];

export async function scrapeTiendaInglesa(): Promise<Product[]> {
  const products: Product[] = [];
  const seen = new Set<string>();
  const timestamp = new Date().toISOString();
  const BASE = 'https://www.tiendainglesa.com.uy';

  for (const term of SEARCH_TERMS) {
    try {
      const url = `${BASE}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(term)}&_from=0&_to=49&O=OrderByPriceDESC`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'es-UY,es;q=0.9,en;q=0.8',
          'Referer': `${BASE}/`,
          'Origin': BASE,
        },
        signal: AbortSignal.timeout(20000),
      });

      if (res.ok) {
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('json')) {
          const data = await res.json().catch(() => []);
          if (Array.isArray(data)) {
            for (const item of data) {
              const name = item.productName || item.name || '';
              const brand = matchesBrand(name);
              if (!brand) continue;
              const sellers = item.items?.[0]?.sellers;
              if (!sellers?.length) continue;
              const offer = sellers[0]?.commertialOffer;
              if (!offer) continue;
              const publishedPrice = Number(offer.Price || 0);
              if (!publishedPrice || publishedPrice < 5) continue;
              const regularPrice = offer.ListPrice && Number(offer.ListPrice) > publishedPrice ? Number(offer.ListPrice) : null;
              const offerPrice = regularPrice ? publishedPrice : null;
              const id = generateId(name, 'tienda-inglesa');
              if (seen.has(id)) continue;
              seen.add(id);
              products.push({
                id, name, brand, supermarket: 'Tienda Inglesa',
                publishedPrice, regularPrice, offerPrice,
                discount: calcDiscount(regularPrice, offerPrice),
                pvpSugerido: null, gapPercent: null,
                url: `${BASE}/${item.linkText}/p`,
                imageUrl: item.items?.[0]?.images?.[0]?.imageUrl || '',
                scrapedAt: timestamp,
              });
            }
          }
        }
      }
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) { console.error(`[TI] "${term}":`, e); }
  }

  console.log(`[TIENDA INGLESA] Total: ${products.length} productos`);
  return products;
}
