import { Args, Mutation, Query, Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { Permission } from '@vendure/common/lib/generated-types';
import { Allow, Ctx, ID, ListQueryOptions, RequestContext, Transaction } from '@vendure/core';
import { WorkshopEventService } from '../services/workshop-event.service';
import { EventBookingService } from '../services/event-booking.service';
import { WorkshopEvent } from '../entities/workshop-event.entity';
import { EventBooking } from '../entities/event-booking.entity';
import { CreateWorkshopEventInput, UpdateWorkshopEventInput } from '../types';

@Resolver('WorkshopEvent')
export class WorkshopAdminResolver {
    constructor(
        private workshopEventService: WorkshopEventService,
        private eventBookingService: EventBookingService,
    ) {}

    @Query()
    @Allow(Permission.SuperAdmin)
    async workshopEvent(
        @Ctx() ctx: RequestContext,
        @Args() args: { id: ID },
    ): Promise<WorkshopEvent | null> {
        return this.workshopEventService.findOne(ctx, args.id);
    }

    @Query()
    @Allow(Permission.SuperAdmin)
    async workshopEvents(
        @Ctx() ctx: RequestContext,
        @Args() args: { options?: ListQueryOptions<WorkshopEvent> },
    ) {
        return this.workshopEventService.findAll(ctx, args.options, ['bookings']);
    }

    @Query()
    @Allow(Permission.SuperAdmin)
    async eventBookings(
        @Ctx() ctx: RequestContext,
        @Args() args: { eventId?: ID; options?: ListQueryOptions<EventBooking> },
    ) {
        if (args.eventId) {
            const bookings = await this.eventBookingService.findByEvent(ctx, args.eventId);
            return { items: bookings, totalItems: bookings.length };
        }
        return this.eventBookingService.findAll(ctx, args.options);
    }

    @Query()
    @Allow(Permission.SuperAdmin)
    async eventBooking(
        @Ctx() ctx: RequestContext,
        @Args() args: { id: ID },
    ): Promise<EventBooking | null> {
        return this.eventBookingService.findOne(ctx, args.id);
    }

    @Transaction()
    @Mutation()
    @Allow(Permission.SuperAdmin)
    async createWorkshopEvent(
        @Ctx() ctx: RequestContext,
        @Args() args: { input: CreateWorkshopEventInput },
    ): Promise<WorkshopEvent> {
        return this.workshopEventService.create(ctx, args.input);
    }

    @Transaction()
    @Mutation()
    @Allow(Permission.SuperAdmin)
    async updateWorkshopEvent(
        @Ctx() ctx: RequestContext,
        @Args() args: { input: UpdateWorkshopEventInput },
    ): Promise<WorkshopEvent> {
        return this.workshopEventService.update(ctx, args.input);
    }

    @Transaction()
    @Mutation()
    @Allow(Permission.SuperAdmin)
    async deleteWorkshopEvent(@Ctx() ctx: RequestContext, @Args() args: { id: ID }) {
        return this.workshopEventService.delete(ctx, args.id);
    }

    @Transaction()
    @Mutation()
    @Allow(Permission.SuperAdmin)
    async deleteEventBooking(@Ctx() ctx: RequestContext, @Args() args: { id: ID }) {
        return this.eventBookingService.delete(ctx, args.id);
    }

    @ResolveField()
    async availableSlots(@Ctx() ctx: RequestContext, @Parent() event: WorkshopEvent): Promise<number> {
        const bookingCount = event.bookings?.length ?? 0;
        return Math.max(0, event.maxParticipants - bookingCount);
    }
}
