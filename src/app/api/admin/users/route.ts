import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/db';
import { getSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== 'admin') return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
  const users = await getAllUsers();
  return NextResponse.json({ users });
}
