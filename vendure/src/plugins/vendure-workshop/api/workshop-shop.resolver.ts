import { Args, Mutation, Query, Resolver, ResolveField, Parent } from '@nestjs/graphql';
import { Ctx, ID, RequestContext, Transaction } from '@vendure/core';
import { WorkshopEventService } from '../services/workshop-event.service';
import { EventBookingService } from '../services/event-booking.service';
import { WorkshopEvent } from '../entities/workshop-event.entity';
import { ReserveWorkshopSpotInput, WorkshopErrorCode } from '../types';

interface UpcomingWorkshopEventsOptions {
    skip?: number;
    take?: number;
}

@Resolver('WorkshopEvent')
export class WorkshopShopResolver {
    constructor(
        private workshopEventService: WorkshopEventService,
        private eventBookingService: EventBookingService,
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
        // Only return published events for shop API
        if (event && !event.isPublished) {
            return null;
        }
        return event;
    }

    @Transaction()
    @Mutation()
    async reserveWorkshopSpot(
        @Ctx() ctx: RequestContext,
        @Args() args: { input: ReserveWorkshopSpotInput },
    ) {
        const result = await this.eventBookingService.reserveSpot(ctx, args.input);

        if (result.success) {
            return {
                __typename: 'EventBooking',
                ...result.booking,
            };
        }

        // Map error codes to GraphQL type names
        const errorTypeMap: Record<WorkshopErrorCode, string> = {
            [WorkshopErrorCode.EVENT_NOT_FOUND]: 'EventNotFoundError',
            [WorkshopErrorCode.EVENT_FULL]: 'EventFullError',
            [WorkshopErrorCode.INVALID_PASSWORD]: 'InvalidPasswordError',
            [WorkshopErrorCode.EVENT_NOT_PUBLISHED]: 'EventNotPublishedError',
            [WorkshopErrorCode.BOOKING_NOT_FOUND]: 'EventNotFoundError',
            [WorkshopErrorCode.DUPLICATE_NICKNAME]: 'DuplicateNicknameError',
        };

        return {
            __typename: errorTypeMap[result.error.errorCode],
            errorCode: result.error.errorCode,
            message: result.error.message,
        };
    }

    @ResolveField()
    async availableSlots(@Ctx() ctx: RequestContext, @Parent() event: WorkshopEvent): Promise<number> {
        const bookingCount = event.bookings?.length ?? 0;
        return Math.max(0, event.maxParticipants - bookingCount);
    }

    @ResolveField()
    async bookings(@Parent() event: WorkshopEvent) {
        // For shop API, we expose bookings but without sensitive data
        // The entity already only has nickname and email
        return event.bookings ?? [];
    }
}
