import {MigrationInterface, QueryRunner} from "typeorm";

export class AddedWorkshop1768150343383 implements MigrationInterface {

   public async up(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`CREATE TABLE "event_booking" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "nickname" character varying NOT NULL, "email" character varying, "id" SERIAL NOT NULL, "eventId" integer, CONSTRAINT "PK_716f35f3a0cf10115e3eb5908b1" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_ec151d23ae5050672ac2aaada2" ON "event_booking" ("eventId") `, undefined);
        await queryRunner.query(`CREATE TABLE "workshop_event" ("createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "title" character varying NOT NULL, "description" text, "location" character varying NOT NULL, "startsAt" TIMESTAMP NOT NULL, "endsAt" TIMESTAMP NOT NULL, "maxParticipants" integer NOT NULL, "bookingPassword" character varying NOT NULL, "isPublished" boolean NOT NULL DEFAULT true, "id" SERIAL NOT NULL, CONSTRAINT "PK_826cc9bf2f0731a37b04653716a" PRIMARY KEY ("id"))`, undefined);
        await queryRunner.query(`CREATE INDEX "IDX_79dfe38a48883462c5fc2be7fd" ON "workshop_event" ("startsAt") `, undefined);
        await queryRunner.query(`ALTER TABLE "event_booking" ADD CONSTRAINT "FK_ec151d23ae5050672ac2aaada21" FOREIGN KEY ("eventId") REFERENCES "workshop_event"("id") ON DELETE CASCADE ON UPDATE NO ACTION`, undefined);
   }

   public async down(queryRunner: QueryRunner): Promise<any> {
        await queryRunner.query(`ALTER TABLE "event_booking" DROP CONSTRAINT "FK_ec151d23ae5050672ac2aaada21"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_79dfe38a48883462c5fc2be7fd"`, undefined);
        await queryRunner.query(`DROP TABLE "workshop_event"`, undefined);
        await queryRunner.query(`DROP INDEX "public"."IDX_ec151d23ae5050672ac2aaada2"`, undefined);
        await queryRunner.query(`DROP TABLE "event_booking"`, undefined);
   }

}
