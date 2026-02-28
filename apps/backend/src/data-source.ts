import { DataSource } from 'typeorm';
import path from 'path';

const dirname = __dirname;

/**
 * Normaliza DATABASE_URL para Supabase: la conexión directa usa host db.xxx.supabase.co
 * (puerto 5432), no la URL de la API (https://xxx.supabase.co).
 */
function normalizeDatabaseUrl(url: string): { useUrl: string; derivedHost?: string } {
  // Si pegaron solo la URL de la API de Supabase -> no es una URL de Postgres; derivar host para uso con DB_*
  const apiMatch = url.match(/^https:\/\/([^.]+\.supabase\.co)\/?$/);
  if (apiMatch) {
    return { useUrl: '', derivedHost: `db.${apiMatch[1]}` };
  }
  // Si en la URL de postgres el host está mal (ej: @https://xxx.supabase.co), corregir a db.xxx.supabase.co
  const wrongHost = url.match(/@https:\/\/([^.]+\.supabase\.co)/);
  if (wrongHost) {
    return { useUrl: url.replace(wrongHost[0], `@db.${wrongHost[1]}`) };
  }
  return { useUrl: url };
}

export function getDatabaseConfig(): { url?: string; host?: string; port?: number; username?: string; password?: string; database?: string } {
  const rawUrl = process.env.DATABASE_URL;
  const { useUrl, derivedHost } = rawUrl ? normalizeDatabaseUrl(rawUrl) : { useUrl: '', derivedHost: undefined };

  if (useUrl) {
    return { url: useUrl };
  }
  const host = process.env.DB_HOST ?? derivedHost ?? 'localhost';
  return {
    host,
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USER ?? process.env.DB_USERNAME ?? 'admin',
    password: process.env.DB_PASSWORD ?? 'adminpassword',
    database: process.env.DB_NAME ?? process.env.DB_DATABASE ?? 'erp_db',
  };
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  ...getDatabaseConfig(),
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  extra: { options: '-c timezone=America/Guayaquil' },
  entities: [path.join(dirname, '**', '*.entity.{ts,js}')],
  migrations: [path.join(dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
});
