import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity, ManyToOne, Index } from 'typeorm';
import { WorkshopEvent } from './workshop-event.entity';

/**
 * @description
 * An EventBooking represents a participant's reservation for a workshop event.
 */
@Entity()
export class EventBooking extends VendureEntity {
    constructor(input?: DeepPartial<EventBooking>) {
        super(input);
    }

    /**
     * @description
     * The nickname the participant provided when booking
     */
    @Column()
    nickname: string;

    /**
     * @description
     * Optional email for notifications (can be added later)
     */
    @Column({ type: 'varchar', nullable: true })
    email: string | null;

    /**
     * @description
     * Reference to the booked event
     */
    @Index()
    @ManyToOne(() => WorkshopEvent, event => event.bookings, { onDelete: 'CASCADE' })
    event: WorkshopEvent;
}
