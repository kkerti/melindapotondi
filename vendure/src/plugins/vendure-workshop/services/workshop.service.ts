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
import { VENDURE_WORKSHOP_PLUGIN_OPTIONS } from '../constants';
import { Workshop } from '../entities/workshop.entity';
import { CreateWorkshopInput, PluginInitOptions, UpdateWorkshopInput } from '../types';

@Injectable()
export class WorkshopService {
    constructor(
        private connection: TransactionalConnection,
        private listQueryBuilder: ListQueryBuilder,
        @Inject(VENDURE_WORKSHOP_PLUGIN_OPTIONS) private options: PluginInitOptions,
    ) {}

    /**
     * @description
     * Returns a paginated list of all workshop templates (admin).
     */
    findAll(
        ctx: RequestContext,
        options?: ListQueryOptions<Workshop>,
        relations?: RelationPaths<Workshop>,
    ): Promise<PaginatedList<Workshop>> {
        return this.listQueryBuilder
            .build(Workshop, options, {
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
     * Find a single workshop template by ID.
     */
    findOne(
        ctx: RequestContext,
        id: ID,
        relations?: RelationPaths<Workshop>,
    ): Promise<Workshop | null> {
        return this.connection.getRepository(ctx, Workshop).findOne({
            where: { id },
            relations: relations ?? ['events'],
        });
    }

    /**
     * @description
     * Create a new workshop template.
     */
    async create(ctx: RequestContext, input: CreateWorkshopInput): Promise<Workshop> {
        const newEntity = new Workshop({
            title: input.title,
            description: input.description ?? null,
            slug: input.slug,
            defaultDurationMinutes: input.defaultDurationMinutes,
            defaultCapacity: input.defaultCapacity,
            defaultPriceInCents: input.defaultPriceInCents ?? 500000,
            isActive: input.isActive ?? true,
        });
        const savedEntity = await this.connection.getRepository(ctx, Workshop).save(newEntity);
        return assertFound(this.findOne(ctx, savedEntity.id));
    }

    /**
     * @description
     * Update an existing workshop template.
     */
    async update(ctx: RequestContext, input: UpdateWorkshopInput): Promise<Workshop> {
        const entity = await this.connection.getEntityOrThrow(ctx, Workshop, input.id);
        const updatedEntity = patchEntity(entity, input);
        await this.connection.getRepository(ctx, Workshop).save(updatedEntity, { reload: false });
        return assertFound(this.findOne(ctx, updatedEntity.id));
    }

    /**
     * @description
     * Delete a workshop template. This will fail if any Events still
     * reference this Workshop, since the FK is configured with onDelete:
     * 'RESTRICT'.
     */
    async delete(ctx: RequestContext, id: ID): Promise<DeletionResponse> {
        const entity = await this.connection.getEntityOrThrow(ctx, Workshop, id);
        try {
            await this.connection.getRepository(ctx, Workshop).remove(entity);
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
