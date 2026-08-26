import { Inject, Injectable } from '@nestjs/common';
import { DeletionResponse, DeletionResult, GlobalFlag } from '@vendure/common/lib/generated-types';
import { ID, PaginatedList } from '@vendure/common/lib/shared-types';
import {
    assertFound,
    Channel,
    ChannelService,
    InternalServerError,
    ListQueryBuilder,
    ListQueryOptions,
    Logger,
    patchEntity,
    ProductService,
    ProductVariantService,
    RelationPaths,
    RequestContext,
    TaxCategoryService,
    TransactionalConnection,
} from '@vendure/core';
import { MoreThanOrEqual } from 'typeorm';
import { loggerCtx, VENDURE_WORKSHOP_PLUGIN_OPTIONS, WORKSHOPS_CHANNEL_TOKEN } from '../constants';
import { WorkshopEvent } from '../entities/workshop-event.entity';
import { Workshop } from '../entities/workshop.entity';
import { CreateWorkshopEventInput, PluginInitOptions, UpdateWorkshopEventInput } from '../types';

@Injectable()
export class WorkshopEventService {
    constructor(
        private connection: TransactionalConnection,
        private listQueryBuilder: ListQueryBuilder,
        private channelService: ChannelService,
        private productService: ProductService,
        private productVariantService: ProductVariantService,
        private taxCategoryService: TaxCategoryService,
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
     *
     * As part of creation, a real Vendure Product + ProductVariant are
     * auto-provisioned in the `workshops` Channel so the event becomes
     * purchasable via the normal `addItemToOrder` flow. See
     * `provisionProductForEvent` for details.
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

        const { productId, productVariantId } = await this.provisionProductForEvent(ctx, workshop, newEntity);
        newEntity.productId = productId;
        newEntity.productVariantId = productVariantId;

        const savedEntity = await this.connection.getRepository(ctx, WorkshopEvent).save(newEntity);
        return assertFound(this.findOne(ctx, savedEntity.id));
    }

    /**
     * @description
     * Update an existing workshop event. If `capacity` changes, the
     * `stockOnHand` of the corresponding ProductVariant is kept in sync so
     * that Vendure's stock and this entity's `capacity` never silently
     * diverge. Price changes are deliberately NOT propagated to the
     * ProductVariant here - existing Orders reference the price at time of
     * purchase, so that is a more nuanced sync that is out of scope.
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

        if (input.capacity != null && updatedEntity.productVariantId != null) {
            const workshopsCtx = await this.getWorkshopsChannelCtx(ctx);
            await this.productVariantService.update(workshopsCtx, [
                {
                    id: updatedEntity.productVariantId,
                    stockOnHand: input.capacity,
                },
            ]);
        }

        return assertFound(this.findOne(ctx, updatedEntity.id));
    }

    /**
     * @description
     * Delete a workshop event. If the event has a provisioned Product/ProductVariant, they
     * are disabled first (not hard-deleted - safer in case an Order ever ends up referencing
     * them, matching Vendure's general soft-disable convention for commerce entities). This
     * prevents a deleted WorkshopEvent from leaving behind a still-purchasable "ghost ticket"
     * - an `enabled: true` Product/ProductVariant reachable via `addItemToOrder` with no
     * WorkshopEvent left anywhere in the admin UI or storefront queries to reflect it.
     */
    async delete(ctx: RequestContext, id: ID): Promise<DeletionResponse> {
        const entity = await this.connection.getEntityOrThrow(ctx, WorkshopEvent, id);

        if (entity.productId != null || entity.productVariantId != null) {
            const workshopsCtx = await this.getWorkshopsChannelCtx(ctx);
            if (entity.productVariantId != null) {
                await this.productVariantService.update(workshopsCtx, [
                    { id: entity.productVariantId, enabled: false },
                ]);
            }
            if (entity.productId != null) {
                await this.productService.update(workshopsCtx, {
                    id: entity.productId,
                    enabled: false,
                });
            }
        }

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
     * Auto-provisions a Vendure Product + ProductVariant for the given (not-yet-persisted)
     * WorkshopEvent, in the `workshops` Channel, so the event becomes purchasable via the
     * normal `addItemToOrder` flow. Returns the new Product/ProductVariant ids to be stored
     * on the WorkshopEvent.
     */
    private async provisionProductForEvent(
        ctx: RequestContext,
        workshop: Workshop,
        event: WorkshopEvent,
    ): Promise<{ productId: ID; productVariantId: ID }> {
        const workshopsCtx = await this.getWorkshopsChannelCtx(ctx);

        const sku = await this.options.skuStrategy!.generateSku(ctx, workshop, event);
        const slug = sku.toLowerCase();
        const priceInCents = event.priceInCents ?? workshop.defaultPriceInCents;
        const displayName = `${workshop.title} — ${formatEventDateTimeForAdmin(event.startsAt)}`;

        const taxCategory = await this.getTaxCategoryForNewVariant(workshopsCtx);

        Logger.verbose(
            `Provisioning Product/ProductVariant for WorkshopEvent (sku=${sku}, channel=${WORKSHOPS_CHANNEL_TOKEN})`,
            loggerCtx,
        );

        const product = await this.productService.create(workshopsCtx, {
            enabled: true,
            // Workshop tickets are purely virtual - nothing to ship - so the
            // conditional shipping-method guard in `conditionalShippingOrderProcess`
            // (see `vendure-workshop.plugin.ts`) can allow ticket-only Orders through to
            // payment without a shipping method assigned.
            customFields: { requiresShipping: false },
            translations: [
                {
                    languageCode: workshopsCtx.languageCode,
                    name: displayName,
                    slug,
                    description: workshop.description ?? '',
                },
            ],
        });

        const [variant] = await this.productVariantService.create(workshopsCtx, [
            {
                productId: product.id,
                sku,
                // `Money` values in this app are already raw integer minor units (no
                // moneyStrategy override is configured - see DefaultMoneyStrategy), which is
                // the same convention `priceInCents` already follows, so this is passed
                // straight through with no conversion.
                price: priceInCents,
                taxCategoryId: taxCategory.id,
                stockOnHand: event.capacity,
                // TRUE (not INHERIT) so stock is always enforced for this variant
                // regardless of the global trackInventory setting - a workshop's
                // capacity limit must never be silently ignored.
                trackInventory: GlobalFlag.TRUE,
                enabled: true,
                translations: [
                    {
                        languageCode: workshopsCtx.languageCode,
                        name: displayName,
                    },
                ],
            },
        ]);

        return { productId: product.id, productVariantId: variant.id };
    }

    /**
     * @description
     * Looks up an existing TaxCategory to use for newly-provisioned WorkshopEvent
     * ProductVariants, preferring the one flagged `isDefault`, falling back to the first
     * one found. Mirrors the fallback Vendure's own `ProductVariantService` uses internally
     * when no `taxCategoryId` is supplied, but made explicit here per the plugin's own
     * requirement to never leave a variant without a TaxCategory.
     */
    private async getTaxCategoryForNewVariant(ctx: RequestContext) {
        const taxCategories = await this.taxCategoryService.findAll(ctx);
        const taxCategory = taxCategories.items.find(t => t.isDefault) ?? taxCategories.items[0];
        if (!taxCategory) {
            throw new InternalServerError(
                'No TaxCategory exists in this Vendure instance - cannot provision a WorkshopEvent Product.',
            );
        }
        return taxCategory;
    }

    /**
     * @description
     * Returns a RequestContext scoped to the `workshops` Channel, for use when provisioning
     * (or updating stock for) the Product/ProductVariant belonging to a WorkshopEvent. This
     * must happen regardless of which Channel the calling admin's own `ctx` happens to be on.
     *
     * Deliberately does NOT build the context via `RequestContextService.create()` (unlike the
     * one-off `setup-workshops-channel.ts` script, which runs outside of any request/transaction).
     * `RequestContextService.create()` constructs a brand new `RequestContext` with no
     * transaction manager attached, which would silently pull the Product/ProductVariant writes
     * out of the DB transaction opened by the calling mutation's `@Transaction()` decorator -
     * if the WorkshopEvent save then failed, the already-committed Product/ProductVariant would
     * be left as an orphan (or vice versa). Instead we shallow-copy the incoming (already
     * transactional) ctx - which preserves its transaction manager, session/user and API type -
     * and only swap out the active Channel, so everything stays inside the same transaction.
     */
    private async getWorkshopsChannelCtx(ctx: RequestContext): Promise<RequestContext> {
        const workshopsChannel = await this.channelService.getChannelFromToken(ctx, WORKSHOPS_CHANNEL_TOKEN);
        const channelCtx = ctx.copy();
        // `RequestContext#channel` has no public setter. This reaches past the
        // (compile-time-only) `private` modifier on the backing field to retarget the active
        // Channel on the copy while leaving everything else - crucially the transaction
        // manager - intact.
        (channelCtx as unknown as { _channel: Channel })._channel = workshopsChannel;
        return channelCtx;
    }
}

/**
 * @description
 * Formats a WorkshopEvent's `startsAt` for use in the auto-provisioned Product's admin-facing
 * name, e.g. "2026-09-12 14:00". This is purely for Vendure admin legibility - the storefront
 * never renders Vendure's generic product page for tickets, it sources display content from
 * the Workshop/WorkshopEvent entities directly - so a simple deterministic UTC representation
 * (consistent with `DefaultWorkshopSkuStrategy`) is used rather than a locale-aware format.
 */
function formatEventDateTimeForAdmin(date: Date): string {
    return date.toISOString().slice(0, 16).replace('T', ' ');
}
