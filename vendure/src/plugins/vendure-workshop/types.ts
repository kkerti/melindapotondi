import { ID } from '@vendure/common/lib/shared-types';

/**
 * @description
 * The plugin can be configured using the following options:
 */
export interface PluginInitOptions {}

// ============ Input Types ============

export interface CreateWorkshopInput {
    title: string;
    description?: string | null;
    slug: string;
    defaultDurationMinutes: number;
    defaultCapacity: number;
    defaultPriceInCents?: number;
    isActive?: boolean;
}

export interface UpdateWorkshopInput {
    id: ID;
    title?: string;
    description?: string | null;
    slug?: string;
    defaultDurationMinutes?: number;
    defaultCapacity?: number;
    defaultPriceInCents?: number;
    isActive?: boolean;
}

export interface CreateWorkshopEventInput {
    workshopId: ID;
    startsAt: Date;
    /**
     * @description
     * Optional - if omitted, computed as `startsAt + workshop.defaultDurationMinutes`.
     */
    endsAt?: Date;
    location: string;
    /**
     * @description
     * Optional - if omitted, defaults to `workshop.defaultCapacity`.
     */
    capacity?: number;
    priceInCents?: number | null;
    isPublished?: boolean;
}

export interface UpdateWorkshopEventInput {
    id: ID;
    workshopId?: ID;
    startsAt?: Date;
    endsAt?: Date;
    location?: string;
    capacity?: number;
    priceInCents?: number | null;
    isPublished?: boolean;
}
