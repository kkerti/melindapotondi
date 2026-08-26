/**
 * Dev seed script: creates sample Workshop templates and WorkshopEvent
 * occurrences via the real `WorkshopService`/`WorkshopEventService` APIs
 * (never raw repository inserts) - which is what actually exercises the
 * auto-provisioning of a Product + ProductVariant (in the `workshops`
 * Channel) for every WorkshopEvent, the same path the admin API will hit in
 * production.
 *
 * Why this matters: the `vendure-workshop` plugin (entities, services,
 * `WorkshopSkuStrategy`, the conditional-shipping `OrderProcess`, and the
 * auto-provisioning logic) was reworked across several commits but never
 * actually exercised end-to-end. This script is effectively the first
 * integration test of that whole chain, and it also produces realistic
 * sample data for local development and for the frontend calendar UI /
 * Playwright e2e tests to run against.
 *
 * Test-case coverage (see the `EVENTS` array below for which entry covers
 * which case):
 *  - >= 2 events landing on the SAME calendar day (2026-09-05, across two
 *    different workshops), for the "multiple events per day" calendar case.
 *  - Several events spread across multiple distinct FUTURE dates.
 *  - One event in the PAST, to confirm `WorkshopEventService.findUpcoming()`
 *    (and any shop-facing query built on it) correctly excludes it.
 *  - One event with `isPublished: false`, to confirm it doesn't leak into
 *    shop-facing queries.
 *  - One event with `capacity`/`endsAt` omitted, to exercise the
 *    "inherit from the Workshop template" defaulting logic in
 *    `WorkshopEventService.create()`.
 *
 * Prerequisite: `scripts/setup-workshops-channel.ts` must already have been
 * run (the `workshops` Channel + Barion PaymentMethod assignment must
 * exist) - `WorkshopEventService.create()` provisions Products/ProductVariants
 * into that Channel and will throw if it's missing.
 *
 * Usage:
 *   npx ts-node scripts/seed-workshops.ts
 *
 * Note: use ts-node, not tsx - see `setup-workshops-channel.ts`'s header
 * comment for why (tsx transpiles via esbuild, which doesn't emit real
 * `design:type` decorator metadata that this app's TypeORM entities rely
 * on).
 *
 * Idempotent (good enough for repeated local dev runs, not bulletproof):
 * Workshops are skipped if one with the same `slug` already exists;
 * WorkshopEvents are skipped if one already exists for the same Workshop at
 * the exact same `startsAt`.
 */
import 'dotenv/config';
import {
    bootstrap,
    ConfigService,
    ProductVariant,
    RequestContextService,
    TransactionalConnection,
    User,
} from '@vendure/core';

import { config } from '../src/vendure-config';
import { Workshop } from '../src/plugins/vendure-workshop/entities/workshop.entity';
import { WorkshopEvent } from '../src/plugins/vendure-workshop/entities/workshop-event.entity';
import { WorkshopService } from '../src/plugins/vendure-workshop/services/workshop.service';
import { WorkshopEventService } from '../src/plugins/vendure-workshop/services/workshop-event.service';
import { CreateWorkshopEventInput, CreateWorkshopInput } from '../src/plugins/vendure-workshop/types';

const LOCATION = 'Melinda Pötöndi Kerámia Műhely – 1074 Budapest, Dohány utca 20.';

const WORKSHOPS: CreateWorkshopInput[] = [
    {
        title: 'Korongozás kezdőknek',
        slug: 'korongozas-kezdoknek',
        description:
            'Ismerkedj meg a fazekaskorong alapjaival! Ezen a kezdő szintű workshopon lépésről lépésre ' +
            'elsajátítod a korongozás technikáját, és elkészítheted saját első agyagedényedet szakértő ' +
            'vezetéssel. Előzetes tapasztalat nem szükséges, minden szükséges eszközt és agyagot biztosítunk.',
        defaultDurationMinutes: 120,
        defaultCapacity: 6,
        defaultPriceInCents: 1_200_000, // 12 000 HUF
    },
    {
        title: 'Mázazás és díszítés workshop',
        slug: 'mazazas-es-diszites',
        description:
            'Már kiégetett, mázazásra váró kerámia tárgyakat díszíthetsz ezen a workshopon. Megismerkedhetsz ' +
            'a különböző mázazási technikákkal és mintázási módszerekkel - tökéletes választás azoknak, akik ' +
            'szeretnék kiegészíteni egy korábbi korongozós vagy kézépítéses alkotásukat egyedi mázzal.',
        defaultDurationMinutes: 90,
        defaultCapacity: 10,
        defaultPriceInCents: 900_000, // 9 000 HUF
    },
];

interface EventSeed {
    workshopSlug: string;
    startsAt: Date;
    endsAt?: Date;
    capacity?: number;
    isPublished?: boolean;
    /** For console logging only - not persisted anywhere. */
    note: string;
}

const EVENTS: EventSeed[] = [
    // --- PAST event: must NOT show up via findUpcoming() ---
    {
        workshopSlug: 'korongozas-kezdoknek',
        startsAt: new Date('2026-08-10T09:00:00Z'),
        endsAt: new Date('2026-08-10T11:00:00Z'),
        capacity: 6,
        note: 'PAST - should be excluded from findUpcoming()',
    },
    // --- multi-event day: two events on 2026-09-05, across different workshops ---
    {
        workshopSlug: 'korongozas-kezdoknek',
        startsAt: new Date('2026-09-05T09:00:00Z'),
        endsAt: new Date('2026-09-05T11:00:00Z'),
        capacity: 6,
        note: 'FUTURE - multi-event day, slot 1/2 (2026-09-05 morning)',
    },
    {
        workshopSlug: 'mazazas-es-diszites',
        startsAt: new Date('2026-09-05T14:00:00Z'),
        endsAt: new Date('2026-09-05T15:30:00Z'),
        capacity: 10,
        note: 'FUTURE - multi-event day, slot 2/2 (2026-09-05 afternoon)',
    },
    // --- more future dates, spread out for the calendar view ---
    {
        workshopSlug: 'korongozas-kezdoknek',
        startsAt: new Date('2026-09-12T09:00:00Z'),
        endsAt: new Date('2026-09-12T11:00:00Z'),
        capacity: 6,
        note: 'FUTURE (2026-09-12)',
    },
    {
        workshopSlug: 'mazazas-es-diszites',
        startsAt: new Date('2026-09-19T14:00:00Z'),
        endsAt: new Date('2026-09-19T15:30:00Z'),
        capacity: 10,
        note: 'FUTURE (2026-09-19)',
    },
    // --- unpublished event: must NOT leak into shop-facing queries ---
    {
        workshopSlug: 'korongozas-kezdoknek',
        startsAt: new Date('2026-09-26T09:00:00Z'),
        endsAt: new Date('2026-09-26T11:00:00Z'),
        capacity: 6,
        isPublished: false,
        note: 'FUTURE, UNPUBLISHED - should be excluded from shop queries',
    },
    // --- capacity/endsAt omitted: exercises inherit-from-Workshop defaulting ---
    {
        workshopSlug: 'mazazas-es-diszites',
        startsAt: new Date('2026-10-03T14:00:00Z'),
        note: 'FUTURE, capacity/endsAt omitted - inherits from Workshop template',
    },
];

async function main() {
    const app = await bootstrap(config);

    try {
        const requestContextService = app.get(RequestContextService);
        const configService = app.get(ConfigService);
        const connection = app.get(TransactionalConnection);
        const workshopService = app.get(WorkshopService);
        const workshopEventService = app.get(WorkshopEventService);

        // Same pattern as `setup-workshops-channel.ts`: look up the superadmin User
        // and attach it to the ctx so any internal permission checks in the services
        // we call resolve to full access, rather than a no-user ctx's zero permissions.
        const { superadminCredentials } = configService.authOptions;
        const superAdminUser = await connection.rawConnection.getRepository(User).findOne({
            where: { identifier: superadminCredentials.identifier },
        });
        if (!superAdminUser) {
            throw new Error(
                `Could not find the superadmin User (identifier="${superadminCredentials.identifier}") — cannot build an authorized RequestContext.`,
            );
        }
        const ctx = await requestContextService.create({ apiType: 'admin', user: superAdminUser });

        // ---- Step 1: Workshop templates ----
        console.log('=== Workshop templates ===');
        const workshopBySlug = new Map<string, Workshop>();
        let workshopsCreated = 0;
        let workshopsSkipped = 0;

        for (const input of WORKSHOPS) {
            const existing = await connection
                .getRepository(ctx, Workshop)
                .findOne({ where: { slug: input.slug } });

            if (existing) {
                console.log(`  SKIP   "${input.title}" (slug="${input.slug}") already exists (id=${existing.id}).`);
                workshopBySlug.set(input.slug, existing);
                workshopsSkipped++;
                continue;
            }

            const created = await workshopService.create(ctx, input);
            console.log(`  CREATE "${created.title}" (slug="${created.slug}", id=${created.id}).`);
            workshopBySlug.set(input.slug, created);
            workshopsCreated++;
        }

        // ---- Step 2: Workshop events ----
        console.log('\n=== Workshop events ===');
        let eventsCreated = 0;
        let eventsSkipped = 0;
        const createdEventSummaries: string[] = [];

        for (const seed of EVENTS) {
            const workshop = workshopBySlug.get(seed.workshopSlug);
            if (!workshop) {
                throw new Error(`No Workshop found for slug "${seed.workshopSlug}" — cannot create event.`);
            }

            const existing = await connection.getRepository(ctx, WorkshopEvent).findOne({
                where: { workshop: { id: workshop.id }, startsAt: seed.startsAt },
            });

            if (existing) {
                console.log(
                    `  SKIP   ${workshop.title} @ ${seed.startsAt.toISOString()} already exists (id=${existing.id}). [${seed.note}]`,
                );
                eventsSkipped++;
                continue;
            }

            const input: CreateWorkshopEventInput = {
                workshopId: workshop.id,
                startsAt: seed.startsAt,
                endsAt: seed.endsAt,
                location: LOCATION,
                capacity: seed.capacity,
                isPublished: seed.isPublished ?? true,
            };
            const created = await workshopEventService.create(ctx, input);

            const variant = created.productVariantId
                ? await connection
                      .getRepository(ctx, ProductVariant)
                      .findOne({ where: { id: created.productVariantId } })
                : null;

            console.log(
                `  CREATE ${workshop.title} @ ${seed.startsAt.toISOString()} (id=${created.id}) [${seed.note}]\n` +
                    `           sku=${variant?.sku ?? '(unknown)'} productId=${created.productId} ` +
                    `productVariantId=${created.productVariantId} capacity=${created.capacity} ` +
                    `endsAt=${created.endsAt.toISOString()} isPublished=${created.isPublished}`,
            );
            createdEventSummaries.push(
                `${workshop.title} @ ${seed.startsAt.toISOString()} -> sku=${variant?.sku ?? '(unknown)'} ` +
                    `productId=${created.productId} productVariantId=${created.productVariantId}`,
            );
            eventsCreated++;
        }

        // ---- Summary ----
        console.log('\n=== Summary ===');
        console.log(`Workshops: ${workshopsCreated} created, ${workshopsSkipped} skipped (already existed).`);
        console.log(`Events:    ${eventsCreated} created, ${eventsSkipped} skipped (already existed).`);
        if (createdEventSummaries.length > 0) {
            console.log('\nCreated events (evidence that auto-provisioning ran):');
            for (const line of createdEventSummaries) {
                console.log(`  - ${line}`);
            }
        }
    } finally {
        // bootstrap() starts the HTTP listener; make sure the script exits cleanly.
        await app.close();
    }
}

main()
    .then(() => {
        console.log('\nDone.');
        process.exit(0);
    })
    .catch(err => {
        console.error('seed-workshops script failed:', err);
        process.exit(1);
    });
