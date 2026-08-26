/**
 * One-off admin script: creates (idempotently) a dedicated `workshops` Channel
 * and assigns the existing `barion` PaymentMethod to it.
 *
 * Why: workshop-ticket Products/ProductVariants are assigned to this Channel
 * instead of the default channel, so they never show up in the default
 * storefront's catalog/search while remaining fully purchasable (via the
 * `workshops` channel token). For orders placed in that channel to be payable,
 * the Barion PaymentMethod must also be assigned to it.
 *
 * This script deliberately does NOT touch anything workshop-plugin-related
 * (no WorkshopService/WorkshopEventService, no `workshop`/`workshop_event`
 * tables) — those entities/tables are mid-migration and out of scope here.
 * It only uses core Vendure Channel / PaymentMethod APIs.
 *
 * Usage:
 *   npx ts-node scripts/setup-workshops-channel.ts
 *
 * Note: use ts-node, not tsx. tsx transpiles via esbuild, which does not emit
 * real design:type decorator metadata, and this app's entity graph includes
 * TypeORM entities (e.g. WorkshopEvent) that rely on emitDecoratorMetadata to
 * infer column types — that fails under tsx with a ColumnTypeUndefinedError.
 *
 * Safe to re-run: every step checks current state before mutating anything.
 */
import 'dotenv/config';
import {
    bootstrap,
    ChannelService,
    ConfigService,
    isGraphQlErrorResult,
    PaymentMethodService,
    RequestContextService,
    RoleService,
    TransactionalConnection,
    User,
} from '@vendure/core';

import { config } from '../src/vendure-config';

const WORKSHOPS_CHANNEL_TOKEN = 'workshops';
const WORKSHOPS_CHANNEL_CODE = 'workshops';
const BARION_PAYMENT_METHOD_CODE = 'barion';

async function main() {
    const app = await bootstrap(config);

    try {
        const requestContextService = app.get(RequestContextService);
        const channelService = app.get(ChannelService);
        const paymentMethodService = app.get(PaymentMethodService);
        const roleService = app.get(RoleService);
        const configService = app.get(ConfigService);
        const connection = app.get(TransactionalConnection);

        // `PaymentMethodService.assignPaymentMethodsToChannel` performs an internal
        // permission check (requires UpdatePaymentMethod/UpdateSettings on the target
        // channel). A RequestContext with no `user` resolves to zero permissions, so we
        // look up the superadmin User and attach it to the ctx — this is the same pattern
        // Vendure's own internal data-populator uses for standalone/admin scripts.
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

        // Step 1: read the real default channel's defaults, so the new channel
        // inherits sensible values instead of hardcoded ones.
        const defaultChannel = await channelService.getDefaultChannel(ctx);
        const { defaultCurrencyCode, defaultLanguageCode, pricesIncludeTax } = defaultChannel;
        const defaultTaxZoneId = defaultChannel.defaultTaxZone.id;
        const defaultShippingZoneId = defaultChannel.defaultShippingZone.id;

        console.log('Default channel found:', {
            id: defaultChannel.id,
            code: defaultChannel.code,
            token: defaultChannel.token,
            defaultCurrencyCode,
            defaultLanguageCode,
            pricesIncludeTax,
            defaultTaxZoneId,
            defaultShippingZoneId,
        });

        // Step 2/3: check if the `workshops` channel already exists.
        const allChannels = await channelService.findAll(ctx, { take: 1000 });
        let workshopsChannel = allChannels.items.find(c => c.token === WORKSHOPS_CHANNEL_TOKEN);
        let channelCreated = false;

        if (workshopsChannel) {
            console.log(
                `Channel with token "${WORKSHOPS_CHANNEL_TOKEN}" already exists (id=${workshopsChannel.id}, code=${workshopsChannel.code}) — skipping creation.`,
            );
        } else {
            console.log(`No channel with token "${WORKSHOPS_CHANNEL_TOKEN}" found — creating it.`);
            const createResult = await channelService.create(ctx, {
                code: WORKSHOPS_CHANNEL_CODE,
                token: WORKSHOPS_CHANNEL_TOKEN,
                defaultLanguageCode,
                defaultCurrencyCode,
                pricesIncludeTax,
                defaultTaxZoneId,
                defaultShippingZoneId,
            });

            if (isGraphQlErrorResult(createResult)) {
                throw new Error(
                    `Failed to create "${WORKSHOPS_CHANNEL_TOKEN}" channel: [${createResult.errorCode}] ${createResult.message}`,
                );
            }

            workshopsChannel = createResult;
            channelCreated = true;
            console.log(`Created channel "${workshopsChannel.code}" (id=${workshopsChannel.id}, token=${workshopsChannel.token}).`);
        }

        // Note: unlike the GraphQL `createChannel` mutation (whose resolver additionally
        // assigns the SuperAdmin and Customer roles to the new channel), `ChannelService.create`
        // alone does NOT grant any Role access to the new channel. Without this, the superadmin
        // user has zero permissions on the `workshops` channel, and the payment-method assignment
        // below (which does its own internal permission check) would fail with a ForbiddenError.
        // `assignRoleToChannel` -> `assignToChannels` is idempotent (skips already-assigned
        // channel ids), so it's safe to call this on every run, not just on first creation.
        const superAdminRole = await roleService.getSuperAdminRole(ctx);
        const customerRole = await roleService.getCustomerRole(ctx);
        await roleService.assignRoleToChannel(ctx, superAdminRole.id, workshopsChannel.id);
        await roleService.assignRoleToChannel(ctx, customerRole.id, workshopsChannel.id);
        console.log(
            `Ensured SuperAdmin and Customer roles are assigned to channel "${workshopsChannel.token}" (id=${workshopsChannel.id}).`,
        );

        // Step 5: find the existing `barion` PaymentMethod. Explicitly load the `channels`
        // relation (not loaded by default) so we can check channel-assignment below.
        const allPaymentMethods = await paymentMethodService.findAll(ctx, { take: 1000 }, ['channels']);
        const barionPaymentMethod = allPaymentMethods.items.find(pm => pm.code === BARION_PAYMENT_METHOD_CODE);

        if (!barionPaymentMethod) {
            console.error(
                `ERROR: No PaymentMethod with code "${BARION_PAYMENT_METHOD_CODE}" was found. Expected it to already exist (created by the Barion plugin setup). Aborting.`,
            );
            process.exit(1);
            return;
        }

        console.log(
            `Found PaymentMethod "${barionPaymentMethod.code}" (id=${barionPaymentMethod.id}, enabled=${barionPaymentMethod.enabled}).`,
        );

        // Step 6: assign the Barion PaymentMethod to the workshops channel (idempotent).
        const alreadyAssigned = barionPaymentMethod.channels?.some(c => c.id === workshopsChannel!.id) ?? false;

        if (alreadyAssigned) {
            console.log(
                `PaymentMethod "${barionPaymentMethod.code}" is already assigned to channel "${workshopsChannel.token}" — skipping assignment.`,
            );
        } else {
            await paymentMethodService.assignPaymentMethodsToChannel(ctx, {
                channelId: workshopsChannel.id,
                paymentMethodIds: [barionPaymentMethod.id],
            });
            console.log(
                `Assigned PaymentMethod "${barionPaymentMethod.code}" (id=${barionPaymentMethod.id}) to channel "${workshopsChannel.token}" (id=${workshopsChannel.id}).`,
            );
        }

        // Step 7: final summary.
        console.log('\n=== Summary ===');
        console.log(
            `Channel: id=${workshopsChannel.id} token=${workshopsChannel.token} code=${workshopsChannel.code} (${channelCreated ? 'created new' : 'already existed'})`,
        );
        console.log(
            `PaymentMethod: id=${barionPaymentMethod.id} code=${barionPaymentMethod.code} (${alreadyAssigned ? 'assignment already existed' : 'assignment created'})`,
        );
    } finally {
        // Step 8: bootstrap() starts the HTTP listener; make sure the script exits cleanly.
        await app.close();
    }
}

main()
    .then(() => {
        console.log('\nDone.');
        process.exit(0);
    })
    .catch(err => {
        console.error('setup-workshops-channel script failed:', err);
        process.exit(1);
    });
