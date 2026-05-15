import 'dotenv/config';
import { DataSource } from 'typeorm';

import { ScanEntity } from './src/scan/entities/scan.entity';
import { VulnEntity } from './src/scan/entities/vuln.entity';
import { UserEntity } from './src/userauth/user.entity';

const url = process.env.DATABASE_URL;

export default new DataSource({
  type: 'postgres',

  ...(url
    ? { url }
    : {
        host: process.env.DB_HOST ?? 'localhost',
        port: Number(process.env.DB_PORT ?? 5432),
        username: process.env.DB_USER ?? 'rs',
        password: process.env.DB_PASS ?? 'rs',
        database: process.env.DB_NAME ?? 'redsentinel',
      }),

  entities: [ScanEntity, VulnEntity, UserEntity],

  migrations: [
    process.env.NODE_ENV === 'production'
      ? 'dist/migrations/*.js'
      : 'src/migrations/*.ts',
  ],

  migrationsTableName: 'typeorm_migrations',

  logging: true,

  synchronize: false,
});