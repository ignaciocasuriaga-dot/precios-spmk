import { getAllProducts } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const format = searchParams.get('format') || 'csv';
  const products = await getAllProducts();
  const date = new Date().toISOString().slice(0, 10);

  const headers = ['Producto','Marca','Supermercado','Precio Publicado','Precio Regular','Precio Oferta','% Descuento','PVP Sugerido','GAP %','URL','Fecha'];
  const rows = products.map(p => [p.name, p.brand, p.supermarket, p.publishedPrice, p.regularPrice??'', p.offerPrice??'', p.discount??'', p.pvpSugerido??'', p.gapPercent??'', p.url, p.scrapedAt]);

  if (format === 'csv') {
    const csv = [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="precios-uy-${date}.csv"` } });
  }

  const tsv = '\uFEFF' + [headers, ...rows].map(r => r.join('\t')).join('\n');
  return new Response(tsv, { headers: { 'Content-Type': 'application/vnd.ms-excel', 'Content-Disposition': `attachment; filename="precios-uy-${date}.xls"` } });
}
