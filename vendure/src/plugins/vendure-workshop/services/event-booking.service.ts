import { Injectable, Inject } from '@nestjs/common';
import { DeletionResponse, DeletionResult } from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';
import {
    assertFound,
    ListQueryBuilder,
    ListQueryOptions,
    RelationPaths,
    RequestContext,
    TransactionalConnection,
    Logger,
} from '@vendure/core';
import { EventBooking } from '../entities/event-booking.entity';
import { WorkshopEvent } from '../entities/workshop-event.entity';
import { VENDURE_WORKSHOP_PLUGIN_OPTIONS, loggerCtx } from '../constants';
import {
    PluginInitOptions,
    ReserveWorkshopSpotInput,
    WorkshopErrorCode,
    WorkshopErrorResult,
} from '../types';

export type ReserveSpotServiceResult =
    | { success: true; booking: EventBooking }
    | { success: false; error: WorkshopErrorResult };

@Injectable()
export class EventBookingService {
    constructor(
        private connection: TransactionalConnection,
        private listQueryBuilder: ListQueryBuilder,
        @Inject(VENDURE_WORKSHOP_PLUGIN_OPTIONS) private options: PluginInitOptions,
    ) {}

    /**
     * @description
     * Returns all bookings (admin).
     */
    findAll(
        ctx: RequestContext,
        options?: ListQueryOptions<EventBooking>,
        relations?: RelationPaths<EventBooking>,
    ): Promise<PaginatedList<EventBooking>> {
        return this.listQueryBuilder
            .build(EventBooking, options, {
                relations: relations ?? ['event'],
                ctx,
            })
            .getManyAndCount()
            .then(([items, totalItems]) => ({
                items,
                totalItems,
            }));
    }

    /**
     * @description
     * Find bookings for a specific event.
     */
    async findByEvent(ctx: RequestContext, eventId: ID): Promise<EventBooking[]> {
        return this.connection.getRepository(ctx, EventBooking).find({
            where: { event: { id: eventId } },
            relations: ['event'],
        });
    }

    /**
     * @description
     * Find a single booking by ID.
     */
    findOne(
        ctx: RequestContext,
        id: ID,
        relations?: RelationPaths<EventBooking>,
    ): Promise<EventBooking | null> {
        return this.connection.getRepository(ctx, EventBooking).findOne({
            where: { id },
            relations: relations ?? ['event'],
        });
    }

    /**
     * @description
     * Reserve a spot at a workshop event.
     * Validates password, checks availability, and prevents duplicate nicknames.
     */
    async reserveSpot(
        ctx: RequestContext,
        input: ReserveWorkshopSpotInput,
    ): Promise<ReserveSpotServiceResult> {
        // Find the event with bookings
        const event = await this.connection.getRepository(ctx, WorkshopEvent).findOne({
            where: { id: input.eventId },
            relations: ['bookings'],
            lock: { mode: 'pessimistic_write' }, // Lock for concurrent booking prevention
        });

        // Validate event exists
        if (!event) {
            return {
                success: false,
                error: {
                    errorCode: WorkshopErrorCode.EVENT_NOT_FOUND,
                    message: `Workshop event with ID "${input.eventId}" not found`,
                },
            };
        }

        // Validate event is published
        if (!event.isPublished) {
            return {
                success: false,
                error: {
                    errorCode: WorkshopErrorCode.EVENT_NOT_PUBLISHED,
                    message: 'This workshop event is not currently accepting bookings',
                },
            };
        }

        // Validate password
        if (event.bookingPassword !== input.password) {
            Logger.warn(`Invalid password attempt for event ${event.id}`, loggerCtx);
            return {
                success: false,
                error: {
                    errorCode: WorkshopErrorCode.INVALID_PASSWORD,
                    message: 'Invalid booking password',
                },
            };
        }

        // Check for duplicate nickname in this event
        const existingBooking = event.bookings?.find(
            b => b.nickname.toLowerCase() === input.nickname.toLowerCase(),
        );
        if (existingBooking) {
            return {
                success: false,
                error: {
                    errorCode: WorkshopErrorCode.DUPLICATE_NICKNAME,
                    message: `A booking with nickname "${input.nickname}" already exists for this event`,
                },
            };
        }

        // Check availability
        const currentBookings = event.bookings?.length ?? 0;
        if (currentBookings >= event.maxParticipants) {
            return {
                success: false,
                error: {
                    errorCode: WorkshopErrorCode.EVENT_FULL,
                    message: 'This workshop event is fully booked',
                },
            };
        }

        // Create the booking
        const newBooking = new EventBooking({
            nickname: input.nickname,
            email: input.email ?? null,
            event,
        });

        const savedBooking = await this.connection.getRepository(ctx, EventBooking).save(newBooking);
        Logger.info(`Booking created: ${savedBooking.nickname} for event ${event.id}`, loggerCtx);

        const booking = await assertFound(this.findOne(ctx, savedBooking.id));
        return {
            success: true,
            booking,
        };
    }

    /**
     * @description
     * Cancel/delete a booking (admin).
     */
    async delete(ctx: RequestContext, id: ID): Promise<DeletionResponse> {
        const entity = await this.connection.getEntityOrThrow(ctx, EventBooking, id);
        try {
            await this.connection.getRepository(ctx, EventBooking).remove(entity);
            Logger.info(`Booking ${id} deleted`, loggerCtx);
            return {
                result: DeletionResult.DELETED,
            };
        } catch (e: any) {
            return {
                result: DeletionResult.NOT_DELETED,
                message: e.toString(),
            };
        }
    }
}
