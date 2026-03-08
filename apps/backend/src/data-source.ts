import { DataSource } from 'typeorm';
import path from 'path';

const dirname = __dirname;

/** Obtiene SUPABASE_PROJECT_REF desde env o extrayéndolo del host (db.xxx.supabase.co) */
function getProjectRef(host?: string, url?: string): string | undefined {
  const fromEnv = process.env.SUPABASE_PROJECT_REF?.trim();
  if (fromEnv) return fromEnv;
  // Extraer de host directo: db.abcdef.supabase.co -> abcdef
  if (host) {
    const m = host.match(/^db\.([a-z0-9-]+)\.supabase\.co$/);
    if (m) return m[1];
  }
  // Extraer de URL: @db.abcdef.supabase.co
  if (url) {
    const m = url.match(/@db\.([a-z0-9-]+)\.supabase\.co/);
    if (m) return m[1];
  }
  return undefined;
}

/**
 * Normaliza DATABASE_URL para Supabase.
 * - Conexión directa: host db.xxx.supabase.co, puerto 5432, usuario "postgres".
 * - Pooler (puerto 6543): el usuario DEBE ser "postgres.PROJECT_REF" (no solo "postgres") o obtienes "Tenant or user not found".
 * - No usar la URL de la API (https://xxx.supabase.co) como host de Postgres.
 */
function normalizeDatabaseUrl(url: string): { useUrl: string; derivedHost?: string } {
  const t = url.trim();
  // Si pegaron solo la URL de la API de Supabase -> no es una URL de Postgres; derivar host para uso con DB_*
  const apiMatch = t.match(/^https:\/\/([a-z0-9-]+)\.supabase\.co\/?$/);
  if (apiMatch) {
    return { useUrl: '', derivedHost: `db.${apiMatch[1]}.supabase.co` };
  }
  // Si en la URL de postgres el host está mal (ej: @https://xxx.supabase.co), corregir a db.xxx.supabase.co
  const wrongHost = t.match(/@https:\/\/([a-z0-9-]+)\.supabase\.co/);
  if (wrongHost) {
    return { useUrl: t.replace(wrongHost[0], `@db.${wrongHost[1]}.supabase.co`) };
  }
  // URL de Postgres válida (directa o pooler)
  if (t.startsWith('postgresql://') || t.startsWith('postgres://')) {
    // Pooler Supabase (puerto 6543) exige usuario "postgres.PROJECT_REF". Si solo viene "postgres", corregir.
    const isPooler = /pooler\.supabase\.com.*:6543/.test(t) || (t.includes('pooler.supabase.com') && (!t.match(/:(\d+)/) || t.includes(':6543')));
    const userMatch = t.match(/^postgres(?:ql)?:\/\/([^:]+):/);
    const user = userMatch ? userMatch[1] : '';
    const projectRef = getProjectRef(undefined, t);
    if (isPooler && user === 'postgres' && projectRef) {
      const fixed = t.replace(/^(postgres(?:ql)?:\/\/)postgres:/, `$1postgres.${projectRef}:`);
      return { useUrl: fixed };
    }
    return { useUrl: t };
  }
  return { useUrl: url };
}

function validatePoolerConfig(
  rawUrl: string | undefined,
  host: string | undefined,
  port: number,
  username: string,
): void {
  const isPooler = (rawUrl && /pooler\.supabase\.com.*:6543/.test(rawUrl)) ||
    (host?.includes('pooler.supabase.com') && port === 6543);
  if (!isPooler || username !== 'postgres') return;
  const ref = getProjectRef(host, rawUrl);
  if (ref) return;
  const msg =
    '[Supabase Pooler] Error "Tenant or user not found": con el pooler (puerto 6543) el usuario debe ser postgres.[PROJECT_REF]. ' +
    'Añade SUPABASE_PROJECT_REF en .env (Supabase > Project Settings > General > Reference ID) o usa la URI completa de Supabase (Database > Connection string > Transaction).';
  throw new Error(msg);
}

export function getDatabaseConfig(): { url?: string; host?: string; port?: number; username?: string; password?: string; database?: string } {
  const useLocalDb = process.env.USE_LOCAL_DB === 'true' || process.env.USE_LOCAL_DB === '1';
  if (useLocalDb) {
    return {
      host: 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USER ?? process.env.DB_USERNAME ?? 'admin',
	  password: process.env.DB_PASSWORD,
	  database: process.env.DB_NAME ?? process.env.DB_DATABASE ?? 'postgres',    };
  }

  // Si el host directo da ENOTFOUND, usa DATABASE_POOLER_URL (Supabase > Database > Connection string > Transaction)
  const poolerUrl = process.env.DATABASE_POOLER_URL?.trim();
  const rawUrl = poolerUrl || process.env.DATABASE_URL;
  const { useUrl, derivedHost } = rawUrl ? normalizeDatabaseUrl(rawUrl) : { useUrl: '', derivedHost: undefined };

  if (useUrl) {
    if (/pooler\.supabase\.com.*:6543/.test(useUrl)) {
      const userMatch = useUrl.match(/^postgres(?:ql)?:\/\/([^:]+):/);
      const user = userMatch ? userMatch[1] : '';
      if (user === 'postgres') {
        const ref = getProjectRef(undefined, useUrl);
        if (!ref) {
          throw new Error(
            '[Supabase Pooler] "Tenant or user not found": con el pooler (puerto 6543) el usuario debe ser postgres.[PROJECT_REF]. ' +
            'Añade SUPABASE_PROJECT_REF en .env (Supabase > Project Settings > General > Reference ID) o usa la URI completa (Database > Connection string > Transaction).',
          );
        }
      }
    }
    return { url: useUrl };
  }
  const host = process.env.DB_HOST ?? derivedHost ?? 'localhost';
  let username = process.env.DB_USER ?? process.env.DB_USERNAME ?? 'admin';
  const port = parseInt(process.env.DB_PORT ?? '5432', 10);
  validatePoolerConfig(rawUrl, host, port, username);
  // Pooler Supabase (6543) exige usuario postgres.PROJECT_REF
  if (host.includes('pooler.supabase.com') && port === 6543 && username === 'postgres') {
    const ref = getProjectRef(host, rawUrl);
    if (ref) username = `postgres.${ref}`;
  }
  return {
    host,
    port,
    username,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME ?? process.env.DB_DATABASE ?? 'postgres',  };
}

export function isSupabaseHost(host?: string, url?: string): boolean {
  if (host && (host.includes('supabase.co') || host.includes('pooler.supabase.com'))) return true;
  if (url && (url.includes('supabase.co') || url.includes('pooler.supabase.com'))) return true;
  return false;
}

export const AppDataSource = new DataSource({
  type: 'postgres',
  ...getDatabaseConfig(),
  ssl: (() => {
    const cfg = getDatabaseConfig();
    const useSsl = process.env.DB_SSL === 'true' || process.env.DB_SSL === '1';
    if (useSsl) return { rejectUnauthorized: false };
    if (isSupabaseHost(cfg.host, cfg.url)) return { rejectUnauthorized: false };
    return false;
  })(),
  extra: { options: '-c timezone=America/Guayaquil' },
  entities: [path.join(dirname, '**', '*.entity.{ts,js}')],
  migrations: [path.join(dirname, 'migrations', '*.{ts,js}')],
  synchronize: false,
});
