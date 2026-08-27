import {
    dummyPaymentHandler,
    DefaultJobQueuePlugin,
    DefaultSchedulerPlugin,
    DefaultSearchPlugin,
    VendureConfig,
    DefaultGuestCheckoutStrategy,
    OrderByCodeAccessStrategy,
    RequestContext,
    Order,
} from '@vendure/core';
import { defaultEmailHandlers, EmailPlugin, FileBasedTemplateLoader } from '@vendure/email-plugin';
import { AssetServerPlugin } from '@vendure/asset-server-plugin';
import { GraphiqlPlugin } from '@vendure/graphiql-plugin';
import 'dotenv/config';
import path from 'path';
import { VendureBarionPlugin } from './plugins/vendure-barion/vendure-barion.plugin';
import { VendureWorkshopPlugin } from './plugins/vendure-workshop/vendure-workshop.plugin';
import { DashboardPlugin } from '@vendure/dashboard/plugin';

const IS_DEV = process.env.APP_ENV === 'dev';
const serverPort = +process.env.PORT || 3000;

/**
 * Grants access to a placed Order via its code to any requester within a
 * time window after the Order was placed, regardless of whether they are
 * logged in.
 *
 * The default DefaultOrderByCodeAccessStrategy only grants anonymous sessions
 * time-windowed access; an authenticated session that is not the Order's owner
 * is always denied. For guest checkouts (the Order has no owning user account)
 * that means the checkout return page is denied whenever the browser is logged
 * in. Treating the order code as the access secret and only enforcing the
 * time window keeps the intended "30 days" semantics while letting the return
 * page resolve the payment status for both anonymous and authenticated clients.
 */
class OrderByCodeWindowAccessStrategy implements OrderByCodeAccessStrategy {
    private readonly ttlMs: number;
    constructor(ttl: string) {
        this.ttlMs = this.parseTtl(ttl);
    }
    canAccessOrder(ctx: RequestContext, order: Order): boolean {
        const orderPlaced = order.orderPlacedAt ? +order.orderPlacedAt : 0;
        return orderPlaced > 0 && Date.now() - orderPlaced < this.ttlMs;
    }
    private parseTtl(ttl: string): number {
        const match = /^(\d+)(ms|s|m|h|d)$/.exec(ttl.trim());
        if (!match) {
            throw new Error(`Invalid TTL "${ttl}" for OrderByCodeWindowAccessStrategy`);
        }
        const value = +match[1];
        const unit = match[2];
        const multipliers: Record<string, number> = {
            ms: 1,
            s: 1000,
            m: 60_000,
            h: 3_600_000,
            d: 86_400_000,
        };
        return value * multipliers[unit];
    }
}

export const config: VendureConfig = {
    apiOptions: {
        port: serverPort,
        adminApiPath: 'admin-api',
        shopApiPath: 'shop-api',
        trustProxy: IS_DEV ? false : 1,
        // The following options are useful in development mode,
        // but are best turned off for production for security
        // reasons.
        ...(IS_DEV ? {
            adminApiDebug: true,
            shopApiDebug: true,
        } : {}),
    },
    authOptions: {
        tokenMethod: ['bearer', 'cookie'],
        superadminCredentials: {
            identifier: process.env.SUPERADMIN_USERNAME,
            password: process.env.SUPERADMIN_PASSWORD,
        },
        cookieOptions: {
          secret: process.env.COOKIE_SECRET,
        },
    },
    orderOptions: {
        guestCheckoutStrategy: new DefaultGuestCheckoutStrategy(),
        orderByCodeAccessStrategy: new OrderByCodeWindowAccessStrategy('30d'),
    },
    dbConnectionOptions: {
        type: 'postgres',
        // See the README.md "Migrations" section for an explanation of
        // the `synchronize` and `migrations` options.
        synchronize: false,
        migrations: [path.join(__dirname, './migrations/*.+(js|ts)')],
        logging: false,
        database: process.env.DB_NAME,
        schema: process.env.DB_SCHEMA,
        host: process.env.DB_HOST,
        port: +process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
    },
    paymentOptions: {
        paymentMethodHandlers: [dummyPaymentHandler],
    },
    // When adding or altering custom field definitions, the database will
    // need to be updated. See the "Migrations" section in README.md.
    customFields: {},
    plugins: [
        GraphiqlPlugin.init(),
        AssetServerPlugin.init({
            route: 'assets',
            assetUploadDir: path.join(__dirname, '../static/assets'),
            // For local dev, the correct value for assetUrlPrefix should
            // be guessed correctly, but for production it will usually need
            // to be set manually to match your production url.
            assetUrlPrefix: IS_DEV ? undefined : 'https://www.my-shop.com/assets/',
        }),
        DefaultSchedulerPlugin.init(),
        DefaultJobQueuePlugin.init({ useDatabaseForBuffer: true }),
        DefaultSearchPlugin.init({ bufferUpdates: false, indexStockStatus: true }),
        EmailPlugin.init({
            devMode: true,
            outputPath: path.join(__dirname, '../static/email/test-emails'),
            route: 'mailbox',
            handlers: defaultEmailHandlers,
            templateLoader: new FileBasedTemplateLoader(path.join(__dirname, '../static/email/templates')),
            globalTemplateVars: {
                // The following variables will change depending on your storefront implementation.
                // Here we are assuming a storefront running at http://localhost:8080.
                fromAddress: '"example" <noreply@example.com>',
                verifyEmailAddressUrl: 'http://localhost:8080/verify',
                passwordResetUrl: 'http://localhost:8080/password-reset',
                changeEmailAddressUrl: 'http://localhost:8080/verify-email-address-change'
            },
        }),
        DashboardPlugin.init({
            route: 'dashboard',
            appDir: IS_DEV
                ? path.join(__dirname, '../dist/dashboard')
                : path.join(__dirname, 'dashboard'),
        }),
        VendureBarionPlugin.init({
            posKey: process.env.BARION_POS_KEY || '',
            payeeEmail: process.env.BARION_PAYEE_EMAIL || '',
            callbackUrl: process.env.BARION_CALLBACK_URL || 'http://localhost:3000/payments/barion/callback',
            redirectUrl: process.env.BARION_REDIRECT_URL || 'http://localhost:4321/checkout/barion-return',
            sandbox: process.env.BARION_SANDBOX === 'true',
        }),
        VendureWorkshopPlugin.init({}),

    ],
};
