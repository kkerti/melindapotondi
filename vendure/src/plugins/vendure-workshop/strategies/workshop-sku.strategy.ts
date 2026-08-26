import { InjectableStrategy, RequestContext } from '@vendure/core';
import { Workshop } from '../entities/workshop.entity';
import { WorkshopEvent } from '../entities/workshop-event.entity';

/**
 * @description
 * This strategy defines how the SKU for the ProductVariant that gets
 * auto-provisioned for a WorkshopEvent is generated.
 */
export interface WorkshopSkuStrategy extends InjectableStrategy {
    /**
     * @description
     * Generates the SKU to use for the ProductVariant provisioned for the
     * given WorkshopEvent.
     */
    generateSku(ctx: RequestContext, workshop: Workshop, event: WorkshopEvent): string | Promise<string>;
}

/**
 * @description
 * The default `WorkshopSkuStrategy` generates a deterministic SKU of the
 * form `WORKSHOP-{workshop-slug}-{YYYYMMDD}-{HHmm}`, derived from the
 * WorkshopEvent's `startsAt` date, e.g.
 * `WORKSHOP-korongozas-kezdo-20260912-1400`.
 *
 * The date/time portion is formatted using UTC getters so the result is a
 * deterministic machine identifier rather than a locale-dependent display
 * string.
 */
export class DefaultWorkshopSkuStrategy implements WorkshopSkuStrategy {
    generateSku(ctx: RequestContext, workshop: Workshop, event: WorkshopEvent): string {
        const startsAt = event.startsAt;
        const year = startsAt.getUTCFullYear();
        const month = pad(startsAt.getUTCMonth() + 1);
        const day = pad(startsAt.getUTCDate());
        const hours = pad(startsAt.getUTCHours());
        const minutes = pad(startsAt.getUTCMinutes());

        return `WORKSHOP-${workshop.slug}-${year}${month}${day}-${hours}${minutes}`;
    }
}

function pad(value: number): string {
    return value.toString().padStart(2, '0');
}
