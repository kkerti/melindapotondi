import { Body, Controller, Get, Inject, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import {
    InternalServerError,
    Logger,
    Order,
    OrderService,
    PaymentService,
    RequestContext,
    RequestContextService,
    TransactionalConnection,
} from '@vendure/core';
import { VENDURE_BARION_PLUGIN_OPTIONS, loggerCtx } from '../constants';
import { PluginInitOptions, PaymentStatus } from '../types';
import { BarionService } from '../services/barion.service';

/**
 * Controller to handle Barion IPN (Instant Payment Notification) callbacks.
 *
 * Barion sends a GET request to this endpoint when the payment status changes.
 * The PaymentId is passed as a query parameter.
 */
@Controller('payments/barion')
export class BarionCallbackController {
    constructor(
        private barionService: BarionService,
        private orderService: OrderService,
        private paymentService: PaymentService,
        private connection: TransactionalConnection,
        private requestContextService: RequestContextService,
        @Inject(VENDURE_BARION_PLUGIN_OPTIONS) private options: PluginInitOptions,
    ) {}

    /**
     * Barion callback endpoint (IPN)
     * Called by Barion via POST when the payment status changes.
     * Barion sends PaymentId in the request body.
     */
    @Post('callback')
    async handleCallback(
        @Query('orderCode') orderCode: string,
        @Body() body: { PaymentId?: string },
        @Req() req: Request,
        @Res() res: Response,
    ): Promise<void> {
        const paymentId = body.PaymentId;
        Logger.info(`Received Barion callback (POST) for paymentId: ${paymentId}, orderCode: ${orderCode}`, loggerCtx);

        // Barion requires a 200 response within 15 seconds
        // Send response immediately, process async
        res.status(200).send('OK');

        if (!paymentId) {
            Logger.warn('Barion callback received without PaymentId in body', loggerCtx);
            return;
        }

        try {
            await this.processCallback(paymentId, orderCode, req);
        } catch (error) {
            Logger.error(`Error processing Barion callback: ${error}`, loggerCtx);
        }
    }

    private async processCallback(paymentId: string, orderCode: string, req: Request): Promise<void> {

        // Create a request context for internal operations
        // Pass the request object so EmailPlugin can access headers, this is how it was 
        const ctx = await this.requestContextService.create({
            apiType: 'admin',
            req,
        });

        // Get the payment state from Barion
        const paymentState = await this.barionService.getPaymentState(paymentId);

        if (!paymentState.success) {
            Logger.error(`Failed to get Barion payment state: ${paymentState.error}`, loggerCtx);
            return;
        }

        Logger.info(`Barion payment ${paymentId} status: ${paymentState.status}`, loggerCtx);

        // Find the order and payment
        const order = await this.orderService.findOneByCode(ctx, orderCode, ['payments']);

        if (!order) {
            Logger.error(`Order not found for orderCode: ${orderCode}`, loggerCtx);
            return;
        }

        // Find the payment with matching Barion payment ID
        const payment = order.payments?.find(p => p.method === 'barion' && p.transactionId === paymentId);

        if (!payment) {
            Logger.error(`Payment not found for paymentId: ${paymentId} in order ${orderCode}`, loggerCtx);
            return;
        }

        // Handle different payment states
        if (paymentState.status === PaymentStatus.SUCCEEDED) {
            // Settle the payment
            if (payment.state === 'Authorized') {
                Logger.info(`Settling payment ${payment.id} for order ${orderCode}`, loggerCtx);
                const result = await this.orderService.settlePayment(ctx, payment.id);

                if ('errorCode' in result) {
                    Logger.error(`Failed to settle payment: ${result.message}`, loggerCtx);
                } else {
                    Logger.info(`Payment ${payment.id} settled successfully`, loggerCtx);
                }
            }
        } else if (
            paymentState.status === PaymentStatus.CANCELED ||
            paymentState.status === PaymentStatus.FAILED ||
            paymentState.status === PaymentStatus.EXPIRED
        ) {
            // Cancel the payment - Note: In Vendure we typically handle this via state machine
            Logger.info(`Barion payment ${paymentId} was ${paymentState.status}`, loggerCtx);
            // The order remains with an authorized but unsettled payment
            // which can be handled by admin or cleaned up later
        }
    }
}
