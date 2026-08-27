import { VENDURE_SHOP_API_URL } from "astro:env/client";
import type { BarionPaymentResult } from "./payment";

// Channel-scoped client functions for the single-ticket workshop reserve flow. These
// mirror cart.ts/payment.ts's exact fetch pattern (raw fetch, credentials: 'include' so
// the session cookie carries the active order across calls) but add the `vendure-token:
// workshops` header to every request, so addItemToOrder/setCustomerForOrder/
// initiateBarionPayment all resolve against the same channel-scoped active order.
const WORKSHOP_CHANNEL_TOKEN = "workshops";

async function postWorkshopOrderRequest(query: string, variables?: Record<string, unknown>) {
    const response = await fetch(VENDURE_SHOP_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "vendure-token": WORKSHOP_CHANNEL_TOKEN,
        },
        credentials: "include",
        body: JSON.stringify({ query, variables }),
    });
    return response.json();
}

export interface WorkshopOrderSuccessResult {
    success: true;
    orderId: string;
    orderCode: string;
}

export interface WorkshopOrderErrorResult {
    success: false;
    errorCode?: string;
    message: string;
    /** Only set when the failure was an InsufficientStockError. */
    quantityAvailable?: number;
}

export type WorkshopOrderResult = WorkshopOrderSuccessResult | WorkshopOrderErrorResult;

/**
 * Adds one ticket (quantity is always 1 — this is a single-ticket flow, no quantity
 * param) for the given ProductVariant to the current channel-scoped active order.
 * Mirrors cart.ts's addToCart: success is detected by the presence of `id` on the
 * union result (only the Order arm of the union has that field), same as cart.ts does.
 */
export async function addWorkshopTicketToOrder(productVariantId: string): Promise<WorkshopOrderResult> {
    const result = await postWorkshopOrderRequest(
        `
            mutation AddWorkshopTicketToOrder($productVariantId: ID!) {
                addItemToOrder(productVariantId: $productVariantId, quantity: 1) {
                    ... on Order {
                        id
                        code
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
        { productVariantId },
    );

    if (result.errors) {
        return {
            success: false,
            message: result.errors.map((e: { message: string }) => e.message).join(", "),
        };
    }

    const data = result.data?.addItemToOrder;
    if (data?.id) {
        return { success: true, orderId: data.id, orderCode: data.code };
    }
    return {
        success: false,
        errorCode: data?.errorCode,
        message: data?.message || "Failed to add ticket to order",
        quantityAvailable: data?.quantityAvailable,
    };
}

/**
 * Sets the guest customer (email + first/last name, the latter needed for Barion's
 * CardHolderNameHint) on the current channel-scoped active order.
 *
 * If the browser's session is already authenticated as a real Customer (e.g. from
 * unrelated testing/browsing on the site), Vendure's DefaultGuestCheckoutStrategy refuses
 * to also set a guest customer and returns ALREADY_LOGGED_IN_ERROR — but the order already
 * has that logged-in customer attached, so this is treated as success rather than blocking
 * the flow.
 */
export async function setWorkshopOrderCustomer(
    email: string,
    firstName: string,
    lastName: string,
): Promise<WorkshopOrderResult> {
    const result = await postWorkshopOrderRequest(
        `
            mutation SetWorkshopOrderCustomer($input: CreateCustomerInput!) {
                setCustomerForOrder(input: $input) {
                    ... on Order {
                        id
                        code
                    }
                    ... on ErrorResult {
                        errorCode
                        message
                    }
                }
            }
        `,
        { input: { emailAddress: email, firstName, lastName } },
    );

    if (result.errors) {
        return {
            success: false,
            message: result.errors.map((e: { message: string }) => e.message).join(", "),
        };
    }

    const data = result.data?.setCustomerForOrder;
    if (data?.id) {
        return { success: true, orderId: data.id, orderCode: data.code };
    }
    if (data?.errorCode === "ALREADY_LOGGED_IN_ERROR") {
        return { success: true, orderId: "", orderCode: "" };
    }
    return {
        success: false,
        errorCode: data?.errorCode,
        message: data?.message || "Failed to set customer for order",
    };
}

/**
 * Same shape as payment.ts's initiateBarionPayment (zero args — operates on whatever the
 * current active order is, resolved via session cookie) but with the extra
 * `vendure-token: workshops` header so it resolves the same channel-scoped order that
 * addWorkshopTicketToOrder/setWorkshopOrderCustomer created/updated. Reuses the
 * BarionPaymentResult type from payment.ts rather than redefining it; reuse
 * payment.ts's redirectToBarion helper as-is for the actual redirect (channel-agnostic).
 */
export async function initiateWorkshopTicketPayment(): Promise<BarionPaymentResult> {
    const result = await postWorkshopOrderRequest(`
        mutation InitiateWorkshopTicketPayment {
            initiateBarionPayment {
                success
                paymentId
                gatewayUrl
                errorMessage
            }
        }
    `);

    if (result.errors) {
        return {
            success: false,
            errorMessage: result.errors.map((e: { message: string }) => e.message).join(", "),
        };
    }

    return (
        result.data?.initiateBarionPayment || {
            success: false,
            errorMessage: "Failed to initiate payment",
        }
    );
}
