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
    patchEntity,
} from '@vendure/core';
import { MoreThanOrEqual } from 'typeorm';
import { WorkshopEvent } from '../entities/workshop-event.entity';
import { VENDURE_WORKSHOP_PLUGIN_OPTIONS } from '../constants';
import { CreateWorkshopEventInput, PluginInitOptions, UpdateWorkshopEventInput } from '../types';

@Injectable()
export class WorkshopEventService {
    constructor(
        private connection: TransactionalConnection,
        private listQueryBuilder: ListQueryBuilder,
        @Inject(VENDURE_WORKSHOP_PLUGIN_OPTIONS) private options: PluginInitOptions,
    ) {}

    /**
     * @description
     * Returns a paginated list of all workshop events (admin).
     */
    findAll(
        ctx: RequestContext,
        options?: ListQueryOptions<WorkshopEvent>,
        relations?: RelationPaths<WorkshopEvent>,
    ): Promise<PaginatedList<WorkshopEvent>> {
        return this.listQueryBuilder
            .build(WorkshopEvent, options, {
                relations,
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
     * Returns upcoming published events for the shop API.
     */
    async findUpcoming(
        ctx: RequestContext,
        options?: ListQueryOptions<WorkshopEvent>,
    ): Promise<PaginatedList<WorkshopEvent>> {
        const now = new Date();
        return this.listQueryBuilder
            .build(WorkshopEvent, options, {
                ctx,
                where: {
                    isPublished: true,
                    startsAt: MoreThanOrEqual(now),
                },
            })
            .leftJoinAndSelect('workshopevent.bookings', 'bookings')
            .orderBy('workshopevent.startsAt', 'ASC')
            .getManyAndCount()
            .then(([items, totalItems]) => ({
                items,
                totalItems,
            }));
    }

    /**
     * @description
     * Find a single event by ID.
     */
    findOne(
        ctx: RequestContext,
        id: ID,
        relations?: RelationPaths<WorkshopEvent>,
    ): Promise<WorkshopEvent | null> {
        return this.connection.getRepository(ctx, WorkshopEvent).findOne({
            where: { id },
            relations: relations ?? ['bookings'],
        });
    }

    /**
     * @description
     * Create a new workshop event.
     */
    async create(ctx: RequestContext, input: CreateWorkshopEventInput): Promise<WorkshopEvent> {
        const newEntity = new WorkshopEvent({
            title: input.title,
            description: input.description ?? null,
            location: input.location,
            startsAt: new Date(input.startsAt),
            endsAt: new Date(input.endsAt),
            maxParticipants: input.maxParticipants,
            bookingPassword: input.bookingPassword,
            isPublished: input.isPublished ?? true,
        });
        const savedEntity = await this.connection.getRepository(ctx, WorkshopEvent).save(newEntity);
        return assertFound(this.findOne(ctx, savedEntity.id));
    }

    /**
     * @description
     * Update an existing workshop event.
     */
    async update(ctx: RequestContext, input: UpdateWorkshopEventInput): Promise<WorkshopEvent> {
        const entity = await this.connection.getEntityOrThrow(ctx, WorkshopEvent, input.id);
        const updatedEntity = patchEntity(entity, {
            ...input,
            startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
            endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
        });
        await this.connection.getRepository(ctx, WorkshopEvent).save(updatedEntity, { reload: false });
        return assertFound(this.findOne(ctx, updatedEntity.id));
    }

    /**
     * @description
     * Delete a workshop event. This will also cascade-delete all bookings.
     */
    async delete(ctx: RequestContext, id: ID): Promise<DeletionResponse> {
        const entity = await this.connection.getEntityOrThrow(ctx, WorkshopEvent, id);
        try {
            await this.connection.getRepository(ctx, WorkshopEvent).remove(entity);
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

    /**
     * @description
     * Get the count of current bookings for an event.
     */
    async getBookingCount(ctx: RequestContext, eventId: ID): Promise<number> {
        const event = await this.findOne(ctx, eventId, ['bookings']);
        return event?.bookings?.length ?? 0;
    }

    /**
     * @description
     * Check if an event has available slots.
     */
    async hasAvailableSlots(ctx: RequestContext, eventId: ID): Promise<boolean> {
        const event = await this.findOne(ctx, eventId, ['bookings']);
        if (!event) return false;
        return (event.bookings?.length ?? 0) < event.maxParticipants;
    }
}
