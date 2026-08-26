import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { Permission } from '@vendure/common/lib/generated-types';
import { Allow, Ctx, ID, ListQueryOptions, RequestContext, Transaction } from '@vendure/core';
import { WorkshopEvent } from '../entities/workshop-event.entity';
import { Workshop } from '../entities/workshop.entity';
import { WorkshopEventService } from '../services/workshop-event.service';
import { WorkshopService } from '../services/workshop.service';
import {
    CreateWorkshopEventInput,
    CreateWorkshopInput,
    UpdateWorkshopEventInput,
    UpdateWorkshopInput,
} from '../types';

@Resolver()
export class WorkshopAdminResolver {
    constructor(
        private workshopService: WorkshopService,
        private workshopEventService: WorkshopEventService,
    ) {}

    @Query()
    @Allow(Permission.SuperAdmin)
    async workshop(@Ctx() ctx: RequestContext, @Args() args: { id: ID }): Promise<Workshop | null> {
        return this.workshopService.findOne(ctx, args.id);
    }

    @Query()
    @Allow(Permission.SuperAdmin)
    async workshops(@Ctx() ctx: RequestContext, @Args() args: { options?: ListQueryOptions<Workshop> }) {
        return this.workshopService.findAll(ctx, args.options, ['events']);
    }

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
        return this.workshopEventService.findAll(ctx, args.options, ['workshop']);
    }

    @Transaction()
    @Mutation()
    @Allow(Permission.SuperAdmin)
    async createWorkshop(
        @Ctx() ctx: RequestContext,
        @Args() args: { input: CreateWorkshopInput },
    ): Promise<Workshop> {
        return this.workshopService.create(ctx, args.input);
    }

    @Transaction()
    @Mutation()
    @Allow(Permission.SuperAdmin)
    async updateWorkshop(
        @Ctx() ctx: RequestContext,
        @Args() args: { input: UpdateWorkshopInput },
    ): Promise<Workshop> {
        return this.workshopService.update(ctx, args.input);
    }

    @Transaction()
    @Mutation()
    @Allow(Permission.SuperAdmin)
    async deleteWorkshop(@Ctx() ctx: RequestContext, @Args() args: { id: ID }) {
        return this.workshopService.delete(ctx, args.id);
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
}
