import { ID } from '@vendure/common/lib/shared-types';
import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity, Index, ManyToOne } from 'typeorm';
import { Workshop } from './workshop.entity';

/**
 * @description
 * A WorkshopEvent represents a single scheduled occurrence of a Workshop
 * that customers can purchase a ticket for. Once auto-provisioning is added
 * in a later slice, each WorkshopEvent will have a corresponding Vendure
 * Product and ProductVariant (tracked here via `productId`/`productVariantId`)
 * so that Vendure's own pricing/stock/order/payment engine handles the
 * commerce side.
 */
@Entity()
export class WorkshopEvent extends VendureEntity {
    constructor(input?: DeepPartial<WorkshopEvent>) {
        super(input);
    }

    /**
     * @description
     * The Workshop template this event was scheduled from. A Workshop cannot
     * be deleted while it still has WorkshopEvents referencing it.
     */
    @Index()
    @ManyToOne(() => Workshop, workshop => workshop.events, { onDelete: 'RESTRICT' })
    workshop: Workshop;

    /**
     * @description
     * When the event starts
     */
    @Index()
    @Column()
    startsAt: Date;

    /**
     * @description
     * When the event ends
     */
    @Column()
    endsAt: Date;

    /**
     * @description
     * Physical location where the event takes place
     */
    @Column()
    location: string;

    /**
     * @description
     * Maximum number of participants allowed for this specific occurrence.
     * Defaults to the owning Workshop's `defaultCapacity` but can be
     * overridden per-event.
     */
    @Column()
    capacity: number;

    /**
     * @description
     * Ticket price for this specific occurrence, in the smallest currency
     * unit. A `null` value means the Workshop's `defaultPriceInCents`
     * should be used.
     */
    @Column({ type: 'int', nullable: true })
    priceInCents: number | null;

    /**
     * @description
     * Whether the event is published and visible in the storefront.
     */
    @Column({ default: true })
    isPublished: boolean;

    /**
     * @description
     * The ID of the Vendure Product provisioned for this event, populated by
     * a later slice's auto-provisioning logic. Stored as a plain ID column
     * rather than a relation to the core Product entity.
     */
    @Column({ type: 'varchar', nullable: true })
    productId: ID | null;

    /**
     * @description
     * The ID of the Vendure ProductVariant provisioned for this event,
     * populated by a later slice's auto-provisioning logic. Stored as a
     * plain ID column rather than a relation to the core ProductVariant
     * entity.
     */
    @Column({ type: 'varchar', nullable: true })
    productVariantId: ID | null;
}
