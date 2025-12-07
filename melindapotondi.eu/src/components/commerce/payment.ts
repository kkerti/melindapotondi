import { VENDURE_SHOP_API_URL } from "astro:env/client";

export interface BarionPaymentResult {
    success: boolean;
    paymentId?: string;
    gatewayUrl?: string;
    errorMessage?: string;
}

/**
 * Initiates a Barion payment for the current active order.
 * Returns the gateway URL to redirect the customer to complete payment.
 */
export async function initiateBarionPayment(): Promise<BarionPaymentResult> {
    const response = await fetch(VENDURE_SHOP_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
            query: `
                mutation InitiateBarionPayment {
                    initiateBarionPayment {
                        success
                        paymentId
                        gatewayUrl
                        errorMessage
                    }
                }
            `,
        }),
    });

    const result = await response.json();
    
    if (result.errors) {
        return {
            success: false,
            errorMessage: result.errors.map((e: { message: string }) => e.message).join(', '),
        };
    }

    return result.data?.initiateBarionPayment || {
        success: false,
        errorMessage: 'Failed to initiate payment',
    };
}

/**
 * Redirects the user to the Barion payment gateway.
 */
export function redirectToBarion(gatewayUrl: string): void {
    window.location.href = gatewayUrl;
}
