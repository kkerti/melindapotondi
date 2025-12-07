import { Args, Query, Resolver } from '@nestjs/graphql';
import { Permission } from '@vendure/common/lib/generated-types';
import { ID } from '@vendure/common/lib/shared-types';
import { Allow, Ctx, RequestContext } from '@vendure/core';
import { BarionService } from '../services/barion.service';

@Resolver()
export class BarionAdminResolver {
    constructor(private barionService: BarionService) {}

    @Query()
    @Allow(Permission.SuperAdmin)
    async startPayment(@Ctx() ctx: RequestContext, @Args() args: { id: ID }): Promise<boolean> {
        return this.barionService.startPayment(ctx, args.id);
    }
}
