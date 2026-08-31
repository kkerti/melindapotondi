import { Mutation, Resolver } from '@nestjs/graphql';
import {
    ActiveOrderService,
    Ctx,
    EntityHydrator,
    isGraphQlErrorResult,
    Logger,
    OrderService,
    OrderState,
    RequestContext,
    Transaction,
} from '@vendure/core';
import { loggerCtx } from '../constants';

interface BarionPaymentResult {
    success: boolean;
    paymentId?: string;
    gatewayUrl?: string;
    errorMessage?: string;
}

@Resolver()
export class BarionShopResolver {
    constructor(
        private activeOrderService: ActiveOrderService,
        private orderService: OrderService,
        private entityHydrator: EntityHydrator,
    ) {}

    @Transaction()
    @Mutation()
    async initiateBarionPayment(@Ctx() ctx: RequestContext): Promise<BarionPaymentResult> {
        // Get the active order
        const order = await this.activeOrderService.getActiveOrder(ctx, undefined);

        if (!order) {
            return {
                success: false,
                errorMessage: 'No active order found',
            };
        }

        // Hydrate the order lines and other required relations
        await this.entityHydrator.hydrate(ctx, order, {
            relations: ['lines', 'lines.productVariant', 'customer', 'shippingLines'],
        });

        if (order.lines.length === 0) {
            return {
                success: false,
                errorMessage: 'Order has no items',
            };
        }

        Logger.info(`Initiating Barion payment for order ${order.code}`, loggerCtx);

        // Transition order to ArrangingPayment state if not already.
        if (order.state !== 'ArrangingPayment') {
            const transitionResult = await this.orderService.transitionToState(ctx, order.id, 'ArrangingPayment' as OrderState);
            
            if (transitionResult && 'errorCode' in transitionResult) {
                Logger.error(`Failed to transition order to ArrangingPayment: ${transitionResult.message}`, loggerCtx);
                return {
                    success: false,
                    errorMessage: `Cannot proceed to payment: ${transitionResult.message}`,
                };
            }
        }

        // Add payment to order - this triggers barion.handler.createPayment()
        // which calls barionService.startPayment() and stores gatewayUrl in metadata.
        // The payment starts in 'Authorized' state (pending external confirmation from Barion callback).
        const addPaymentResult = await this.orderService.addPaymentToOrder(ctx, order.id, {
            method: 'barion',
            metadata: {},
        });

        if (isGraphQlErrorResult(addPaymentResult)) {
            Logger.error(`Failed to add payment to order: ${addPaymentResult.message}`, loggerCtx);
            return {
                success: false,
                errorMessage: addPaymentResult.message,
            };
        }

        // Without hydration, payments on Order is empty.
        await this.entityHydrator.hydrate(ctx, addPaymentResult, {relations: ["payments"]})

        // Extract the Barion payment details from the payment metadata set by the handler
        const payment = addPaymentResult.payments?.find(p => p.method === 'barion' && p.state === 'Authorized');

        const barionPaymentId = payment?.transactionId;

        const gatewayUrl = payment?.metadata?.gatewayUrl as string | undefined;

        if (!payment || !payment.transactionId || !gatewayUrl) {
            Logger.error(`Barion payment created but missing metadata. PaymentId: ${barionPaymentId}, GatewayUrl: ${gatewayUrl}`, loggerCtx);
            return {
                success: false,
                errorMessage: 'Failed to start Barion payment - missing payment details',
            };
        }

        Logger.info(`Barion payment started: ${barionPaymentId}, Vendure payment: ${payment.id}`, loggerCtx);

        return {
            success: true,
            paymentId: barionPaymentId,
            gatewayUrl: gatewayUrl,
        };
    }
}
