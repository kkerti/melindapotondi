import {MigrationInterface, QueryRunner} from "typeorm";

export class ReworkedWorkshopPlugin1787776271977 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        // The old `EventBooking` entity was removed entirely as part of the workshop plugin
        // rework (no replacement entity), so it is left dangling by TypeORM's schema diff
        // (which only reconciles tables that still map to an entity). Drop it explicitly -
        // confirmed empty (0 rows) before this migration was generated.
        await queryRunner.query(`ALTER TABLE "event_booking" DROP CONSTRAINT "FK_ec151d23ae5050672ac2aaada21"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_ec151d23ae5050672ac2aaada2"`, undefined);
        await queryRunner.query(`DROP TABLE "event_booking"`, undefined);
        await queryRunner.query(`CREATE TABLE "workshop" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "title" character varying NOT NULL, "description" text, "slug" character varying NOT NULL, "defaultDurationMinutes" integer NOT NULL, "defaultCapacity" integer NOT NULL, "defaultPriceInCents" integer NOT NULL DEFAULT '500000', "isActive" boolean NOT NULL DEFAULT true, "id" SERIAL NOT NULL, CONSTRAINT "PK_e755b83ccf7c711f998012e1c92" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE UNIQUE INDEX "IDX_06e5e3257d9df8324199041e1d" ON "workshop" ("slug") `, undefined);
        await queryRunner.query(`ALTER TABLE "workshop_event" DROP COLUMN "maxParticipants"`, undefined);
        await queryRunner.query(`ALTER TABLE "workshop_event" DROP COLUMN "title"`, undefined);
        await queryRunner.query(`ALTER TABLE "workshop_event" DROP COLUMN "description"`, undefined);
        await queryRunner.query(`ALTER TABLE "workshop_event" DROP COLUMN "bookingPassword"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsRequiresshipping" boolean DEFAULT true`, undefined);
        await queryRunner.query(`ALTER TABLE "workshop_event" ADD "capacity" integer NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "workshop_event" ADD "priceInCents" integer`, undefined);
        await queryRunner.query(`ALTER TABLE "workshop_event" ADD "productId" character varying`, undefined);
        await queryRunner.query(`ALTER TABLE "workshop_event" ADD "productVariantId" character varying`, undefined);
        await queryRunner.query(`ALTER TABLE "workshop_event" ADD "workshopId" integer`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_17146c674c84dd1136381325c0" ON "workshop_event" ("workshopId") `, undefined);
        await queryRunner.query(`ALTER TABLE "workshop_event" ADD CONSTRAINT "FK_17146c674c84dd1136381325c07" FOREIGN KEY ("workshopId") REFERENCES "workshop"("id") ON DELETE RESTRICT ON UPDATE NO ACTION`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "workshop_event" DROP CONSTRAINT "FK_17146c674c84dd1136381325c07"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_17146c674c84dd1136381325c0"`, undefined);
        await queryRunner.query(`ALTER TABLE "workshop_event" DROP COLUMN "workshopId"`, undefined);
        await queryRunner.query(`ALTER TABLE "workshop_event" DROP COLUMN "productVariantId"`, undefined);
        await queryRunner.query(`ALTER TABLE "workshop_event" DROP COLUMN "productId"`, undefined);
        await queryRunner.query(`ALTER TABLE "workshop_event" DROP COLUMN "priceInCents"`, undefined);
        await queryRunner.query(`ALTER TABLE "workshop_event" DROP COLUMN "capacity"`, undefined);
        await queryRunner.query(`ALTER TABLE "product" DROP COLUMN "customFieldsRequiresshipping"`, undefined);
        await queryRunner.query(`ALTER TABLE "workshop_event" ADD "bookingPassword" character varying NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "workshop_event" ADD "description" text`, undefined);
        await queryRunner.query(`ALTER TABLE "workshop_event" ADD "title" character varying NOT NULL`, undefined);
        await queryRunner.query(`ALTER TABLE "workshop_event" ADD "maxParticipants" integer NOT NULL`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_06e5e3257d9df8324199041e1d"`, undefined);
        await queryRunner.query(`DROP TABLE "workshop"`, undefined);
        // Reverse of the manual event_booking cleanup added to up() - recreates it exactly
        // as it was defined in the original AddedWorkshop1768150343383 migration.
        await queryRunner.query(`CREATE TABLE "event_booking" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "nickname" character varying NOT NULL, "email" character varying, "id" SERIAL NOT NULL, "eventId" integer, CONSTRAINT "PK_716f35f3a0cf10115e3eb5908b1" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_ec151d23ae5050672ac2aaada2" ON "event_booking" ("eventId") `, undefined);
        await queryRunner.query(`ALTER TABLE "event_booking" ADD CONSTRAINT "FK_ec151d23ae5050672ac2aaada21" FOREIGN KEY ("eventId") REFERENCES "workshop_event"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
   }

}
