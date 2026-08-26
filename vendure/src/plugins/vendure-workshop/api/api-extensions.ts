import gql from 'graphql-tag';

/**
 * Common types shared between Admin and Shop APIs
 */
const commonApiExtensions = gql`
    type Workshop implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        title: String!
        description: String
        slug: String!
        defaultDurationMinutes: Int!
        defaultCapacity: Int!
        defaultPriceInCents: Int!
        isActive: Boolean!
        events: [WorkshopEvent!]!
    }

    type WorkshopEvent implements Node {
        id: ID!
        createdAt: DateTime!
        updatedAt: DateTime!
        workshop: Workshop!
        startsAt: DateTime!
        endsAt: DateTime!
        location: String!
        capacity: Int!
        priceInCents: Int
        isPublished: Boolean!
        productId: ID
        productVariantId: ID
    }

    type WorkshopList implements PaginatedList {
        items: [Workshop!]!
        totalItems: Int!
    }

    type WorkshopEventList implements PaginatedList {
        items: [WorkshopEvent!]!
        totalItems: Int!
    }
`;

/**
 * Admin API extensions for managing workshop templates and their scheduled events
 */
export const adminApiExtensions = gql`
    ${commonApiExtensions}

    input CreateWorkshopInput {
        title: String!
        description: String
        slug: String!
        defaultDurationMinutes: Int!
        defaultCapacity: Int!
        defaultPriceInCents: Int
        isActive: Boolean
    }

    input UpdateWorkshopInput {
        id: ID!
        title: String
        description: String
        slug: String
        defaultDurationMinutes: Int
        defaultCapacity: Int
        defaultPriceInCents: Int
        isActive: Boolean
    }

    input CreateWorkshopEventInput {
        workshopId: ID!
        startsAt: DateTime!
        """
        Optional - if omitted, computed as startsAt + workshop.defaultDurationMinutes.
        """
        endsAt: DateTime
        location: String!
        """
        Optional - if omitted, defaults to workshop.defaultCapacity.
        """
        capacity: Int
        priceInCents: Int
        isPublished: Boolean
    }

    input UpdateWorkshopEventInput {
        id: ID!
        workshopId: ID
        startsAt: DateTime
        endsAt: DateTime
        location: String
        capacity: Int
        priceInCents: Int
        isPublished: Boolean
    }

    input WorkshopListOptions {
        skip: Int
        take: Int
        sort: WorkshopSortParameter
        filter: WorkshopFilterParameter
    }

    input WorkshopSortParameter {
        id: SortOrder
        createdAt: SortOrder
        updatedAt: SortOrder
        title: SortOrder
        slug: SortOrder
        defaultDurationMinutes: SortOrder
        defaultCapacity: SortOrder
        defaultPriceInCents: SortOrder
    }

    input WorkshopFilterParameter {
        id: IDOperators
        createdAt: DateOperators
        updatedAt: DateOperators
        title: StringOperators
        slug: StringOperators
        defaultDurationMinutes: NumberOperators
        defaultCapacity: NumberOperators
        defaultPriceInCents: NumberOperators
        isActive: BooleanOperators
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
        startsAt: SortOrder
        endsAt: SortOrder
        capacity: SortOrder
        priceInCents: SortOrder
    }

    input WorkshopEventFilterParameter {
        id: IDOperators
        createdAt: DateOperators
        updatedAt: DateOperators
        startsAt: DateOperators
        endsAt: DateOperators
        location: StringOperators
        capacity: NumberOperators
        priceInCents: NumberOperators
        isPublished: BooleanOperators
    }

    extend type Query {
        """
        Get a single workshop template by ID
        """
        workshop(id: ID!): Workshop

        """
        Get a paginated list of all workshop templates
        """
        workshops(options: WorkshopListOptions): WorkshopList!

        """
        Get a single workshop event by ID
        """
        workshopEvent(id: ID!): WorkshopEvent

        """
        Get a paginated list of all workshop events
        """
        workshopEvents(options: WorkshopEventListOptions): WorkshopEventList!
    }

    extend type Mutation {
        """
        Create a new workshop template
        """
        createWorkshop(input: CreateWorkshopInput!): Workshop!

        """
        Update an existing workshop template
        """
        updateWorkshop(input: UpdateWorkshopInput!): Workshop!

        """
        Delete a workshop template. Fails if any workshop events still reference it.
        """
        deleteWorkshop(id: ID!): DeletionResponse!

        """
        Create a new scheduled workshop event from a workshop template
        """
        createWorkshopEvent(input: CreateWorkshopEventInput!): WorkshopEvent!

        """
        Update an existing workshop event
        """
        updateWorkshopEvent(input: UpdateWorkshopEventInput!): WorkshopEvent!

        """
        Delete a workshop event
        """
        deleteWorkshopEvent(id: ID!): DeletionResponse!
    }
`;

/**
 * Shop API extensions for customers to browse workshops and their upcoming events
 */
export const shopApiExtensions = gql`
    ${commonApiExtensions}

    input UpcomingWorkshopEventsOptions {
        skip: Int
        take: Int
    }

    extend type Query {
        """
        Get upcoming, published workshop events
        """
        upcomingWorkshopEvents(options: UpcomingWorkshopEventsOptions): WorkshopEventList!

        """
        Get a single published workshop event by ID
        """
        workshopEvent(id: ID!): WorkshopEvent

        """
        Get a single active workshop template by ID
        """
        workshop(id: ID!): Workshop
    }
`;
