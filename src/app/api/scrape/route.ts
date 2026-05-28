import { NextResponse } from 'next/server';
import { runAllScrapers } from '@/lib/scrapers';
import { upsertProducts } from '@/lib/db';

export const maxDuration = 300;
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await runAllScrapers();
    let alerts: any[] = [];
    if (result.products.length > 0) {
      alerts = await upsertProducts(result.products);
    }
    return NextResponse.json({
      success: true,
      productsFound: result.products.length,
      alertsGenerated: alerts.length,
      errors: result.errors,
      duration: `${(result.duration / 1000).toFixed(1)}s`,
      timestamp: result.timestamp,
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message }, { status: 500 });
  }
}
