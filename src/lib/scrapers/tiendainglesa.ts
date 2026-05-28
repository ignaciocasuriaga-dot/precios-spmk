import { Product } from '@/types';
import { matchesBrand, calcDiscount, generateId } from '../utils';

// SKUs conocidos de Tienda Inglesa extraídos del JSON de referencia
const KNOWN_SKUS = [
  // Artesano
  '381170','1525201','1541518','1560386','1541517','1570745','1570713','1570746',
  // Bimbo
  '420355','420350','1565118','1541427','1570746','1541426','256646','330166','331558','343223','410372','1590865',
  // Los Sorchantes
  '4545','4547','1565117','1565871','1545589','1545590',
  // Maestro Cubano
  '1521099','1521082','1554137','1521086','1521083','18976','18977','18978','10999','69735','69737','363201','363203','363204',
  // Nutrabien
  '1515784','1515781','1562146','1562147','1562145',
  // Rapiditas
  '1583467','54733','1514413',
  // Tia Rosa
  '309761','1595670','1562711',
  // Salmas/Sanissimo
  '1516028','1516029',
  // Merienda Hit - agregar si se encuentran
];

export async function scrapeTiendaInglesa(): Promise<Product[]> {
  const products: Product[] = [];
  const timestamp = new Date().toISOString();
  const BASE = 'https://www.tiendainglesa.com.uy';

  // Método 1: Buscar por término usando la API interna
  const searchTerms = ['bimbo','sorchantes','rapiditas','maestro cubano','nutrabien','tia rosa','salmas','takis','merienda hit'];
  
  for (const term of searchTerms) {
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
              if (products.some(p => p.id === id)) continue;
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

  // Método 2: Fetch directo de SKUs conocidos si la API no devolvió nada
  if (products.length === 0) {
    for (const sku of KNOWN_SKUS.slice(0, 20)) {
      try {
        const url = `${BASE}/api/catalog_system/pub/products/search?fq=skuId:${sku}`;
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
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
        if (!price) continue;
        const id = generateId(name, 'tienda-inglesa');
        if (products.some(p => p.id === id)) continue;
        products.push({
          id, name, brand, supermarket: 'Tienda Inglesa',
          publishedPrice: price, regularPrice: null, offerPrice: null, discount: null,
          pvpSugerido: null, gapPercent: null,
          url: `${BASE}/${item.linkText}/p`,
          imageUrl: item.items?.[0]?.images?.[0]?.imageUrl || '',
          scrapedAt: timestamp,
        });
        await new Promise(r => setTimeout(r, 500));
      } catch {}
    }
  }

  return products;
}
