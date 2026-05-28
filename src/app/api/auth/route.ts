import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getUserByEmail, createUser } from '@/lib/db';
import { createToken, COOKIE } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    const { email, password, name, action } = await req.json();

    if (action === 'logout') {
      const res = NextResponse.json({ success: true });
      res.cookies.delete(COOKIE);
      return res;
    }

    if (action === 'register') {
      if (!email || !password || !name) return NextResponse.json({ error: 'Todos los campos son requeridos' }, { status: 400 });
      const existing = await getUserByEmail(email);
      if (existing) return NextResponse.json({ error: 'Email ya registrado' }, { status: 400 });
      const hash = await bcrypt.hash(password, 10);
      await createUser(email, hash, name);
      const user = await getUserByEmail(email);
      const token = await createToken({ id: user!.id, email: user!.email, role: user!.role });
      const res = NextResponse.json({ success: true, user: { email: user!.email, name: user!.name, role: user!.role } });
      res.cookies.set(COOKIE, token, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 });
      return res;
    }

    // login
    if (!email || !password) return NextResponse.json({ error: 'Email y contraseña requeridos' }, { status: 400 });
    const user = await getUserByEmail(email);
    if (!user) return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
    const valid = await bcrypt.compare(password, (user as any).password_hash || password);
    if (!valid) return NextResponse.json({ error: 'Credenciales incorrectas' }, { status: 401 });
    const token = await createToken({ id: user.id, email: user.email, role: user.role });
    const res = NextResponse.json({ success: true, user: { email: user.email, name: user.name, role: user.role } });
    res.cookies.set(COOKIE, token, { httpOnly: true, secure: true, sameSite: 'lax', maxAge: 60 * 60 * 24 * 7 });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: e?.message }, { status: 500 });
  }
}

export async function GET() {
  const { getSession } = await import('@/lib/auth');
  const session = await getSession();
  if (!session) return NextResponse.json({ user: null });
  const user = await getUserByEmail(session.email);
  return NextResponse.json({ user: user ? { email: user.email, name: user.name, role: user.role } : null });
}
