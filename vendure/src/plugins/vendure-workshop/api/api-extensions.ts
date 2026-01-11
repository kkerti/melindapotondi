import gql from 'graphql-tag';

/**
 * Common types shared between Admin and Shop APIs
 */
const commonApiExtensions = gql`
    type WorkshopEvent implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        title: String!
        description: String
        location: String!
        startsAt: DateTime!
        endsAt: DateTime!
        maxParticipants: Int!
        isPublished: Boolean!
        bookings: [EventBooking!]!
        availableSlots: Int!
    }

    type EventBooking implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        nickname: String!
        email: String
        event: WorkshopEvent!
    }

    type WorkshopEventList implements PaginatedList {
        items: [WorkshopEvent!]!
        totalItems: Int!
    }

    type EventBookingList implements PaginatedList {
        items: [EventBooking!]!
        totalItems: Int!
    }

    # Error types following Vendure's ErrorResult pattern
    enum WorkshopErrorCode {
        EVENT_NOT_FOUND
        EVENT_FULL
        INVALID_PASSWORD
        EVENT_NOT_PUBLISHED
        BOOKING_NOT_FOUND
        DUPLICATE_NICKNAME
    }

    interface WorkshopErrorResult {
        errorCode: WorkshopErrorCode!
        message: String!
    }

    type EventNotFoundError implements WorkshopErrorResult {
        errorCode: WorkshopErrorCode!
        message: String!
    }

    type EventFullError implements WorkshopErrorResult {
        errorCode: WorkshopErrorCode!
        message: String!
    }

    type InvalidPasswordError implements WorkshopErrorResult {
        errorCode: WorkshopErrorCode!
        message: String!
    }

    type EventNotPublishedError implements WorkshopErrorResult {
        errorCode: WorkshopErrorCode!
        message: String!
    }

    type DuplicateNicknameError implements WorkshopErrorResult {
        errorCode: WorkshopErrorCode!
        message: String!
    }
`;

/**
 * Admin API extensions for managing workshop events and bookings
 */
export const adminApiExtensions = gql`
    ${commonApiExtensions}

    input CreateWorkshopEventInput {
        title: String!
        description: String
        location: String!
        startsAt: DateTime!
        endsAt: DateTime!
        maxParticipants: Int!
        bookingPassword: String!
        isPublished: Boolean
    }

    input UpdateWorkshopEventInput {
        id: ID!
        title: String
        description: String
        location: String
        startsAt: DateTime
        endsAt: DateTime
        maxParticipants: Int
        bookingPassword: String
        isPublished: Boolean
    }

    input WorkshopEventListOptions {
        skip: Int
        take: Int
        sort: WorkshopEventSortParameter
        filter: WorkshopEventFilterParameter
    }

    input WorkshopEventSortParameter {
        id: SortOrder
        createdAt: SortOrder
        updatedAt: SortOrder
        title: SortOrder
        startsAt: SortOrder
        endsAt: SortOrder
        maxParticipants: SortOrder
    }

    input WorkshopEventFilterParameter {
        id: IDOperators
        createdAt: DateOperators
        updatedAt: DateOperators
        title: StringOperators
        location: StringOperators
        startsAt: DateOperators
        endsAt: DateOperators
        maxParticipants: NumberOperators
        isPublished: BooleanOperators
    }

    input EventBookingListOptions {
        skip: Int
        take: Int
        sort: EventBookingSortParameter
        filter: EventBookingFilterParameter
    }

    input EventBookingSortParameter {
        id: SortOrder
        createdAt: SortOrder
        updatedAt: SortOrder
        nickname: SortOrder
    }

    input EventBookingFilterParameter {
        id: IDOperators
        createdAt: DateOperators
        updatedAt: DateOperators
        nickname: StringOperators
        email: StringOperators
    }

    extend type Query {
        """
        Get a single workshop event by ID
        """
        workshopEvent(id: ID!): WorkshopEvent

        """
        Get a paginated list of all workshop events
        """
        workshopEvents(options: WorkshopEventListOptions): WorkshopEventList!

        """
        Get all bookings, optionally filtered by event
        """
        eventBookings(eventId: ID, options: EventBookingListOptions): EventBookingList!

        """
        Get a single booking by ID
        """
        eventBooking(id: ID!): EventBooking
    }

    extend type Mutation {
        """
        Create a new workshop event
        """
        createWorkshopEvent(input: CreateWorkshopEventInput!): WorkshopEvent!

        """
        Update an existing workshop event
        """
        updateWorkshopEvent(input: UpdateWorkshopEventInput!): WorkshopEvent!

        """
        Delete a workshop event and all its bookings
        """
        deleteWorkshopEvent(id: ID!): DeletionResponse!

        """
        Cancel/delete a booking (admin)
        """
        deleteEventBooking(id: ID!): DeletionResponse!
    }
`;

/**
 * Shop API extensions for customers to view and book events
 */
export const shopApiExtensions = gql`
    ${commonApiExtensions}

    input ReserveWorkshopSpotInput {
        eventId: ID!
        nickname: String!
        password: String!
        email: String
    }

    input UpcomingWorkshopEventsOptions {
        skip: Int
        take: Int
    }

    union ReserveSpotResult =
          EventBooking
        | EventNotFoundError
        | EventFullError
        | InvalidPasswordError
        | EventNotPublishedError
        | DuplicateNicknameError

    extend type Query {
        """
        Get upcoming published workshop events
        """
        upcomingWorkshopEvents(options: UpcomingWorkshopEventsOptions): WorkshopEventList!

        """
        Get a single workshop event by ID (only if published)
        """
        workshopEvent(id: ID!): WorkshopEvent
    }

    extend type Mutation {
        """
        Reserve a spot at a workshop event using nickname and shared password
        """
        reserveWorkshopSpot(input: ReserveWorkshopSpotInput!): ReserveSpotResult!
    }
`;
