import { Inject, Injectable } from '@nestjs/common';
import { Logger, Order, RequestContext } from '@vendure/core';
import { VENDURE_BARION_PLUGIN_OPTIONS, loggerCtx } from '../constants';
import {
    BarionPaymentStartRequest,
    BarionPaymentStartResponse,
    BarionPaymentStateResponse,
    Currency,
    isBarionError,
    isPaymentStartResponse,
    isPaymentStateResponse,
    Item,
    Locale,
    PaymentTransaction,
    PaymentType,
    PluginInitOptions,
} from '../types';

const BARION_API_SANDBOX = 'https://api.test.barion.com';
const BARION_API_PRODUCTION = 'https://api.barion.com';

export interface StartPaymentResult {
    success: boolean;
    paymentId?: string;
    gatewayUrl?: string;
    error?: string;
}

export interface PaymentStateResult {
    success: boolean;
    status?: string;
    total?: number;
    currency?: string;
    error?: string;
}

@Injectable()
export class BarionService {
    private readonly apiBaseUrl: string;

    constructor(@Inject(VENDURE_BARION_PLUGIN_OPTIONS) private options: PluginInitOptions) {
        this.apiBaseUrl = options.sandbox ? BARION_API_SANDBOX : BARION_API_PRODUCTION;
        Logger.info(`Barion service initialized with ${options.sandbox ? 'SANDBOX' : 'PRODUCTION'} mode`, loggerCtx);
    }

    /**
     * Start a Barion payment for the given order
     */
    async startPayment(ctx: RequestContext, order: Order): Promise<StartPaymentResult> {
        const paymentRequestId = `${order.code}-${Date.now()}`;

        // Map order lines to Barion items
        const items: Item[] = order.lines.map(line => ({
            name: line.productVariant.name,
            description: line.productVariant.sku || undefined,
            quantity: line.quantity,
            unit: 'db',
            unitPrice: line.proratedUnitPrice / 100, // Convert from cents to currency units
            itemTotal: line.proratedLinePrice / 100,
            sku: line.productVariant.sku || undefined,
        }));

        // Add shipping as an item if present
        if (order.shipping > 0) {
            items.push({
                name: 'Szállítás',
                quantity: 1,
                unit: 'db',
                unitPrice: order.shipping / 100,
                itemTotal: order.shipping / 100,
            });
        }

        // Create the main transaction
        const transaction: PaymentTransaction = {
            posTransactionId: order.code,
            payee: this.options.payeeEmail,
            total: order.totalWithTax / 100, // Convert from cents
            items,
        };

        // Determine locale from context
        const locale = this.mapLocale(ctx.languageCode);

        // Build the payment request
        const request: BarionPaymentStartRequest = {
            POSKey: this.options.posKey,
            PaymentType: PaymentType.IMMEDIATE,
            GuestCheckOut: true,
            FundingSources: ['All'],
            PaymentRequestId: paymentRequestId,
            RedirectUrl: `${this.options.redirectUrl}?orderCode=${order.code}`,
            CallbackUrl: `${this.options.callbackUrl}?orderCode=${order.code}`,
            Transactions: [transaction],
            Locale: locale,
            Currency: Currency.HUF, // TODO: Map from order currency
            OrderNumber: order.code,
        };

        try {
            Logger.info(`Starting Barion payment for order ${order.code}`, loggerCtx);
            
            const response = await fetch(`${this.apiBaseUrl}/v2/Payment/Start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(request),
            });

            const data = await response.json();

            if (isBarionError(data)) {
                const errorMsg = data.Errors.map(e => `${e.ErrorCode}: ${e.Description}`).join(', ');
                Logger.error(`Barion payment start failed: ${errorMsg}`, loggerCtx);
                return { success: false, error: errorMsg };
            }

            if (isPaymentStartResponse(data)) {
                Logger.info(`Barion payment created: ${data.PaymentId}, status: ${data.Status}`, loggerCtx);
                return {
                    success: true,
                    paymentId: data.PaymentId,
                    gatewayUrl: data.GatewayUrl,
                };
            }

            Logger.error('Unexpected response from Barion API', loggerCtx);
            return { success: false, error: 'Unexpected response from Barion API' };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            Logger.error(`Barion API request failed: ${errorMsg}`, loggerCtx);
            return { success: false, error: errorMsg };
        }
    }

    /**
     * Get the current state of a Barion payment
     */
    async getPaymentState(paymentId: string): Promise<PaymentStateResult> {
        try {
            Logger.info(`Fetching payment state for ${paymentId}`, loggerCtx);

            const response = await fetch(
                `${this.apiBaseUrl}/v4/Payment/${paymentId}/PaymentState?POSKey=${this.options.posKey}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                },
            );

            const data = await response.json();

            if (isBarionError(data)) {
                const errorMsg = data.Errors.map(e => `${e.ErrorCode}: ${e.Description}`).join(', ');
                Logger.error(`Barion payment state fetch failed: ${errorMsg}`, loggerCtx);
                return { success: false, error: errorMsg };
            }

            if (isPaymentStateResponse(data)) {
                Logger.info(`Barion payment ${paymentId} status: ${data.Status}`, loggerCtx);
                return {
                    success: true,
                    status: data.Status,
                    total: data.Total,
                    currency: data.Currency,
                };
            }

            Logger.error('Unexpected response from Barion API', loggerCtx);
            return { success: false, error: 'Unexpected response from Barion API' };
        } catch (error) {
            const errorMsg = error instanceof Error ? error.message : 'Unknown error';
            Logger.error(`Barion API request failed: ${errorMsg}`, loggerCtx);
            return { success: false, error: errorMsg };
        }
    }

    private mapLocale(languageCode: string): Locale {
        const localeMap: Record<string, Locale> = {
            hu: Locale.HUNGARIAN,
            en: Locale.ENGLISH,
            de: Locale.GERMAN,
            cs: Locale.CZECH,
            sk: Locale.SLOVAK,
            sl: Locale.SLOVENIAN,
            fr: Locale.FRENCH,
            es: Locale.SPANISH,
        };
        return localeMap[languageCode] || Locale.HUNGARIAN;
    }
}
