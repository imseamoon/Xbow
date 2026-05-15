import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsersAndApiKeys1710000000000 implements MigrationInterface {
  name = 'AddUsersAndApiKeys1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"          uuid            NOT NULL,
        "email"       varchar         NOT NULL,
        "name"        varchar         NOT NULL,
        "password"    varchar         NOT NULL,
        "createdAt"   TIMESTAMP       NOT NULL DEFAULT now(),
        "updatedAt"   TIMESTAMP       NOT NULL DEFAULT now(),
        CONSTRAINT "PK_users" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_users_email" UNIQUE ("email")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "api_keys" (
        "id"          uuid            NOT NULL,
        "userId"      uuid            NOT NULL,
        "name"        varchar         NOT NULL,
        "keyPrefix"   varchar(8)      NOT NULL,
        "keyHash"     varchar         NOT NULL,
        "lastUsedAt"  TIMESTAMP,
        "createdAt"   TIMESTAMP       NOT NULL DEFAULT now(),
        "revokedAt"   TIMESTAMP,
        CONSTRAINT "PK_api_keys" PRIMARY KEY ("id")
      );
    `);

    // FK — api_keys.userId → users.id
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_api_keys_userId'
            AND table_name = 'api_keys'
        ) THEN
          ALTER TABLE "api_keys"
            ADD CONSTRAINT "FK_api_keys_userId"
            FOREIGN KEY ("userId")
            REFERENCES "users"("id")
            ON DELETE CASCADE
            ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);

    // Indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_email" ON "users" ("email");
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_api_keys_userId" ON "api_keys" ("userId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "api_keys";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users";`);
  }
}
