import { Product } from '@/types';
import { matchesBrand, calcDiscount, generateId } from '../utils';

// SKUs conocidos de Disco (mismo SKU que Devoto, misma plataforma)
const KNOWN_SKUS = [
  // Artesano
  '660290','660362','661630','663951','661650','661650',
  // Bimbo
  '661652','601904','602534','661651','602554','602546','602555','201932','601811','602694','660635','660637',
  // Los Sorchantes
  '602318','601711','602383','602385','346268','346269','346270','346271',
  // Maestro Cubano
  '665270','665264','665055','665271','665168','661557','661559','661561','744985','744177','744997',
  // Nutrabien
  '662895','662894','601416','601427','601429','601433','602053',
  // Rapiditas
  '664153','664154','373987','345155',
  // Tia Rosa
  '981159','981158','573956',
  // Salmas
  '664235','664234','602183',
  // Vital
  '201109','661373',
];

export async function scrapeDisco(): Promise<Product[]> {
  const products: Product[] = [];
  const timestamp = new Date().toISOString();
  const BASE = 'https://www.disco.com.uy';

  // Método 1: API VTEX búsqueda
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
              const id = generateId(name, 'disco');
              if (products.some(p => p.id === id)) continue;
              products.push({
                id, name, brand, supermarket: 'Disco',
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
    } catch (e) { console.error(`[DISCO] "${term}":`, e); }
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
        const id = generateId(name, 'disco');
        if (products.some(p => p.id === id)) continue;
        products.push({
          id, name, brand, supermarket: 'Disco',
          publishedPrice: price, regularPrice, offerPrice: regularPrice ? price : null,
          discount: calcDiscount(regularPrice, regularPrice ? price : null),
          pvpSugerido: null, gapPercent: null,
          url: `${BASE}/product/${item.linkText}/${sku}`,
          imageUrl: item.items?.[0]?.images?.[0]?.imageUrl || '',
          scrapedAt: timestamp,
        });
        await new Promise(r => setTimeout(r, 300));
      } catch {}
    }
  }

  return products;
}
