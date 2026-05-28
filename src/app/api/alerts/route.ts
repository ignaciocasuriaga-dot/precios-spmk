import { NextResponse } from 'next/server';
import { getAlerts } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const alerts = await getAlerts(200);
    return NextResponse.json({ alerts });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
