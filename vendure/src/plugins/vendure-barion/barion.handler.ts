import {
    CreatePaymentResult,
    Injector,
    LanguageCode,
    Logger,
    PaymentMethodHandler,
    SettlePaymentErrorResult,
    SettlePaymentResult,
} from '@vendure/core';
import { loggerCtx } from './constants';
import { BarionService } from './services/barion.service';
import { PaymentStatus } from './types';

let barionService: BarionService;

/**
 * Barion payment handler for Vendure
 *
 * This handler integrates with the Barion payment gateway.
 * The flow is:
 * 1. createPayment() is called when the customer adds a payment to their order
 * 2. The storefront then redirects the customer to Barion's payment page
 * 3. After payment, Barion sends a webhook callback
 * 4. settlePayment() is called to finalize the payment
 */
export const barionPaymentHandler = new PaymentMethodHandler({
    code: 'barion',
    description: [
        {
            languageCode: LanguageCode.en,
            value: 'Barion Payment Gateway',
        },
        {
            languageCode: LanguageCode.hu,
            value: 'Barion Fizetési Kapu',
        },
    ],
    args: {},

    init(injector: Injector) {
        barionService = injector.get(BarionService);
    },

    async createPayment(ctx, order, amount, args, metadata): Promise<CreatePaymentResult> {
        Logger.info(`Creating Barion payment for order ${order.code}, amount: ${amount}`, loggerCtx);

        try {
            const result = await barionService.startPayment(ctx, order);

            if (!result.success || !result.paymentId || !result.gatewayUrl) {
                return {
                    amount,
                    state: 'Declined' as const,
                    errorMessage: result.error || 'Failed to create Barion payment',
                };
            }

            // Return Authorized state with metadata containing the Barion payment info
            // The customer will be redirected to gatewayUrl to complete the payment
            return {
                amount,
                state: 'Authorized' as const,
                transactionId: result.paymentId,
                metadata: {
                    barionPaymentId: result.paymentId,
                    gatewayUrl: result.gatewayUrl,
                },
            };
        } catch (error) {
            Logger.error(`Error creating Barion payment: ${error}`, loggerCtx);
            return {
                amount,
                state: 'Declined' as const,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    },

    async settlePayment(ctx, order, payment, args): Promise<SettlePaymentResult | SettlePaymentErrorResult> {
        Logger.info(`Settling Barion payment for order ${order.code}`, loggerCtx);

        const barionPaymentId = payment.metadata?.barionPaymentId as string;

        if (!barionPaymentId) {
            return {
                success: false as const,
                errorMessage: 'No Barion payment ID found in payment metadata',
            };
        }

        try {
            const result = await barionService.getPaymentState(barionPaymentId);

            if (!result.success) {
                return {
                    success: false as const,
                    errorMessage: result.error || 'Failed to get Barion payment state',
                };
            }

            if (result.status === PaymentStatus.SUCCEEDED) {
                return {
                    success: true as const,
                    metadata: {
                        barionStatus: result.status,
                        barionTotal: result.total,
                        barionCurrency: result.currency,
                    },
                };
            }

            // Payment not yet succeeded
            return {
                success: false as const,
                errorMessage: `Barion payment status is ${result.status}, expected ${PaymentStatus.SUCCEEDED}`,
            };
        } catch (error) {
            Logger.error(`Error settling Barion payment: ${error}`, loggerCtx);
            return {
                success: false as const,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
            };
        }
    },
});
