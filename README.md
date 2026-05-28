# PrecioUY — Monitor de Precios Supermercados Uruguay

## SETUP (solo una vez, 5 minutos)

### Paso 1 — Subir archivos a GitHub
Subí todos los archivos de este ZIP a tu repo de GitHub tal como están.

### Paso 2 — Crear base de datos en Vercel
1. Entrá a vercel.com → tu proyecto → pestaña **Storage**
2. Click **Create Database** → **Postgres** → nombre cualquiera → **Create**
3. Vercel agrega las variables de entorno automáticamente ✓

### Paso 3 — Agregar variable JWT_SECRET
1. En tu proyecto de Vercel → **Settings** → **Environment Variables**
2. Agregar: `JWT_SECRET` = (cualquier texto largo, ej: `precio-uy-2024-super-secreto-xyz`)
3. Click **Save**

### Paso 4 — Redeploy
1. **Deployments** → click en los 3 puntos del último deploy → **Redeploy**
2. Esperar 2 minutos → listo ✓

---

## USO DIARIO

1. Entrar a tu URL de Vercel
2. **Registrarte** con tu email (primera cuenta = usuario normal)
3. Hacer click en **Actualizar** para ejecutar el scraping
4. Los datos se guardan automáticamente

## HACER ADMIN A TU USUARIO (una vez)

Después de registrarte, ir a Vercel → **Storage** → tu base de datos → **Query**:
```sql
UPDATE users SET role = 'admin' WHERE email = 'tu@email.com';
```

---

## AGREGAR UN NUEVO SUPERMERCADO

1. Copiar `src/lib/scrapers/eldorado.ts`
2. Renombrarlo con el nuevo nombre
3. Cambiar BASE_URL y el nombre del supermercado
4. Agregarlo en `src/lib/scrapers/index.ts`
5. Subir a GitHub → deploy automático

---

## ARCHIVOS PRINCIPALES

| Archivo | Qué hace |
|---|---|
| `src/app/page.tsx` | Página principal |
| `src/lib/scrapers/` | Un archivo por supermercado |
| `src/lib/db.ts` | Base de datos |
| `src/components/` | Pantallas: tabla, comparador, alertas, etc |
