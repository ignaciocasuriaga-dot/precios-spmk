import { Product } from '@/types';
import { matchesBrand, calcDiscount, generateId } from '../utils';

const KNOWN_SKUS = [
  '823','138617','117854','152701','86737',
  '152700','117853','117856','822','3776','169382','3765','3764','14577','3775','820','821','7776',
  '3757','3759','832','828','136772','136769','136770','136768',
  '86738','3735','86717','136863','18253','747','746','743','744','745','3685','3686','3689',
  '86792','149195','149198','149193','149194',
  '806','805','157041','86711',
  '169928','169942',
  '86714','148195',
];

// Marcas a buscar en Tata
const SEARCH_TERMS = [
  'bimbo', 'sorchantes', 'artesano', 'bimbo vital',
  'bauducco', 'visconti', 'marbella', 'campestre', 'fantastico',
  'precio lider', 'ta-ta',
];

export async function scrapeTata(): Promise<Product[]> {
  const products: Product[] = [];
  const seen = new Set<string>();
  const timestamp = new Date().toISOString();
  const BASE = 'https://www.tata.com.uy';

  for (const sku of KNOWN_SKUS) {
    try {
      const res = await fetch(
        `${BASE}/api/catalog_system/pub/products/search?fq=skuId:${sku}`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Referer': BASE,
          },
          signal: AbortSignal.timeout(15000),
        }
      );
      if (!res.ok) continue;
      const data = await res.json().catch(() => []);
      if (!Array.isArray(data) || !data[0]) continue;
      const item = data[0];
      const name = item.productName || '';
      const brand = matchesBrand(name);
      if (!brand) continue;
      const offer = item.items?.[0]?.sellers?.[0]?.commertialOffer;
      const price = Number(offer?.Price || 0);
      if (!price || price < 5) continue;
      const listPrice = Number(offer?.ListPrice || 0);
      const regularPrice = listPrice > price ? listPrice : null;
      const id = generateId(name, 'tata');
      if (seen.has(id)) continue;
      seen.add(id);
      products.push({
        id, name, brand, supermarket: 'Tata',
        publishedPrice: price, regularPrice,
        offerPrice: regularPrice ? price : null,
        discount: calcDiscount(regularPrice, regularPrice ? price : null),
        pvpSugerido: null, gapPercent: null,
        url: item.link || `${BASE}/${item.linkText}/p`,
        imageUrl: item.items?.[0]?.images?.[0]?.imageUrl || '',
        scrapedAt: timestamp,
      });
      await new Promise(r => setTimeout(r, 200));
    } catch (e) {
      console.error(`[TATA] SKU ${sku}:`, e);
    }
  }

  for (const term of SEARCH_TERMS) {
    try {
      const res = await fetch(
        `${BASE}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(term)}&_from=0&_to=49`,
        {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Referer': BASE,
          },
          signal: AbortSignal.timeout(20000),
        }
      );
      if (!res.ok) continue;
      const ct = res.headers.get('content-type') || '';
      if (!ct.includes('json')) continue;
      const data = await res.json().catch(() => []);
      if (!Array.isArray(data)) continue;
      for (const item of data) {
        const name = item.productName || '';
        const brand = matchesBrand(name);
        if (!brand) continue;
        const offer = item.items?.[0]?.sellers?.[0]?.commertialOffer;
        const price = Number(offer?.Price || 0);
        if (!price || price < 5) continue;
        const listPrice = Number(offer?.ListPrice || 0);
        const regularPrice = listPrice > price ? listPrice : null;
        const id = generateId(name, 'tata');
        if (seen.has(id)) continue;
        seen.add(id);
        products.push({
          id, name, brand, supermarket: 'Tata',
          publishedPrice: price, regularPrice,
          offerPrice: regularPrice ? price : null,
          discount: calcDiscount(regularPrice, regularPrice ? price : null),
          pvpSugerido: null, gapPercent: null,
          url: item.link || `${BASE}/${item.linkText}/p`,
          imageUrl: item.items?.[0]?.images?.[0]?.imageUrl || '',
          scrapedAt: timestamp,
        });
      }
      await new Promise(r => setTimeout(r, 800));
    } catch (e) {
      console.error(`[TATA] término "${term}":`, e);
    }
  }

  console.log(`[TATA] Total: ${products.length} productos`);
  return products;
}
