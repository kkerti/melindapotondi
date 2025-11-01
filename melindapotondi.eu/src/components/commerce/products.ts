import { VENDURE_SHOP_API_URL } from "astro:env/client";

export async function searchProducts(term: string){
    const response = await fetch(VENDURE_SHOP_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
            query: `
                query Search($term: String!, $skip: Int, $take: Int) {
                    search(input: {
                        term: $term,
                        groupByProduct: true,
                        skip: $skip,
                        take: $take 
                        }) {
                            items {
                                productName
                                slug
                                productVariantId
                                productAsset {
                                    preview
                                }
                                priceWithTax {
                                    ... on SinglePrice {
                                        value
                                    }
                                    ... on PriceRange {
                                        min
                                        max
                                    }
                                }
                            }
                            totalItems
                    }
                }
            `,
            variables: {
                term,
            },
        }),
    });

    const result = await response.json();
    if(result.data?.search?.items){
        return result.data.search.items 
    }
    return result
}

export async function getProductDetail(slug: string){
    const response = await fetch(VENDURE_SHOP_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
            query: `
                query GetProductDetail($slug: String!) {
                    product(slug: $slug) {
                        id
                        name
                        description
                        featuredAsset {
                            id
                            preview
                        }
                        assets {
                            id
                            preview
                        }
                        variants {
                            id
                            name
                            sku
                            stockLevel
                            currencyCode
                            price
                            priceWithTax
                            featuredAsset {
                                id
                                preview
                            }
                            assets {
                                id
                                preview
                            }
                        }
                    }
                }
            `,
            variables: {
                slug,
            },
        }),
    });

    const result = await response.json();
    console.log(result.data);
    if(result.data?.product){
        return result.data.product
    }
    return result
}
