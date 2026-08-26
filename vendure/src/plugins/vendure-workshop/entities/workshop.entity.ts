import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity, Index, OneToMany } from 'typeorm';
import { WorkshopEvent } from './workshop-event.entity';

/**
 * @description
 * A Workshop is a reusable template describing a type of ceramics workshop
 * that can be offered (e.g. "Beginner Wheel Throwing"). It is never sold
 * directly - instead, individual scheduled `WorkshopEvent`s are created from
 * it, and those WorkshopEvents are the ones provisioned as purchasable
 * Vendure Products.
 */
@Entity()
export class Workshop extends VendureEntity {
    constructor(input?: DeepPartial<Workshop>) {
        super(input);
    }

    /**
     * @description
     * The title/name of the workshop template
     */
    @Column()
    title: string;

    /**
     * @description
     * Detailed description of what the workshop covers
     */
    @Column('text', { nullable: true })
    description: string | null;

    /**
     * @description
     * Unique kebab-case slug used as the base for generating SKUs
     * for Events created from this Workshop (e.g. "korongozas-kezdo").
     */
    @Index({ unique: true })
    @Column()
    slug: string;

    /**
     * @description
     * The default duration (in minutes) of a WorkshopEvent created from this
     * Workshop.
     */
    @Column()
    defaultDurationMinutes: number;

    /**
     * @description
     * The default maximum number of participants for a WorkshopEvent created
     * from this Workshop. Can be overridden per-event.
     */
    @Column()
    defaultCapacity: number;

    /**
     * @description
     * The default ticket price, stored as an integer in the smallest currency
     * unit (e.g. fillér for HUF), following Vendure's money convention.
     * Can be overridden per-event.
     */
    @Column({ default: 500000 })
    defaultPriceInCents: number;

    /**
     * @description
     * Whether this template can currently be used to create new
     * WorkshopEvents.
     */
    @Column({ default: true })
    isActive: boolean;

    /**
     * @description
     * The scheduled WorkshopEvents created from this Workshop.
     */
    @OneToMany(() => WorkshopEvent, event => event.workshop)
    events: WorkshopEvent[];
}
