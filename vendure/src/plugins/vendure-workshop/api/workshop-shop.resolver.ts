import { Args, Query, Resolver } from '@nestjs/graphql';
import { Ctx, ID, RequestContext } from '@vendure/core';
import { WorkshopEvent } from '../entities/workshop-event.entity';
import { Workshop } from '../entities/workshop.entity';
import { WorkshopEventService } from '../services/workshop-event.service';
import { WorkshopService } from '../services/workshop.service';

interface UpcomingWorkshopEventsOptions {
    skip?: number;
    take?: number;
}

@Resolver()
export class WorkshopShopResolver {
    constructor(
        private workshopService: WorkshopService,
        private workshopEventService: WorkshopEventService,
    ) {}

    @Query()
    async upcomingWorkshopEvents(
        @Ctx() ctx: RequestContext,
        @Args() args: { options?: UpcomingWorkshopEventsOptions },
    ) {
        return this.workshopEventService.findUpcoming(ctx, args.options);
    }

    @Query()
    async workshopEvent(
        @Ctx() ctx: RequestContext,
        @Args() args: { id: ID },
    ): Promise<WorkshopEvent | null> {
        const event = await this.workshopEventService.findOne(ctx, args.id);
        // Only return published events for the shop API
        if (event && !event.isPublished) {
            return null;
        }
        return event;
    }

    @Query()
    async workshop(@Ctx() ctx: RequestContext, @Args() args: { id: ID }): Promise<Workshop | null> {
        const workshop = await this.workshopService.findOne(ctx, args.id);
        // Only return active workshop templates for the shop API
        if (workshop && !workshop.isActive) {
            return null;
        }
        return workshop;
    }
}
