import { graphql } from '@/gql';

export const workshopListDocument = graphql(`
    query GetWorkshops($options: WorkshopListOptions) {
        workshops(options: $options) {
            items {
                id
                createdAt
                updatedAt
                title
                slug
                defaultDurationMinutes
                defaultCapacity
                defaultPriceInCents
                isActive
            }
            totalItems
        }
    }
`);

export const workshopDetailDocument = graphql(`
    query GetWorkshop($id: ID!) {
        workshop(id: $id) {
            id
            createdAt
            updatedAt
            title
            description
            slug
            defaultDurationMinutes
            defaultCapacity
            defaultPriceInCents
            isActive
        }
    }
`);

export const createWorkshopDocument = graphql(`
    mutation CreateWorkshop($input: CreateWorkshopInput!) {
        createWorkshop(input: $input) {
            id
        }
    }
`);

export const updateWorkshopDocument = graphql(`
    mutation UpdateWorkshop($input: UpdateWorkshopInput!) {
        updateWorkshop(input: $input) {
            id
        }
    }
`);

export const deleteWorkshopDocument = graphql(`
    mutation DeleteWorkshop($id: ID!) {
        deleteWorkshop(id: $id) {
            result
            message
        }
    }
`);
