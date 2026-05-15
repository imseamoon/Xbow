import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Creates a default admin user (if none exist) and backfills userId for
 * all existing scans that have a NULL userId, so they are visible to
 * authenticated users.
 *
 * Default credentials:
 *   email:    admin@redsentinel.local
 *   password: admin123  (CHANGE THIS AFTER FIRST LOGIN)
 *
 * This migration is idempotent and safe to run multiple times.
 */
export class BackfillScanOwner1730000000000 implements MigrationInterface {
  name = 'BackfillScanOwner1730000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Create the default admin user if no users exist ────────────────
    // bcrypt hash for "admin123" (cost=12)
    const adminHash = '$2b$12$pQj7kEp31sePm8UfWdnfc.8chIfOFrKkdC5OWdo8eC1m1jbHST38q';

    // Only insert admin if there are zero users (don't clobber existing accounts)
    await queryRunner.query(`
      INSERT INTO "users" ("id", "email", "name", "password", "createdAt", "updatedAt")
      SELECT
        '00000000-0000-0000-0000-000000000001',
        'admin@redsentinel.local',
        'Admin',
        '${adminHash}',
        NOW(),
        NOW()
      WHERE NOT EXISTS (SELECT 1 FROM "users" LIMIT 1);
    `);

    // ── Backfill userId for orphaned scans ────────────────────────────
    // Assign any scan with NULL userId to the admin user (or first user)
    await queryRunner.query(`
      UPDATE "scans"
      SET "userId" = (
        SELECT "id" FROM "users" ORDER BY "createdAt" ASC LIMIT 1
      )
      WHERE "userId" IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert: set userId back to NULL for scans owned by the default admin
    await queryRunner.query(`
      UPDATE "scans"
      SET "userId" = NULL
      WHERE "userId" = '00000000-0000-0000-0000-000000000001';
    `);

    // Remove the default admin user (only if no other users reference it)
    await queryRunner.query(`
      DELETE FROM "users"
      WHERE "id" = '00000000-0000-0000-0000-000000000001'
        AND NOT EXISTS (
          SELECT 1 FROM "scans" WHERE "userId" = '00000000-0000-0000-0000-000000000001'
        );
    `);
  }
}
