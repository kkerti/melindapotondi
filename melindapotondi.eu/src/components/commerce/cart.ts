import { VENDURE_SHOP_API_URL } from "astro:env/client";
import { writable } from "svelte/store";
import type { ActiveOrderResult, Order } from "../../generated/graphql";

export const cart = writable<Order|null>(null)

export async function getActiveOrder() {
    const response = await fetch(VENDURE_SHOP_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
            query: `
                query GetActiveOrder {
                    activeOrder {
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
                }
            `,
        }),
    });

    const result = await response.json();
    if (result.data?.activeOrder) {
        cart.set(result.data.activeOrder);
    }
    return result.data?.activeOrder || null;
}

export async function initializeCart() {
    try {
        const activeOrder = await getActiveOrder();
        return activeOrder;
    } catch (error) {
        console.error('Failed to initialize cart:', error);
        cart.set(null);
        return null;
    }
}

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
        cart.set(result.data?.addItemToOrder)
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
        cart.set(result.data.removeOrderLine);
    } else if (result.data?.removeOrderLine === null) {
        cart.set(null);
    }
    return result;
}

export function formatPrice(price: number): string {
    return new Intl.NumberFormat('hu-HU', {
        style: 'currency',
        currency: 'HUF',
        minimumFractionDigits: 0,
    }).format(price / 100);
}