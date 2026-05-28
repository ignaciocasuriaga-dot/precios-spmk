import { scrapeTiendaInglesa } from './tiendainglesa';
import { scrapeTata } from './tata';
import { scrapeDisco } from './disco';
import { scrapeElDorado } from './eldorado';
import { Product } from '@/types';

export interface ScrapingResult {
  products: Product[];
  errors: string[];
  duration: number;
  timestamp: string;
}

export async function runAllScrapers(): Promise<ScrapingResult> {
  const start = Date.now();
  const errors: string[] = [];
  const all: Product[] = [];

  const scrapers = [
    { name: 'Tienda Inglesa', fn: scrapeTiendaInglesa },
    { name: 'Tata',           fn: scrapeTata           },
    { name: 'Disco',          fn: scrapeDisco          },
    { name: 'El Dorado',      fn: scrapeElDorado       },
  ];

  for (const s of scrapers) {
    try {
      console.log(`[SCRAPER] → ${s.name}`);
      const products = await s.fn();
      console.log(`[SCRAPER] ✓ ${s.name}: ${products.length} productos`);
      all.push(...products);
    } catch (e: any) {
      const msg = `${s.name}: ${e?.message || e}`;
      console.error('[SCRAPER] ✗', msg);
      errors.push(msg);
    }
  }

  return { products: all, errors, duration: Date.now() - start, timestamp: new Date().toISOString() };
}
