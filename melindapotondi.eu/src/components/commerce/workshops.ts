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
