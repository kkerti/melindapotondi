import { DeepPartial, VendureEntity } from '@vendure/core';
import { Column, Entity, OneToMany, Index } from 'typeorm';
import { EventBooking } from './event-booking.entity';

/**
 * @description
 * A WorkshopEvent represents a scheduled ceramic workshop session
 * that participants can book.
 */
@Entity()
export class WorkshopEvent extends VendureEntity {
    constructor(input?: DeepPartial<WorkshopEvent>) {
        super(input);
    }

    /**
     * @description
     * The title/name of the workshop event
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
     * Physical location where the workshop takes place
     */
    @Column()
    location: string;

    /**
     * @description
     * When the workshop starts
     */
    @Index()
    @Column()
    startsAt: Date;

    /**
     * @description
     * When the workshop ends
     */
    @Column()
    endsAt: Date;

    /**
     * @description
     * Maximum number of participants allowed
     */
    @Column()
    maxParticipants: number;

    /**
     * @description
     * Shared password required to book a spot (MVP auth)
     */
    @Column()
    bookingPassword: string;

    /**
     * @description
     * Whether the event is published and visible to customers
     */
    @Column({ default: true })
    isPublished: boolean;

    /**
     * @description
     * Bookings for this event
     */
    @OneToMany(() => EventBooking, booking => booking.event)
    bookings: EventBooking[];
}
