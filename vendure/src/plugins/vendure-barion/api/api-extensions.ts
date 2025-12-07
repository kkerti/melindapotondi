import gql from 'graphql-tag';

const barionAdminApiExtensions = gql`
    extend type Query {
        startPayment(id: ID!): Boolean!
    }
`;

const barionShopApiExtensions = gql`
    type BarionPaymentResult {
        success: Boolean!
        paymentId: String
        gatewayUrl: String
        errorMessage: String
    }

    extend type Mutation {
        """
        Initiates a Barion payment for the current active order.
        Returns the gateway URL to redirect the customer to complete payment.
        """
        initiateBarionPayment: BarionPaymentResult!
    }
`;

export const adminApiExtensions = gql`
    ${barionAdminApiExtensions}
`;

export const shopApiExtensions = gql`
    ${barionShopApiExtensions}
`;
