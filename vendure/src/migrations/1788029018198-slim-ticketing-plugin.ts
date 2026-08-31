import { MigrationInterface, QueryRunner } from 'typeorm';

export class SlimTicketingPlugin1788029018198 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<any> {
        // The workshop/workshop_event entities were removed from the plugin in favour of
        // modelling workshops as Products and scheduled occurrences as ProductVariants. Drop
        // their tables (the workshop_event FK to workshop is dropped with the table).
        await queryRunner.query(
            `ALTER TABLE "workshop_event" DROP CONSTRAINT "FK_17146c674c84dd1136381325c07"`,
            undefined,
        );
        await queryRunner.query(`DROP INDEX "public"."IDX_17146c674c84dd1136381325c0"`, undefined);
        await queryRunner.query(`DROP TABLE "workshop_event"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_06e5e3257d9df8324199041e1d"`, undefined);
        await queryRunner.query(`DROP TABLE "workshop"`, undefined);

        // ProductVariant custom fields carrying the event scheduling data, previously stored
        // on the removed workshop_event entity.
        await queryRunner.query(
            `ALTER TABLE "product_variant" ADD "customFieldsStartsat" timestamp`,
            undefined,
        );
        await queryRunner.query(
            `ALTER TABLE "product_variant" ADD "customFieldsEndsat" timestamp`,
            undefined,
        );
        await queryRunner.query(
            `ALTER TABLE "product_variant" ADD "customFieldsLocation" character varying`,
            undefined,
        );
    }

    public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(
            `ALTER TABLE "product_variant" DROP COLUMN "customFieldsLocation"`,
            undefined,
        );
        await queryRunner.query(
            `ALTER TABLE "product_variant" DROP COLUMN "customFieldsEndsat"`,
            undefined,
        );
        await queryRunner.query(
            `ALTER TABLE "product_variant" DROP COLUMN "customFieldsStartsat"`,
            undefined,
        );

        await queryRunner.query(
            `CREATE TABLE "workshop" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "title" character varying NOT NULL, "description" text, "slug" character varying NOT NULL, "defaultDurationMinutes" integer NOT NULL, "defaultCapacity" integer NOT NULL, "defaultPriceInCents" integer NOT NULL DEFAULT '500000', "isActive" boolean NOT NULL DEFAULT true, "id" SERIAL NOT NULL, CONSTRAINT "PK_e755b83ccf7c711f998012e1c92" PRIMARY KEY ("id"))`,
            undefined,
        );
        await queryRunner.query(
            `CREATE UNIQUE INDEX "IDX_06e5e3257d9df8324199041e1d" ON "workshop" ("slug")`,
            undefined,
        );
        await queryRunner.query(
            `CREATE TABLE "workshop_event" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "startsAt" TIMESTAMP NOT NULL, "endsAt" TIMESTAMP NOT NULL, "location" character varying NOT NULL, "capacity" integer NOT NULL, "priceInCents" integer, "isPublished" boolean NOT NULL DEFAULT true, "productId" character varying, "productVariantId" character varying, "id" SERIAL NOT NULL, "workshopId" integer, CONSTRAINT "PK_826cc9bf2f0731a37b04653716a" PRIMARY KEY ("id"))`,
            undefined,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_79dfe38a48883462c5fc2be7fd" ON "workshop_event" ("startsAt")`,
            undefined,
        );
        await queryRunner.query(
            `CREATE INDEX "IDX_17146c674c84dd1136381325c0" ON "workshop_event" ("workshopId")`,
            undefined,
        );
        await queryRunner.query(
            `ALTER TABLE "workshop_event" ADD CONSTRAINT "FK_17146c674c84dd1136381325c07" FOREIGN KEY ("workshopId") REFERENCES "workshop"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`,
            undefined,
        );
    }
}