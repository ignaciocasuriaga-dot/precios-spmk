import { neon } from '@neondatabase/serverless';
import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { Product, PriceHistoryEntry, Alert, User } from '@/types';

// ── helpers ──────────────────────────────────────────────────────────────────

function isDbAvailable(): boolean {
  return !!(process.env.DATABASE_URL || process.env.POSTGRES_URL);
}

function getSQL() {
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) throw new Error('DATABASE_URL no configurada');
  return neon(url);
}

const DATA_FILE = join(process.cwd(), 'public', 'data', 'products.json');

interface FileStore {
  generatedAt: string;
  items: Product[];
  history: PriceHistoryEntry[];
  alerts: Alert[];
}

function readStore(): FileStore {
  try {
    const raw = readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    return {
      generatedAt: data.generatedAt || new Date().toISOString(),
      items: data.items || [],
      history: data.history || [],
      alerts: data.alerts || [],
    };
  } catch {
    return { generatedAt: new Date().toISOString(), items: [], history: [], alerts: [] };
  }
}

function writeStore(store: FileStore) {
  try {
    mkdirSync(dirname(DATA_FILE), { recursive: true });
    writeFileSync(DATA_FILE, JSON.stringify(store, null, 2));
  } catch (e) {
    console.error('[FILESTORE] Error al escribir:', e);
  }
}

// ── file-based upsert ─────────────────────────────────────────────────────────

function upsertProductsToFile(products: Product[]): Alert[] {
  const store = readStore();
  const existingMap = new Map<string, Product>(store.items.map(p => [p.id, p]));
  const newAlerts: Alert[] = [];

  for (const p of products) {
    const old = existingMap.get(p.id);
    const oldPrice = old?.publishedPrice;
    if (oldPrice && Math.abs(p.publishedPrice - oldPrice) / oldPrice > 0.005) {
      const changePct = Math.round(((p.publishedPrice - oldPrice) / oldPrice) * 100);
      newAlerts.push({
        id: Date.now() + Math.random(),
        productId: p.id,
        productName: p.name,
        supermarket: p.supermarket,
        brand: p.brand,
        oldPrice,
        newPrice: p.publishedPrice,
        changePercent: changePct,
        type: p.publishedPrice > oldPrice ? 'increase' : 'decrease',
        createdAt: new Date().toISOString(),
      });
    }
    existingMap.set(p.id, p);
  }

  const newHistory: PriceHistoryEntry[] = [
    ...products.map(p => ({
      date: p.scrapedAt,
      productId: p.id,
      name: p.name,
      brand: p.brand,
      supermarket: p.supermarket,
      price: p.publishedPrice,
    })),
    ...store.history,
  ].slice(0, 1000);

  writeStore({
    generatedAt: new Date().toISOString(),
    items: [...existingMap.values()],
    history: newHistory,
    alerts: [...newAlerts, ...store.alerts].slice(0, 200),
  });

  return newAlerts;
}

// ── DB schema init ────────────────────────────────────────────────────────────

export async function initDB() {
  if (!isDbAvailable()) return;
  const sql = getSQL();
  await sql`CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, brand TEXT NOT NULL, supermarket TEXT NOT NULL,
    published_price NUMERIC, regular_price NUMERIC, offer_price NUMERIC, discount NUMERIC,
    pvp_sugerido NUMERIC, gap_percent NUMERIC, url TEXT, image_url TEXT,
    scraped_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS price_history (
    id SERIAL PRIMARY KEY, product_id TEXT NOT NULL, name TEXT NOT NULL,
    brand TEXT NOT NULL, supermarket TEXT NOT NULL, price NUMERIC NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS alerts (
    id SERIAL PRIMARY KEY, product_id TEXT NOT NULL, product_name TEXT NOT NULL,
    supermarket TEXT NOT NULL, brand TEXT NOT NULL, old_price NUMERIC NOT NULL,
    new_price NUMERIC NOT NULL, change_percent NUMERIC NOT NULL, type TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW())`;
  await sql`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
    name TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ DEFAULT NOW())`;
}

// ── public API ─────────────────────────────────────────────────────────────────

export async function upsertProducts(products: Product[]): Promise<Alert[]> {
  if (!isDbAvailable()) {
    return upsertProductsToFile(products);
  }
  const sql = getSQL();
  await initDB();
  const newAlerts: Alert[] = [];
  for (const p of products) {
    const existing = await sql`SELECT published_price FROM products WHERE id = ${p.id}`;
    const oldPrice = existing[0]?.published_price ? Number(existing[0].published_price) : null;
    await sql`INSERT INTO products (id,name,brand,supermarket,published_price,regular_price,offer_price,discount,pvp_sugerido,gap_percent,url,image_url,scraped_at)
      VALUES (${p.id},${p.name},${p.brand},${p.supermarket},${p.publishedPrice},${p.regularPrice},${p.offerPrice},${p.discount},${p.pvpSugerido},${p.gapPercent},${p.url},${p.imageUrl},${p.scrapedAt})
      ON CONFLICT (id) DO UPDATE SET published_price=${p.publishedPrice},regular_price=${p.regularPrice},
      offer_price=${p.offerPrice},discount=${p.discount},gap_percent=${p.gapPercent},
      url=${p.url},image_url=${p.imageUrl},scraped_at=${p.scrapedAt}`;
    await sql`INSERT INTO price_history (product_id,name,brand,supermarket,price,recorded_at)
      VALUES (${p.id},${p.name},${p.brand},${p.supermarket},${p.publishedPrice},${p.scrapedAt})`;
    if (oldPrice && Math.abs(p.publishedPrice - oldPrice) / oldPrice > 0.005) {
      const changePct = Math.round(((p.publishedPrice - oldPrice) / oldPrice) * 100);
      const type = p.publishedPrice > oldPrice ? 'increase' : 'decrease';
      const res = await sql`INSERT INTO alerts (product_id,product_name,supermarket,brand,old_price,new_price,change_percent,type)
        VALUES (${p.id},${p.name},${p.supermarket},${p.brand},${oldPrice},${p.publishedPrice},${changePct},${type}) RETURNING *`;
      if (res[0]) newAlerts.push(rowToAlert(res[0]));
    }
  }
  return newAlerts;
}

export async function getAllProducts(): Promise<Product[]> {
  if (!isDbAvailable()) {
    return readStore().items;
  }
  const sql = getSQL();
  await initDB();
  const rows = await sql`SELECT * FROM products ORDER BY brand, name, supermarket`;
  return rows.map(rowToProduct);
}

export async function updatePVP(id: string, pvp: number) {
  if (!isDbAvailable()) {
    const store = readStore();
    store.items = store.items.map(p =>
      p.id === id ? { ...p, pvpSugerido: pvp, gapPercent: p.publishedPrice > 0 ? Math.round(((pvp - p.publishedPrice) / pvp) * 100) : null } : p
    );
    writeStore(store);
    return;
  }
  const sql = getSQL();
  await sql`UPDATE products SET pvp_sugerido=${pvp}, gap_percent=ROUND(((${pvp}-published_price)/${pvp})*100) WHERE id=${id}`;
}

export async function getHistory(limit = 500): Promise<PriceHistoryEntry[]> {
  if (!isDbAvailable()) {
    return readStore().history.slice(0, limit);
  }
  const sql = getSQL();
  await initDB();
  const rows = await sql`SELECT * FROM price_history ORDER BY recorded_at DESC LIMIT ${limit}`;
  return rows.map(r => ({ date: r.recorded_at, productId: r.product_id, name: r.name, brand: r.brand, supermarket: r.supermarket, price: Number(r.price) }));
}

export async function getAlerts(limit = 100): Promise<Alert[]> {
  if (!isDbAvailable()) {
    return readStore().alerts.slice(0, limit);
  }
  const sql = getSQL();
  await initDB();
  const rows = await sql`SELECT * FROM alerts ORDER BY created_at DESC LIMIT ${limit}`;
  return rows.map(rowToAlert);
}

export async function getUserByEmail(email: string): Promise<(User & { password_hash: string }) | null> {
  if (!isDbAvailable()) return null;
  const sql = getSQL();
  await initDB();
  const rows = await sql`SELECT * FROM users WHERE email=${email}`;
  return rows[0] ? { ...rowToUser(rows[0]), password_hash: rows[0].password_hash } : null;
}

export async function createUser(email: string, passwordHash: string, name: string, role = 'user') {
  if (!isDbAvailable()) return;
  const sql = getSQL();
  await initDB();
  await sql`INSERT INTO users (email,password_hash,name,role) VALUES (${email},${passwordHash},${name},${role}) ON CONFLICT (email) DO NOTHING`;
}

export async function getAllUsers(): Promise<User[]> {
  if (!isDbAvailable()) return [];
  const sql = getSQL();
  await initDB();
  const rows = await sql`SELECT id,email,name,role,created_at FROM users ORDER BY created_at DESC`;
  return rows.map(rowToUser);
}

function rowToProduct(r: any): Product {
  return { id: r.id, name: r.name, brand: r.brand, supermarket: r.supermarket,
    publishedPrice: Number(r.published_price), regularPrice: r.regular_price ? Number(r.regular_price) : null,
    offerPrice: r.offer_price ? Number(r.offer_price) : null, discount: r.discount ? Number(r.discount) : null,
    pvpSugerido: r.pvp_sugerido ? Number(r.pvp_sugerido) : null, gapPercent: r.gap_percent ? Number(r.gap_percent) : null,
    url: r.url || '', imageUrl: r.image_url || '', scrapedAt: r.scraped_at };
}
function rowToAlert(r: any): Alert {
  return { id: r.id, productId: r.product_id, productName: r.product_name, supermarket: r.supermarket,
    brand: r.brand, oldPrice: Number(r.old_price), newPrice: Number(r.new_price),
    changePercent: Number(r.change_percent), type: r.type, createdAt: r.created_at };
}
function rowToUser(r: any): User {
  return { id: r.id, email: r.email, name: r.name, role: r.role, createdAt: r.created_at };
}
