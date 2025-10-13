import { VENDURE_SHOP_API_URL } from "astro:env/client";
import { atom } from "nanostores";

export const $cart = atom()

export async function addToCart(productVariantId: string | number, quantity: number = 1){
    const response = await fetch(VENDURE_SHOP_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
            query: `
                mutation AddItemToOrder($productVariantId: ID!, $quantity: Int!) {
                    addItemToOrder(productVariantId: $productVariantId, quantity: $quantity) {
                        ... on Order {
                            id
                            code
                            total
                            totalWithTax
                            state
                            lines {
                                id
                                quantity
                                productVariant {
                                    id
                                    sku
                                    name
                                }
                                unitPrice
                                unitPriceWithTax
                                linePrice
                                linePriceWithTax
                            }
                        }
                        ... on ErrorResult {
                            errorCode
                            message
                        }
                        ... on InsufficientStockError {
                            errorCode
                            message
                            quantityAvailable
                        }
                    }
                }
            `,
            variables: {
                productVariantId,
                quantity
            },
        }),
    });

    const result = await response.json();
    if(result.data?.addItemToOrder?.id){
        $cart.set(result.data?.addItemToOrder)
    }
    return result
}

export async function removeCartLine(lineId: string) {
    const response = await fetch(VENDURE_SHOP_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
            query: `
                mutation RemoveOrderLine($orderLineId: ID!) {
                    removeOrderLine(orderLineId: $orderLineId) {
                        ... on Order {
                            id
                            code
                            total
                            totalWithTax
                            state
                            lines {
                                id
                                quantity
                                productVariant {
                                    id
                                    sku
                                    name
                                }
                                unitPrice
                                unitPriceWithTax
                                linePrice
                                linePriceWithTax
                            }
                        }
                        ... on ErrorResult {
                            errorCode
                            message
                        }
                    }
                }
            `,
            variables: { orderLineId: lineId },
        }),
    });

    const result = await response.json();
    if (result.data?.removeOrderLine?.id) {
        $cart.set(result.data.removeOrderLine);
    } else if (result.data?.removeOrderLine === null) {
        $cart.set(null);
    }
    return result;
}


