import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds userId column to scans and creates the scan_audit_logs table.
 * All existing scans keep a NULL userId (i.e. they belong to no-one).
 */
export class AddScanUserIdAndAuditLog1720000000000 implements MigrationInterface {
  name = 'AddScanUserIdAndAuditLog1720000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Add userId column to scans ──────────────────────────────
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'scans' AND column_name = 'userId'
        ) THEN
          ALTER TABLE "scans" ADD COLUMN "userId" uuid;
        END IF;
      END
      $$;
    `);

    // ── Create scan_audit_logs table ────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "scan_audit_logs" (
        "id"          uuid            NOT NULL,
        "scanId"      uuid            NOT NULL,
        "phase"       varchar         NOT NULL,
        "step"        integer         NOT NULL DEFAULT 0,
        "message"     text            NOT NULL,
        "data"        jsonb,
        "durationMs"  integer,
        "createdAt"   TIMESTAMP       NOT NULL DEFAULT now(),
        CONSTRAINT "PK_scan_audit_logs" PRIMARY KEY ("id")
      );
    `);

    // ── Foreign key ─────────────────────────────────────────────
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints
          WHERE constraint_name = 'FK_scan_audit_logs_scanId'
            AND table_name = 'scan_audit_logs'
        ) THEN
          ALTER TABLE "scan_audit_logs"
            ADD CONSTRAINT "FK_scan_audit_logs_scanId"
            FOREIGN KEY ("scanId")
            REFERENCES "scans"("id")
            ON DELETE CASCADE
            ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);

    // ── Indexes ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_scan_audit_scanId"
        ON "scan_audit_logs" ("scanId");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_scans_userId"
        ON "scans" ("userId");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "scan_audit_logs";`);
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'scans' AND column_name = 'userId'
        ) THEN
          ALTER TABLE "scans" DROP COLUMN "userId";
        END IF;
      END
      $$;
    `);
  }
}
