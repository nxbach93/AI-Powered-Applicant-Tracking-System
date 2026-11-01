import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

const rawUrl = process.env.DATABASE_URL;

if (!rawUrl) {
  throw new Error(
    '[Prisma] DATABASE_URL is not set in environment variables! Please check your .env file in backend/core-api.'
  );
}

// Phân tích DATABASE_URL an toàn để cung cấp thông số tường minh cho driver adapter,
// bảo đảm luôn trích xuất đúng port (ví dụ: 3307) và hỗ trợ SSL cho Cloud Databases (Aiven, TiDB).
function buildAdapterConfig(connectionString: string) {
  try {
    const parsed = new URL(connectionString);
    const isRemote = parsed.hostname !== 'localhost' && parsed.hostname !== '127.0.0.1';
    const hasSslQuery = parsed.searchParams.has('ssl-mode') || parsed.searchParams.has('ssl') || parsed.searchParams.has('sslaccept');

    const config: any = {
      host: parsed.hostname || '127.0.0.1',
      port: parsed.port ? parseInt(parsed.port, 10) : 3306,
      user: decodeURIComponent(parsed.username || 'root'),
      password: decodeURIComponent(parsed.password || ''),
      database: parsed.pathname ? parsed.pathname.replace(/^\//, '') : 'ats_database',
      connectTimeout: 15000,
      allowPublicKeyRetrieval: true,
    };

    if (isRemote || hasSslQuery) {
      config.ssl = { rejectUnauthorized: false };
    }

    return config;
  } catch {
    return connectionString;
  }
}

const adapterConfig = buildAdapterConfig(rawUrl);
const adapter = new PrismaMariaDb(adapterConfig as any);

// Singleton pattern để phòng ngừa khởi tạo nhiều connection pool khi tsx watch hot-reload
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
