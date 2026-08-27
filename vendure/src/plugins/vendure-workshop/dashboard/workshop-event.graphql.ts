import { graphql } from '@/gql';

export const workshopEventListDocument = graphql(`
    query GetWorkshopEvents($options: WorkshopEventListOptions) {
        workshopEvents(options: $options) {
            items {
                id
                startsAt
                endsAt
                location
                capacity
                priceInCents
                isPublished
            }
            totalItems
        }
    }
`);

export const workshopEventDetailDocument = graphql(`
    query GetWorkshopEvent($id: ID!) {
        workshopEvent(id: $id) {
            id
            createdAt
            updatedAt
            workshop {
                id
                title
            }
            startsAt
            endsAt
            location
            capacity
            priceInCents
            isPublished
            productId
            productVariantId
        }
    }
`);

export const createWorkshopEventDocument = graphql(`
    mutation CreateWorkshopEvent($input: CreateWorkshopEventInput!) {
        createWorkshopEvent(input: $input) {
            id
        }
    }
`);

export const updateWorkshopEventDocument = graphql(`
    mutation UpdateWorkshopEvent($input: UpdateWorkshopEventInput!) {
        updateWorkshopEvent(input: $input) {
            id
        }
    }
`);

export const deleteWorkshopEventDocument = graphql(`
    mutation DeleteWorkshopEvent($id: ID!) {
        deleteWorkshopEvent(id: $id) {
            result
            message
        }
    }
`);

export const workshopsForSelectorDocument = graphql(`
    query GetWorkshopsForSelector($options: WorkshopListOptions) {
        workshops(options: $options) {
            items {
                id
                title
            }
            totalItems
        }
    }
`);
