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
