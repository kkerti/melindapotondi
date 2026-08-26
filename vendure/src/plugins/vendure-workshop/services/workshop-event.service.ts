import { Inject, Injectable } from '@nestjs/common';
import { DeletionResponse, DeletionResult } from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';
import {
    assertFound,
    ListQueryBuilder,
    ListQueryOptions,
    patchEntity,
    RelationPaths,
    RequestContext,
    TransactionalConnection,
} from '@vendure/core';
import { MoreThanOrEqual } from 'typeorm';
import { VENDURE_WORKSHOP_PLUGIN_OPTIONS } from '../constants';
import { WorkshopEvent } from '../entities/workshop-event.entity';
import { Workshop } from '../entities/workshop.entity';
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
     * Returns upcoming, published workshop events for the shop API, ordered
     * by start date.
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
            .leftJoinAndSelect('workshopevent.workshop', 'workshop')
            .orderBy('workshopevent.startsAt', 'ASC')
            .getManyAndCount()
            .then(([items, totalItems]) => ({
                items,
                totalItems,
            }));
    }

    /**
     * @description
     * Find a single workshop event by ID.
     */
    findOne(
        ctx: RequestContext,
        id: ID,
        relations?: RelationPaths<WorkshopEvent>,
    ): Promise<WorkshopEvent | null> {
        return this.connection.getRepository(ctx, WorkshopEvent).findOne({
            where: { id },
            relations: relations ?? ['workshop'],
        });
    }

    /**
     * @description
     * Create a new workshop event scheduled from a Workshop template.
     * `capacity` and `endsAt` are optional and, if omitted, are inherited
     * from the Workshop template's `defaultCapacity` and
     * `defaultDurationMinutes` respectively, so admins don't need to
     * re-specify values that rarely change between occurrences.
     */
    async create(ctx: RequestContext, input: CreateWorkshopEventInput): Promise<WorkshopEvent> {
        const workshop = await this.connection.getEntityOrThrow(ctx, Workshop, input.workshopId);
        const startsAt = new Date(input.startsAt);
        const endsAt = input.endsAt
            ? new Date(input.endsAt)
            : new Date(startsAt.getTime() + workshop.defaultDurationMinutes * 60_000);
        const newEntity = new WorkshopEvent({
            workshop,
            startsAt,
            endsAt,
            location: input.location,
            capacity: input.capacity ?? workshop.defaultCapacity,
            priceInCents: input.priceInCents ?? null,
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
        const workshop = input.workshopId
            ? await this.connection.getEntityOrThrow(ctx, Workshop, input.workshopId)
            : undefined;
        const updatedEntity = patchEntity(entity, {
            workshop,
            location: input.location,
            capacity: input.capacity,
            priceInCents: input.priceInCents,
            isPublished: input.isPublished,
            startsAt: input.startsAt ? new Date(input.startsAt) : undefined,
            endsAt: input.endsAt ? new Date(input.endsAt) : undefined,
        });
        await this.connection.getRepository(ctx, WorkshopEvent).save(updatedEntity, { reload: false });
        return assertFound(this.findOne(ctx, updatedEntity.id));
    }

    /**
     * @description
     * Delete a workshop event.
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
}
