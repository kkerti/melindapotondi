import { VENDURE_SHOP_API_URL } from "astro:env/client";
import type { BarionPaymentResult } from "./payment";

// Client functions for the single-ticket workshop reserve flow, operating against the
// DEFAULT channel (workshop tickets are ordinary Products/Variants now, not a separate
// channel). These mirror cart.ts/payment.ts's exact fetch pattern (raw fetch,
// credentials: 'include' so the session cookie carries the active order across calls).
// addItemToOrder/setCustomerForOrder/initiateBarionPayment all resolve against the same
// default-channel active order.

async function postOrderRequest(query: string, variables?: Record<string, unknown>) {
    const response = await fetch(VENDURE_SHOP_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
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
 * param) for the given ProductVariant to the current active order. Mirrors cart.ts's
 * addToCart: success is detected by the presence of `id` on the union result.
 */
export async function addWorkshopTicketToOrder(productVariantId: string): Promise<WorkshopOrderResult> {
    const result = await postOrderRequest(
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
 * CardHolderNameHint) on the current active order.
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
    const result = await postOrderRequest(
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
 * Initiates a Barion payment for the current active order. Reuses `BarionPaymentResult`
 * from payment.ts and delegates the actual redirect to payment.ts's `redirectToBarion`.
 */
export async function initiateWorkshopTicketPayment(): Promise<BarionPaymentResult> {
    const result = await postOrderRequest(`
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