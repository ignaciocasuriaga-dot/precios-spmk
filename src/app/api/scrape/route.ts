import { NextResponse } from 'next/server';
import { upsertProducts } from '@/lib/db';
import { runAllScrapers } from '@/lib/scrapers';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST() {
  const t0 = Date.now();
  try {
    const result = await runAllScrapers();
    const products = result.products;
    const alerts = products.length > 0 ? await upsertProducts(products) : [];
    const elapsed = ((Date.now() - t0) / 1000).toFixed(1) + 's';

    return NextResponse.json({
      success: true,
      source: 'scrapers',
      productsFound: products.length,
      alertsGenerated: alerts.length,
      duration: elapsed,
      scraperErrors: result.errors,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
