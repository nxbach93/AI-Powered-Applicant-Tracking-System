import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
const connectionUrl = process.env.DATABASE_URL || 'mysql://root:@localhost:3306/ats_database';
const adapter = new PrismaMariaDb(connectionUrl);
const prisma = new PrismaClient({ adapter });

export default prisma;
