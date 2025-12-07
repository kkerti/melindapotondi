import gql from 'graphql-tag';

const barionAdminApiExtensions = gql`
  extend type Query {
    startPayment(id: ID!): Boolean!
  }

`;
export const adminApiExtensions = gql`
  ${barionAdminApiExtensions}
`;
