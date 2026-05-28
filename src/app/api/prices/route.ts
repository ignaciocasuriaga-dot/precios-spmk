import { NextResponse } from 'next/server';
import { getAllProducts, getHistory, getAlerts, updatePVP } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [products, history, alerts] = await Promise.all([
      getAllProducts(),
      getHistory(1000),
      getAlerts(200),
    ]);
    return NextResponse.json({ products, history, alerts });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { id, pvp } = await req.json();
    if (!id || typeof pvp !== 'number') return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
    await updatePVP(id, pvp);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}
