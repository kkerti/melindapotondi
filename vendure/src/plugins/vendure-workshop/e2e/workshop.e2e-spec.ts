import {
    createTestEnvironment,
    registerInitializer,
    SqljsInitializer,
    testConfig,
} from '@vendure/testing';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { VendureWorkshopPlugin } from '../vendure-workshop.plugin';
import { InitialData, DefaultLogger, LogLevel, mergeConfig } from '@vendure/core';
import path from 'path';
import {
    CREATE_WORKSHOP_EVENT,
    DELETE_WORKSHOP_EVENT,
    GET_WORKSHOP_EVENT,
    GET_WORKSHOP_EVENTS,
    GET_UPCOMING_WORKSHOP_EVENTS,
    RESERVE_WORKSHOP_SPOT,
    DELETE_EVENT_BOOKING,
    UPDATE_WORKSHOP_EVENT,
    GET_EVENT_BOOKINGS,
} from './graphql-operations';

// Minimal initial data for tests
const initialData: InitialData = {
    defaultLanguage: 'en' as any,
    defaultZone: 'Europe',
    taxRates: [],
    shippingMethods: [],
    paymentMethods: [],
    countries: [{ name: 'Hungary', code: 'HU', zone: 'Europe' }],
    collections: [],
};

describe('VendureWorkshopPlugin', () => {
    // Register SQL.js initializer for in-memory database
    registerInitializer('sqljs', new SqljsInitializer(path.join(__dirname, '__data__')));

    const { server, adminClient, shopClient } = createTestEnvironment(
        mergeConfig(testConfig, {
            logger: new DefaultLogger({ level: LogLevel.Error }),
            plugins: [VendureWorkshopPlugin.init({})],
        }),
    );

    // Helper to create a future date
    const futureDate = (daysFromNow: number): string => {
        const date = new Date();
        date.setDate(date.getDate() + daysFromNow);
        return date.toISOString();
    };

    // Helper to create a past date
    const pastDate = (daysAgo: number): string => {
        const date = new Date();
        date.setDate(date.getDate() - daysAgo);
        return date.toISOString();
    };

    beforeAll(async () => {
        await server.init({
            initialData,
            productsCsvPath: undefined,
            customerCount: 0,
        });
        await adminClient.asSuperAdmin();
    }, 60000);

    afterAll(async () => {
        await server.destroy();
    });

    describe('Admin API - Event CRUD', () => {
        let createdEventId: string;

        it('should create a workshop event', async () => {
            const { createWorkshopEvent } = await adminClient.query(CREATE_WORKSHOP_EVENT, {
                input: {
                    title: 'Pottery Basics',
                    description: 'Learn the fundamentals of pottery',
                    location: 'Studio A',
                    startsAt: futureDate(7),
                    endsAt: futureDate(7),
                    maxParticipants: 8,
                    bookingPassword: 'secret123',
                    isPublished: true,
                },
            });

            expect(createWorkshopEvent).toBeDefined();
            expect(createWorkshopEvent.title).toBe('Pottery Basics');
            expect(createWorkshopEvent.maxParticipants).toBe(8);
            expect(createWorkshopEvent.availableSlots).toBe(8);
            expect(createWorkshopEvent.bookings).toEqual([]);
            createdEventId = createWorkshopEvent.id;
        });

        it('should retrieve the created event', async () => {
            const { workshopEvent } = await adminClient.query(GET_WORKSHOP_EVENT, {
                id: createdEventId,
            });

            expect(workshopEvent).toBeDefined();
            expect(workshopEvent.id).toBe(createdEventId);
            expect(workshopEvent.title).toBe('Pottery Basics');
        });

        it('should list all workshop events', async () => {
            const { workshopEvents } = await adminClient.query(GET_WORKSHOP_EVENTS, {});

            expect(workshopEvents.totalItems).toBeGreaterThanOrEqual(1);
            expect(workshopEvents.items.some((e: any) => e.id === createdEventId)).toBe(true);
        });

        it('should update a workshop event', async () => {
            const { updateWorkshopEvent } = await adminClient.query(UPDATE_WORKSHOP_EVENT, {
                input: {
                    id: createdEventId,
                    title: 'Advanced Pottery',
                    maxParticipants: 10,
                },
            });

            expect(updateWorkshopEvent.title).toBe('Advanced Pottery');
            expect(updateWorkshopEvent.maxParticipants).toBe(10);
            // Other fields should remain unchanged
            expect(updateWorkshopEvent.location).toBe('Studio A');
        });

        it('should delete a workshop event', async () => {
            // Create a temporary event to delete
            const { createWorkshopEvent: tempEvent } = await adminClient.query(CREATE_WORKSHOP_EVENT, {
                input: {
                    title: 'Temp Event',
                    description: 'To be deleted',
                    location: 'Studio B',
                    startsAt: futureDate(14),
                    endsAt: futureDate(14),
                    maxParticipants: 5,
                    bookingPassword: 'delete123',
                    isPublished: false,
                },
            });

            const { deleteWorkshopEvent } = await adminClient.query(DELETE_WORKSHOP_EVENT, {
                id: tempEvent.id,
            });

            expect(deleteWorkshopEvent.result).toBe('DELETED');

            // Verify it's gone
            const { workshopEvent } = await adminClient.query(GET_WORKSHOP_EVENT, {
                id: tempEvent.id,
            });
            expect(workshopEvent).toBeNull();
        });
    });

    describe('Shop API - View Events', () => {
        let publishedEventId: string;
        let unpublishedEventId: string;

        beforeAll(async () => {
            // Create a published future event
            const { createWorkshopEvent: published } = await adminClient.query(CREATE_WORKSHOP_EVENT, {
                input: {
                    title: 'Public Pottery Class',
                    description: 'Open to everyone',
                    location: 'Main Studio',
                    startsAt: futureDate(5),
                    endsAt: futureDate(5),
                    maxParticipants: 6,
                    bookingPassword: 'publicpass',
                    isPublished: true,
                },
            });
            publishedEventId = published.id;

            // Create an unpublished event
            const { createWorkshopEvent: unpublished } = await adminClient.query(CREATE_WORKSHOP_EVENT, {
                input: {
                    title: 'Private Workshop',
                    description: 'Not yet announced',
                    location: 'Private Studio',
                    startsAt: futureDate(10),
                    endsAt: futureDate(10),
                    maxParticipants: 4,
                    bookingPassword: 'privatepass',
                    isPublished: false,
                },
            });
            unpublishedEventId = unpublished.id;
        });

        it('should list only published upcoming events', async () => {
            const { upcomingWorkshopEvents } = await shopClient.query(GET_UPCOMING_WORKSHOP_EVENTS, {});

            expect(upcomingWorkshopEvents.items.some((e: any) => e.id === publishedEventId)).toBe(true);
            expect(upcomingWorkshopEvents.items.some((e: any) => e.id === unpublishedEventId)).toBe(false);
        });

        it('should return published event by ID', async () => {
            const { workshopEvent } = await shopClient.query(
                `query GetShopWorkshopEvent($id: ID!) {
                    workshopEvent(id: $id) {
                        id
                        title
                    }
                }`,
                { id: publishedEventId },
            );

            expect(workshopEvent).toBeDefined();
            expect(workshopEvent.title).toBe('Public Pottery Class');
        });

        it('should NOT return unpublished event by ID', async () => {
            const { workshopEvent } = await shopClient.query(
                `query GetShopWorkshopEvent($id: ID!) {
                    workshopEvent(id: $id) {
                        id
                        title
                    }
                }`,
                { id: unpublishedEventId },
            );

            expect(workshopEvent).toBeNull();
        });
    });

    describe('Shop API - Booking Reservations', () => {
        let eventId: string;
        const eventPassword = 'booking-test-pass';

        beforeAll(async () => {
            const { createWorkshopEvent } = await adminClient.query(CREATE_WORKSHOP_EVENT, {
                input: {
                    title: 'Booking Test Event',
                    description: 'For testing reservations',
                    location: 'Test Studio',
                    startsAt: futureDate(3),
                    endsAt: futureDate(3),
                    maxParticipants: 2, // Small limit to test full scenarios
                    bookingPassword: eventPassword,
                    isPublished: true,
                },
            });
            eventId = createWorkshopEvent.id;
        });

        it('should reserve a spot with valid credentials', async () => {
            const { reserveWorkshopSpot } = await shopClient.query(RESERVE_WORKSHOP_SPOT, {
                input: {
                    eventId,
                    nickname: 'Alice',
                    password: eventPassword,
                    email: 'alice@example.com',
                },
            });

            expect(reserveWorkshopSpot.id).toBeDefined();
            expect(reserveWorkshopSpot.nickname).toBe('Alice');
            expect(reserveWorkshopSpot.email).toBe('alice@example.com');
            expect(reserveWorkshopSpot.event.id).toBe(eventId);
        });

        it('should reject booking with invalid password', async () => {
            const { reserveWorkshopSpot } = await shopClient.query(RESERVE_WORKSHOP_SPOT, {
                input: {
                    eventId,
                    nickname: 'BadActor',
                    password: 'wrong-password',
                },
            });

            expect(reserveWorkshopSpot.errorCode).toBe('INVALID_PASSWORD');
            expect(reserveWorkshopSpot.message).toContain('Invalid');
        });

        it('should reject duplicate nickname for same event', async () => {
            const { reserveWorkshopSpot } = await shopClient.query(RESERVE_WORKSHOP_SPOT, {
                input: {
                    eventId,
                    nickname: 'Alice', // Already booked
                    password: eventPassword,
                },
            });

            expect(reserveWorkshopSpot.errorCode).toBe('DUPLICATE_NICKNAME');
        });

        it('should allow second booking until event is full', async () => {
            const { reserveWorkshopSpot } = await shopClient.query(RESERVE_WORKSHOP_SPOT, {
                input: {
                    eventId,
                    nickname: 'Bob',
                    password: eventPassword,
                },
            });

            expect(reserveWorkshopSpot.id).toBeDefined();
            expect(reserveWorkshopSpot.nickname).toBe('Bob');
        });

        it('should reject booking when event is full', async () => {
            // Event only has 2 slots, both are now taken
            const { reserveWorkshopSpot } = await shopClient.query(RESERVE_WORKSHOP_SPOT, {
                input: {
                    eventId,
                    nickname: 'Charlie',
                    password: eventPassword,
                },
            });

            expect(reserveWorkshopSpot.errorCode).toBe('EVENT_FULL');
            expect(reserveWorkshopSpot.message).toContain('fully booked');
        });

        it('should show correct available slots after bookings', async () => {
            const { upcomingWorkshopEvents } = await shopClient.query(GET_UPCOMING_WORKSHOP_EVENTS, {});

            const event = upcomingWorkshopEvents.items.find((e: any) => e.id === eventId);
            expect(event.availableSlots).toBe(0);
            expect(event.bookings.length).toBe(2);
        });

        it('should reject booking for non-existent event', async () => {
            const { reserveWorkshopSpot } = await shopClient.query(RESERVE_WORKSHOP_SPOT, {
                input: {
                    eventId: '99999',
                    nickname: 'Ghost',
                    password: 'any',
                },
            });

            expect(reserveWorkshopSpot.errorCode).toBe('EVENT_NOT_FOUND');
        });
    });

    describe('Admin API - Booking Management', () => {
        let eventId: string;
        let bookingId: string;

        beforeAll(async () => {
            // Create event with bookings
            const { createWorkshopEvent } = await adminClient.query(CREATE_WORKSHOP_EVENT, {
                input: {
                    title: 'Admin Booking Test',
                    description: 'For admin booking tests',
                    location: 'Admin Studio',
                    startsAt: futureDate(8),
                    endsAt: futureDate(8),
                    maxParticipants: 5,
                    bookingPassword: 'admin-test',
                    isPublished: true,
                },
            });
            eventId = createWorkshopEvent.id;

            // Create a booking via shop API
            const { reserveWorkshopSpot } = await shopClient.query(RESERVE_WORKSHOP_SPOT, {
                input: {
                    eventId,
                    nickname: 'ToDelete',
                    password: 'admin-test',
                },
            });
            bookingId = reserveWorkshopSpot.id;
        });

        it('should list bookings for an event', async () => {
            const { eventBookings } = await adminClient.query(GET_EVENT_BOOKINGS, {
                eventId,
            });

            expect(eventBookings.totalItems).toBe(1);
            expect(eventBookings.items[0].nickname).toBe('ToDelete');
        });

        it('should delete a booking (admin)', async () => {
            const { deleteEventBooking } = await adminClient.query(DELETE_EVENT_BOOKING, {
                id: bookingId,
            });

            expect(deleteEventBooking.result).toBe('DELETED');

            // Verify slot is available again
            const { workshopEvent } = await adminClient.query(GET_WORKSHOP_EVENT, {
                id: eventId,
            });
            expect(workshopEvent.availableSlots).toBe(5);
        });
    });

    describe('Unpublished Event Booking', () => {
        let unpublishedEventId: string;

        beforeAll(async () => {
            const { createWorkshopEvent } = await adminClient.query(CREATE_WORKSHOP_EVENT, {
                input: {
                    title: 'Unpublished Event',
                    description: 'Should not accept bookings',
                    location: 'Hidden Studio',
                    startsAt: futureDate(15),
                    endsAt: futureDate(15),
                    maxParticipants: 10,
                    bookingPassword: 'hidden-pass',
                    isPublished: false,
                },
            });
            unpublishedEventId = createWorkshopEvent.id;
        });

        it('should reject booking for unpublished event', async () => {
            const { reserveWorkshopSpot } = await shopClient.query(RESERVE_WORKSHOP_SPOT, {
                input: {
                    eventId: unpublishedEventId,
                    nickname: 'Sneaky',
                    password: 'hidden-pass',
                },
            });

            expect(reserveWorkshopSpot.errorCode).toBe('EVENT_NOT_PUBLISHED');
        });
    });
});
