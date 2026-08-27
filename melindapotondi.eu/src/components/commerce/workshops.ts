import { VENDURE_SHOP_API_URL } from "astro:env/client";

export interface WorkshopEventDto {
    id: string;
    startsAt: string;
    endsAt: string;
    location: string;
    capacity: number;
    priceInCents: number | null;
    isPublished: boolean;
    // Shop-API-only fields: real saleable stock, not raw capacity.
    availableSeats: number;
    isSoldOut: boolean;
    workshop: {
        id: string;
        title: string;
        description: string | null;
        defaultPriceInCents: number;
    };
}

/** Single-event lookup result. Includes the auto-provisioned Product/ProductVariant ids
 * needed to add a ticket to an order, which the list query above doesn't request. */
export interface WorkshopEventDetailDto extends WorkshopEventDto {
    productId: string | null;
    productVariantId: string | null;
}

/**
 * Fetches published WorkshopEvents starting in [from, to] from the `workshops` Vendure
 * Channel (never the storefront's default channel) via the `vendure-token` header.
 *
 * This is a read-only, unauthenticated catalog query with no cart/session involvement,
 * so unlike `products.ts`'s functions it deliberately omits `credentials: 'include'` —
 * verified empirically against a live server that the query succeeds without it.
 */
export async function getWorkshopEventsInRange(from: Date, to: Date): Promise<WorkshopEventDto[]> {
    const response = await fetch(VENDURE_SHOP_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "vendure-token": "workshops",
        },
        body: JSON.stringify({
            query: `
                query WorkshopEventsInRange($from: DateTime!, $to: DateTime!) {
                    workshopEventsInRange(from: $from, to: $to) {
                        id
                        startsAt
                        endsAt
                        location
                        capacity
                        priceInCents
                        isPublished
                        availableSeats
                        isSoldOut
                        workshop {
                            id
                            title
                            description
                            defaultPriceInCents
                        }
                    }
                }
            `,
            variables: {
                from: from.toISOString(),
                to: to.toISOString(),
            },
        }),
    });

    const result = await response.json();
    if (result.data?.workshopEventsInRange) {
        return result.data.workshopEventsInRange;
    }
    console.error("getWorkshopEventsInRange failed", result.errors ?? result);
    return [];
}

/**
 * Fetches a single WorkshopEvent by id from the `workshops` Vendure Channel, for the
 * reserve/checkout page. The shop API's `workshopEvent` query already returns null for
 * unpublished events server-side, but callers should still treat a falsy `isPublished`
 * on whatever comes back as "not found" too (belt-and-suspenders).
 *
 * Same read-only-catalog-query reasoning as `getWorkshopEventsInRange` above: no
 * cart/session involved, so `credentials: 'include'` is deliberately omitted.
 */
export async function getWorkshopEvent(id: string): Promise<WorkshopEventDetailDto | null> {
    const response = await fetch(VENDURE_SHOP_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "vendure-token": "workshops",
        },
        body: JSON.stringify({
            query: `
                query WorkshopEvent($id: ID!) {
                    workshopEvent(id: $id) {
                        id
                        startsAt
                        endsAt
                        location
                        capacity
                        priceInCents
                        isPublished
                        availableSeats
                        isSoldOut
                        productId
                        productVariantId
                        workshop {
                            id
                            title
                            description
                            defaultPriceInCents
                        }
                    }
                }
            `,
            variables: { id },
        }),
    });

    const result = await response.json();
    if (result.errors) {
        console.error("getWorkshopEvent failed", result.errors);
        return null;
    }
    return result.data?.workshopEvent ?? null;
}
