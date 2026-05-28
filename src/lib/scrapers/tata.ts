import { Product } from '@/types';
import { matchesBrand, calcDiscount, generateId } from '../utils';

// SKUs conocidos de Tata extraídos del JSON de referencia
const KNOWN_SKUS = [
  // Artesano
  '823','138617','117854','152701','86737',
  // Bimbo  
  '152700','117853','117856','822','3776','169382','3765','3764','14577','3775','820','821','7776',
  // Los Sorchantes
  '3757','3759','832','828','136772','136769','136770','136768',
  // Maestro Cubano
  '86738','3735','86717','136863','18253','747','746','743','744','745','3685','3686','3689',
  // Nutrabien
  '86792','149195','149198','149193','149194',
  // Rapiditas
  '806','805','157041','86711',
  // Tia Rosa
  '169928','169942',
  // Salmas/Sanissimo
  '86714','148195',
  // Merienda Hit
];

export async function scrapeTata(): Promise<Product[]> {
  const products: Product[] = [];
  const timestamp = new Date().toISOString();
  const BASE = 'https://www.tata.com.uy';

  // Método 1: API VTEX de búsqueda
  const searchTerms = ['bimbo','sorchantes','rapiditas','maestro cubano','nutrabien','tia rosa','salmas','takis','merienda'];
  
  for (const term of searchTerms) {
    try {
      const url = `${BASE}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(term)}&_from=0&_to=49`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124.0.0.0 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'es-UY,es;q=0.9',
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
              const id = generateId(name, 'tata');
              if (products.some(p => p.id === id)) continue;
              products.push({
                id, name, brand, supermarket: 'Tata',
                publishedPrice, regularPrice, offerPrice,
                discount: calcDiscount(regularPrice, offerPrice),
                pvpSugerido: null, gapPercent: null,
                url: item.link || `${BASE}/${item.linkText}/p`,
                imageUrl: item.items?.[0]?.images?.[0]?.imageUrl || '',
                scrapedAt: timestamp,
              });
            }
          }
        }
      }
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) { console.error(`[TATA] "${term}":`, e); }
  }

  // Método 2: SKUs conocidos como fallback
  if (products.length === 0) {
    for (const sku of KNOWN_SKUS) {
      try {
        const url = `${BASE}/api/catalog_system/pub/products/search?fq=skuId:${sku}`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', 'Referer': BASE },
          signal: AbortSignal.timeout(10000),
        });
        if (!res.ok) continue;
        const data = await res.json().catch(() => []);
        if (!Array.isArray(data) || !data[0]) continue;
        const item = data[0];
        const name = item.productName || '';
        const brand = matchesBrand(name);
        if (!brand) continue;
        const offer = item.items?.[0]?.sellers?.[0]?.commertialOffer;
        const price = Number(offer?.Price || 0);
        const listPrice = Number(offer?.ListPrice || 0);
        if (!price) continue;
        const regularPrice = listPrice > price ? listPrice : null;
        const id = generateId(name, 'tata');
        if (products.some(p => p.id === id)) continue;
        products.push({
          id, name, brand, supermarket: 'Tata',
          publishedPrice: price, regularPrice, offerPrice: regularPrice ? price : null,
          discount: calcDiscount(regularPrice, regularPrice ? price : null),
          pvpSugerido: null, gapPercent: null,
          url: item.link || `${BASE}/${item.linkText}/p`,
          imageUrl: item.items?.[0]?.images?.[0]?.imageUrl || '',
          scrapedAt: timestamp,
        });
        await new Promise(r => setTimeout(r, 300));
      } catch {}
    }
  }

  return products;
}
