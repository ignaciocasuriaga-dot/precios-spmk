import { Product } from '@/types';
import { matchesBrand, parsePrice, calcDiscount, generateId, BRAND_SEARCH_TERMS } from '../utils';

export async function scrapeTata(): Promise<Product[]> {
  const products: Product[] = [];
  const timestamp = new Date().toISOString();
  const seen = new Set<string>();
  const BASE = 'https://www.tata.com.uy';

  for (const [brand, terms] of Object.entries(BRAND_SEARCH_TERMS)) {
    for (const term of terms) {
      try {
        // Tata usa VTEX - API de búsqueda
        const apiUrl = `${BASE}/api/catalog_system/pub/products/search?ft=${encodeURIComponent(term)}&_from=0&_to=29`;
        const res = await fetch(apiUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json',
            'Referer': BASE,
          },
          signal: AbortSignal.timeout(20000),
        });

        if (res.ok) {
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
              const publishedPrice = Number(offer.Price || 0);
              if (!publishedPrice || publishedPrice < 5) continue;
              const regularPrice = offer.ListPrice && Number(offer.ListPrice) > publishedPrice ? Number(offer.ListPrice) : null;
              const offerPrice = regularPrice ? publishedPrice : null;
              const id = generateId(name, 'tata');
              if (seen.has(id)) continue;
              seen.add(id);
              products.push({
                id, name, brand: detectedBrand, supermarket: 'Tata',
                publishedPrice, regularPrice, offerPrice,
                discount: calcDiscount(regularPrice, offerPrice),
                pvpSugerido: null, gapPercent: null,
                url: item.link || `${BASE}/${item.linkText}/p`,
                imageUrl: item.items?.[0]?.images?.[0]?.imageUrl || '',
                scrapedAt: timestamp,
              });
            }
            await new Promise(r => setTimeout(r, 1000));
            continue;
          }
        }

        // Fallback HTML
        const searchUrl = `${BASE}/buscapagina?ft=${encodeURIComponent(term)}&PS=20&sl=&cc=&sm=0&PageNumber=0`;
        const htmlRes = await fetch(searchUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html',
            'Referer': BASE,
          },
          signal: AbortSignal.timeout(20000),
        });
        if (!htmlRes.ok) continue;
        const html = await htmlRes.text();

        // VTEX shelf items
        const itemBlocks = html.match(/<li[^>]*class="[^"]*shelf-item[^"]*"[^>]*>[\s\S]*?<\/li>/gi) || [];
        for (const block of itemBlocks) {
          const nameM = block.match(/class="[^"]*product-name[^"]*"[^>]*>[\s\S]*?<span[^>]*>([^<]{3,100})</i)
            || block.match(/class="[^"]*shelf-product-name[^"]*"[^>]*>([^<]{3,100})</i);
          const priceM = block.match(/class="[^"]*(?:best|sale)[^"]*price[^"]*"[^>]*>[\s\S]{0,30}?(?:\$|R\$)\s*([\d\.,]+)/i)
            || block.match(/\$\s*([\d\.]{3,})/);
          if (!nameM || !priceM) continue;
          const name = nameM[1].trim();
          const detectedBrand = matchesBrand(name);
          if (!detectedBrand) continue;
          const publishedPrice = parsePrice(priceM[1]);
          if (!publishedPrice || publishedPrice < 5) continue;
          const hrefM = block.match(/href="([^"]+)"/);
          const id = generateId(name, 'tata');
          if (seen.has(id)) continue;
          seen.add(id);
          products.push({
            id, name, brand: detectedBrand, supermarket: 'Tata',
            publishedPrice, regularPrice: null, offerPrice: null, discount: null,
            pvpSugerido: null, gapPercent: null,
            url: hrefM ? (hrefM[1].startsWith('http') ? hrefM[1] : `${BASE}${hrefM[1]}`) : BASE,
            imageUrl: '',
            scrapedAt: timestamp,
          });
        }
        await new Promise(r => setTimeout(r, 1000));
      } catch (e) {
        console.error(`[TATA] Error "${term}":`, e);
      }
    }
  }
  return products;
}
