import { Args, Mutation, Resolver } from '@nestjs/graphql';
import {
    ActiveOrderService,
    Ctx,
    Logger,
    OrderService,
    PaymentMethodService,
    RequestContext,
    Transaction,
} from '@vendure/core';
import { loggerCtx } from '../constants';
import { BarionService } from '../services/barion.service';

interface BarionPaymentResult {
    success: boolean;
    paymentId?: string;
    gatewayUrl?: string;
    errorMessage?: string;
}

@Resolver()
export class BarionShopResolver {
    constructor(
        private barionService: BarionService,
        private activeOrderService: ActiveOrderService,
        private orderService: OrderService,
        private paymentMethodService: PaymentMethodService,
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

        if (order.lines.length === 0) {
            return {
                success: false,
                errorMessage: 'Order has no items',
            };
        }

        // Check if order is ready for payment
        if (!order.shippingAddress || !order.customer) {
            return {
                success: false,
                errorMessage: 'Order is missing customer or shipping information',
            };
        }

        Logger.info(`Initiating Barion payment for order ${order.code}`, loggerCtx);

        // Find the Barion payment method
        const paymentMethods = await this.paymentMethodService.findAll(ctx);
        const barionMethod = paymentMethods.items.find(pm => pm.code === 'barion');

        if (!barionMethod) {
            return {
                success: false,
                errorMessage: 'Barion payment method not found',
            };
        }

        // Add payment to order - this triggers the payment handler
        const result = await this.orderService.addPaymentToOrder(ctx, order.id, {
            method: barionMethod.code,
            metadata: {},
        });

        if ('errorCode' in result) {
            Logger.error(`Failed to add payment to order: ${result.message}`, loggerCtx);
            return {
                success: false,
                errorMessage: result.message,
            };
        }

        // The payment should now be in Authorized state with metadata
        const payment = result.payments?.find(p => p.method === 'barion');

        if (!payment) {
            return {
                success: false,
                errorMessage: 'Payment was not created',
            };
        }

        if (payment.state === 'Error') {
            return {
                success: false,
                errorMessage: payment.errorMessage || 'Payment creation failed',
            };
        }

        const gatewayUrl = payment.metadata?.gatewayUrl as string;
        const paymentId = payment.metadata?.barionPaymentId as string;

        if (!gatewayUrl || !paymentId) {
            return {
                success: false,
                errorMessage: 'Payment metadata is incomplete',
            };
        }

        return {
            success: true,
            paymentId,
            gatewayUrl,
        };
    }
}
