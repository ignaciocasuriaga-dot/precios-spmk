import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { upsertProducts } from '@/lib/db';
import { runAllScrapers } from '@/lib/scrapers';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    let products: any[] = [];
    let source = 'scrapers';

    // Intentar leer el JSON pre-generado por GitHub Actions
    try {
      const filePath = join(process.cwd(), 'public', 'data', 'products.json');
      const raw = readFileSync(filePath, 'utf-8');
      const json = JSON.parse(raw);
      if (json.items?.length > 0) {
        products = json.items;
        source = 'github-actions';
      }
    } catch {}

    // Si no hay JSON pre-generado, correr scrapers normales (El Dorado funciona)
    if (products.length === 0) {
      const result = await runAllScrapers();
      products = result.products;
    }

    const alerts = products.length > 0 ? await upsertProducts(products) : [];

    return NextResponse.json({
      success: true,
      source,
      productsFound: products.length,
      alertsGenerated: alerts.length,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
