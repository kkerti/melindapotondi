import gql from 'graphql-tag';

// Admin API fragments and operations
export const WORKSHOP_EVENT_FRAGMENT = gql`
    fragment WorkshopEventFields on WorkshopEvent {
        id
        createdAt
        updatedAt
        title
        description
        location
        startsAt
        endsAt
        maxParticipants
        isPublished
        availableSlots
        bookings {
            id
            nickname
            email
        }
    }
`;

export const EVENT_BOOKING_FRAGMENT = gql`
    fragment EventBookingFields on EventBooking {
        id
        createdAt
        updatedAt
        nickname
        email
        event {
            id
            title
        }
    }
`;

// Admin Queries
export const GET_WORKSHOP_EVENT = gql`
    ${WORKSHOP_EVENT_FRAGMENT}
    query GetWorkshopEvent($id: ID!) {
        workshopEvent(id: $id) {
            ...WorkshopEventFields
        }
    }
`;

export const GET_WORKSHOP_EVENTS = gql`
    ${WORKSHOP_EVENT_FRAGMENT}
    query GetWorkshopEvents($options: WorkshopEventListOptions) {
        workshopEvents(options: $options) {
            items {
                ...WorkshopEventFields
            }
            totalItems
        }
    }
`;

export const GET_EVENT_BOOKINGS = gql`
    ${EVENT_BOOKING_FRAGMENT}
    query GetEventBookings($eventId: ID, $options: EventBookingListOptions) {
        eventBookings(eventId: $eventId, options: $options) {
            items {
                ...EventBookingFields
            }
            totalItems
        }
    }
`;

// Admin Mutations
export const CREATE_WORKSHOP_EVENT = gql`
    ${WORKSHOP_EVENT_FRAGMENT}
    mutation CreateWorkshopEvent($input: CreateWorkshopEventInput!) {
        createWorkshopEvent(input: $input) {
            ...WorkshopEventFields
        }
    }
`;

export const UPDATE_WORKSHOP_EVENT = gql`
    ${WORKSHOP_EVENT_FRAGMENT}
    mutation UpdateWorkshopEvent($input: UpdateWorkshopEventInput!) {
        updateWorkshopEvent(input: $input) {
            ...WorkshopEventFields
        }
    }
`;

export const DELETE_WORKSHOP_EVENT = gql`
    mutation DeleteWorkshopEvent($id: ID!) {
        deleteWorkshopEvent(id: $id) {
            result
            message
        }
    }
`;

export const DELETE_EVENT_BOOKING = gql`
    mutation DeleteEventBooking($id: ID!) {
        deleteEventBooking(id: $id) {
            result
            message
        }
    }
`;

// Shop API operations
export const GET_UPCOMING_WORKSHOP_EVENTS = gql`
    query GetUpcomingWorkshopEvents($options: UpcomingWorkshopEventsOptions) {
        upcomingWorkshopEvents(options: $options) {
            items {
                id
                title
                description
                location
                startsAt
                endsAt
                maxParticipants
                availableSlots
                bookings {
                    id
                    nickname
                }
            }
            totalItems
        }
    }
`;

export const GET_SHOP_WORKSHOP_EVENT = gql`
    query GetShopWorkshopEvent($id: ID!) {
        workshopEvent(id: $id) {
            id
            title
            description
            location
            startsAt
            endsAt
            maxParticipants
            availableSlots
            bookings {
                id
                nickname
            }
        }
    }
`;

export const RESERVE_WORKSHOP_SPOT = gql`
    mutation ReserveWorkshopSpot($input: ReserveWorkshopSpotInput!) {
        reserveWorkshopSpot(input: $input) {
            ... on EventBooking {
                id
                nickname
                email
                event {
                    id
                    title
                }
            }
            ... on EventNotFoundError {
                errorCode
                message
            }
            ... on EventFullError {
                errorCode
                message
            }
            ... on InvalidPasswordError {
                errorCode
                message
            }
            ... on EventNotPublishedError {
                errorCode
                message
            }
            ... on DuplicateNicknameError {
                errorCode
                message
            }
        }
    }
`;
