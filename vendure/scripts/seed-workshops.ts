/**
 * Dev seed script: creates workshop Products and, for each, one ProductVariant per
 * scheduled occurrence - the native Product/Variant modelling used since the workshop
 * plugin was slimmed down to just custom fields + the conditional shipping order process.
 *
 * For each Product the custom field `requiresShipping` is set to `false` (ticket/virtual
 * product); each Variant carries the scheduling data (`startsAt`, `endsAt`, `location`)
 * in its custom fields, with `stockOnHand` = capacity and `trackInventory` = TRUE so
 * Vendure's own stock engine enforces the seat limit.
 *
 * This exercises the real `ProductService`/`ProductVariantService` APIs (never raw
 * repository inserts) and produces realistic sample data for local development, the
 * frontend calendar UI and the Playwright e2e tests.
 *
 * Test-case coverage:
 *  - >= 2 events landing on the SAME calendar day (2026-09-05, across two workshops).
 *  - Several events spread across multiple distinct FUTURE dates.
 *  - One event in the PAST (to confirm the storefront range query excludes it).
 *  - One event with no `endsAt` (still has a `startsAt`, so still schedulable).
 *
 * Idempotent (good enough for repeated local dev runs): a Product is skipped if one with
 * the same slug already exists; a Variant is skipped if one already exists for the same
 * Product with the same SKU.
 *
 * Usage:
 *   npx ts-node scripts/seed-workshops.ts
 *
 * Note: use ts-node, not tsx - tsx transpiles via esbuild, which doesn't emit real
 * `design:type` decorator metadata that this app's TypeORM entities rely on.
 */
import 'dotenv/config';
import { GlobalFlag } from '@vendure/common/lib/generated-types';
import {
    bootstrap,
    ConfigService,
    Product,
    ProductOption,
    ProductOptionGroup,
    ProductOptionGroupService,
    ProductOptionService,
    ProductService,
    ProductVariant,
    ProductVariantService,
    RequestContextService,
    TaxCategoryService,
    TransactionalConnection,
    User,
} from '@vendure/core';

import { config } from '../src/vendure-config';

const LOCATION = 'Melinda Pötöndi Kerámia Műhely – 1074 Budapest, Dohány utca 20.';

interface WorkshopSeed {
    title: string;
    slug: string;
    description: string;
    priceInCents: number;
}

interface OccurrenceSeed {
    slug: string;
    startsAt: string;
    endsAt?: string;
    capacity: number;
    /** For console logging only - not persisted anywhere. */
    note: string;
}

const WORKSHOPS: WorkshopSeed[] = [
    {
        title: 'Korongozás kezdőknek',
        slug: 'korongozas-kezdoknek',
        description:
            'Ismerkedj meg a fazekaskorong alapjaival! Ezen a kezdő szintű workshopon lépésről lépésre ' +
            'elsajátítod a korongozás technikáját, és elkészítheted saját első agyagedényedet szakértő ' +
            'vezetéssel. Előzetes tapasztalat nem szükséges.',
        priceInCents: 1_200_000, // 12 000 HUF
    },
    {
        title: 'Mázazás és díszítés workshop',
        slug: 'mazazas-es-diszites',
        description:
            'Már kiégetett, mázazásra váró kerámia tárgyakat díszíthetsz ezen a workshopon. Megismerkedhetsz ' +
            'a különböző mázazási technikákkal és mintázási módszerekkel.',
        priceInCents: 900_000, // 9 000 HUF
    },
];

const OCCURRENCES: OccurrenceSeed[] = [
    // --- PAST event: must NOT show up via the range/upcoming views ---
    {
        slug: 'korongozas-kezdoknek',
        startsAt: '2026-08-10T09:00:00Z',
        endsAt: '2026-08-10T11:00:00Z',
        capacity: 6,
        note: 'PAST - excluded from range query',
    },
    // --- multi-event day: two events on 2026-09-05, across different workshops ---
    {
        slug: 'korongozas-kezdoknek',
        startsAt: '2026-09-05T09:00:00Z',
        endsAt: '2026-09-05T11:00:00Z',
        capacity: 6,
        note: 'FUTURE - multi-event day, slot 1/2 (2026-09-05 morning)',
    },
    {
        slug: 'mazazas-es-diszites',
        startsAt: '2026-09-05T14:00:00Z',
        endsAt: '2026-09-05T15:30:00Z',
        capacity: 10,
        note: 'FUTURE - multi-event day, slot 2/2 (2026-09-05 afternoon)',
    },
    // --- more future dates, spread out for the calendar view ---
    {
        slug: 'korongozas-kezdoknek',
        startsAt: '2026-09-12T09:00:00Z',
        endsAt: '2026-09-12T11:00:00Z',
        capacity: 6,
        note: 'FUTURE (2026-09-12)',
    },
    {
        slug: 'mazazas-es-diszites',
        startsAt: '2026-09-19T14:00:00Z',
        endsAt: '2026-09-19T15:30:00Z',
        capacity: 10,
        note: 'FUTURE (2026-09-19)',
    },
    // --- endsAt omitted: exercises the "still has startsAt" path ---
    {
        slug: 'mazazas-es-diszites',
        startsAt: '2026-10-03T14:00:00Z',
        capacity: 10,
        note: 'FUTURE, endsAt omitted - still schedulable via startsAt',
    },
];

/** Deterministic SKU per occurrence, mirroring the old DefaultWorkshopSkuStrategy. */
function skuForOccurrence(slug: string, startsAt: string): string {
    const d = new Date(startsAt);
    const pad = (n: number) => String(n).padStart(2, '0');
    const datePart = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
    const timePart = `${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}`;
    return `WORKSHOP-${slug}-${datePart}-${timePart}`;
}

/** Customer-facing variant name label, e.g. "2026-09-12 11:00", in Europe/Budapest time. */
function variantNameForOccurrence(startsAt: string): string {
    return new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Budapest',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    })
        .format(new Date(startsAt))
        .replace(',', '');
}

async function main() {
    const app = await bootstrap(config);

    try {
        const requestContextService = app.get(RequestContextService);
        const configService = app.get(ConfigService);
        const connection = app.get(TransactionalConnection);
        const productService = app.get(ProductService);
        const productVariantService = app.get(ProductVariantService);
        const productOptionGroupService = app.get(ProductOptionGroupService);
        const productOptionService = app.get(ProductOptionService);
        const taxCategoryService = app.get(TaxCategoryService);

        // Look up the superadmin User and attach it to the ctx so internal permission
        // checks resolve to full access (same pattern as the previous scripts).
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

        const taxCategories = await taxCategoryService.findAll(ctx);
        const taxCategory = taxCategories.items.find(t => t.isDefault) ?? taxCategories.items[0];
        const taxCategoryId = taxCategory?.id;

        const productBySlug = new Map<string, Product>();
        const optionGroupBySlug = new Map<string, ProductOptionGroup>();
        const optionBySku = new Map<string, ProductOption>();
        let productsCreated = 0;
        let productsSkipped = 0;
        let variantsCreated = 0;
        let variantsSkipped = 0;
        const createdSummaries: string[] = [];

        // ---- Step 1: Products (workshop types) ----
        console.log('=== Workshop products ===');
        for (const seed of WORKSHOPS) {
            const existing = await connection
                .getRepository(ctx, Product)
                .findOne({ where: { translations: { slug: seed.slug } } });

            if (existing) {
                console.log(`  SKIP   "${seed.title}" (slug="${seed.slug}") already exists (id=${existing.id}).`);
                productBySlug.set(seed.slug, existing);
                productsSkipped++;
                continue;
            }

            const created = await productService.create(ctx, {
                enabled: true,
                // Virtual/ticket product: check out without a shipping method.
                customFields: { requiresShipping: false },
                translations: [
                    {
                        languageCode: ctx.languageCode,
                        name: seed.title,
                        slug: seed.slug,
                        description: seed.description,
                    },
                ],
            });
            console.log(`  CREATE "${created.name}" (slug="${created.slug}", id=${created.id}).`);
            productBySlug.set(seed.slug, created as unknown as Product);
            productsCreated++;
        }

        // ---- Step 2: Option groups + options (one "Dátum" group per workshop product) ----
        // Vendure requires a ProductOptionGroup/ProductOption to distinguish multiple
        // variants on the same Product: without options a Product can only have ONE variant.
        // We model each occurrence as an option under a per-product "Dátum" group.
        console.log('\n=== Workshop option groups + options ===');
        for (const seed of WORKSHOPS) {
            const product = productBySlug.get(seed.slug)!;
            const groupCode = `${seed.slug}-datum`;

            let group = optionGroupBySlug.get(seed.slug);
            if (!group) {
                group = (await connection.getRepository(ctx, ProductOptionGroup).findOne({
                    where: { code: groupCode },
                })) ?? undefined;
            }
            if (!group) {
                group = await productOptionGroupService.create(ctx, {
                    code: groupCode,
                    translations: [{ languageCode: ctx.languageCode, name: 'Dátum' }],
                });
                console.log(`  CREATE option group "${groupCode}" (id=${group.id}).`);
            } else {
                console.log(`  SKIP   option group "${groupCode}" already exists (id=${group.id}).`);
            }
            optionGroupBySlug.set(seed.slug, group as unknown as ProductOptionGroup);

            await productService.addOptionGroupToProduct(ctx, product.id, group.id);
        }

        // ---- Step 3: ProductVariants (occurrences) ----
        console.log('\n=== Workshop variants (occurrences) ===');
        for (const occ of OCCURRENCES) {
            const product = productBySlug.get(occ.slug);
            if (!product) {
                throw new Error(`No Product found for slug "${occ.slug}" — cannot create occurrence.`);
            }
            const group = optionGroupBySlug.get(occ.slug)!;
            const sku = skuForOccurrence(occ.slug, occ.startsAt);
            const optionName = variantNameForOccurrence(occ.startsAt);

            let option = optionBySku.get(sku);
            if (!option) {
                option = (await connection.getRepository(ctx, ProductOption).findOne({
                    where: { code: sku },
                })) ?? undefined;
            }
            if (!option) {
                option = await productOptionService.create(ctx, group.id, {
                    code: sku,
                    productOptionGroupId: group.id,
                    translations: [{ languageCode: ctx.languageCode, name: optionName }],
                });
                console.log(`  CREATE option "${sku}" (id=${option.id}).`);
            } else {
                console.log(`  SKIP   option "${sku}" already exists (id=${option.id}).`);
            }
            optionBySku.set(sku, option as unknown as ProductOption);

            // SKU is globally unique across ALL variants, so check by SKU alone. This also
            // catches leftover variants provisioned by the old workshop plugin (same SKU
            // convention), which would otherwise collide on insert.
            const existingVariant = await connection.getRepository(ctx, ProductVariant).findOne({
                where: { sku },
            });

            if (existingVariant) {
                console.log(`  SKIP   ${occ.slug} @ ${occ.startsAt} already exists (sku=${sku}). [${occ.note}]`);
                variantsSkipped++;
                continue;
            }

            const [variant] = await productVariantService.create(ctx, [
                {
                    enabled: true,
                    productId: product.id,
                    sku,
                    optionIds: [option.id],
                    price: WORKSHOPS.find(w => w.slug === occ.slug)!.priceInCents,
                    stockOnHand: occ.capacity,
                    // TRUE so stock is always enforced regardless of the global
                    // trackInventory setting - a workshop's capacity limit must never be
                    // silently ignored.
                    trackInventory: GlobalFlag.TRUE,
                    taxCategoryId,
                    customFields: {
                        startsAt: occ.startsAt,
                        endsAt: occ.endsAt ?? null,
                        location: LOCATION,
                    },
                    translations: [
                        {
                            languageCode: ctx.languageCode,
                            name: optionName,
                        },
                    ],
                },
            ]);

            createdSummaries.push(
                `${occ.slug} @ ${occ.startsAt} -> sku=${variant.sku} productId=${product.id} variantId=${variant.id}`,
            );
            variantsCreated++;
        }

        // ---- Summary ----
        console.log('\n=== Summary ===');
        console.log(`Products: ${productsCreated} created, ${productsSkipped} skipped.`);
        console.log(`Variants: ${variantsCreated} created, ${variantsSkipped} skipped.`);
        if (createdSummaries.length > 0) {
            console.log('\nCreated variants (evidence):');
            for (const line of createdSummaries) {
                console.log(`  - ${line}`);
            }
        }
    } finally {
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