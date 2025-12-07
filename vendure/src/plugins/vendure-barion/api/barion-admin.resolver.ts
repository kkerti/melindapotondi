import { Args, Query, Resolver } from '@nestjs/graphql';
import { Permission } from '@vendure/common/lib/generated-types';
import { ID } from '@vendure/common/lib/shared-types';
import { Allow, Ctx, OrderService, RequestContext } from '@vendure/core';
import { BarionService, StartPaymentResult } from '../services/barion.service';

@Resolver()
export class BarionAdminResolver {
    constructor(
        private barionService: BarionService,
        private orderService: OrderService,
    ) {}

    @Query()
    @Allow(Permission.SuperAdmin)
    async startPayment(@Ctx() ctx: RequestContext, @Args() args: { id: ID }): Promise<boolean> {
        // Admin method to manually trigger payment start for an order
        const order = await this.orderService.findOne(ctx, args.id);
        if (!order) {
            return false;
        }
        const result = await this.barionService.startPayment(ctx, order);
        return result.success;
    }
}
