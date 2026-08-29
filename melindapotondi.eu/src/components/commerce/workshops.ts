import { VENDURE_SHOP_API_URL } from "astro:env/client";

// One scheduled workshop occurrence = one ProductVariant of a "workshop" Product
// (products flagged `requiresShipping: false`). This module queries Vendure's native
// shop API against the DEFAULT channel (no `vendure-token` header), reading each
// variant's scheduling custom fields (startsAt/endsAt/location) and stock level.

export interface WorkshopEventDto {
    /** The ProductVariant id. This is what addItemToOrder / reserve URLs use. */
    id: string;
    productId: string;
    sku: string;
    /** Variant name, conventionally the localized date label set by the admin. */
    variantName: string;
    productName: string;
    productSlug: string;
    description: string | null;
    startsAt: string | null;
    endsAt: string | null;
    location: string | null;
    priceWithTax: number;
    currencyCode: string;
    /** Vendure variant stock level: "IN_STOCK" | "OUT_OF_STOCK" | "LOW_STOCK". */
    stockLevel: string;
}

interface VariantNode {
    id: string;
    name: string;
    sku: string;
    priceWithTax: number;
    currencyCode: string;
    stockLevel: string;
    customFields: {
        startsAt: string | null;
        endsAt: string | null;
        location: string | null;
    };
}

interface ProductNode {
    id: string;
    name: string;
    slug: string;
    description: string;
    variants: VariantNode[];
}

const WORKSHOP_VARIANTS_QUERY = `
    query WorkshopVariants {
        products(options: { filter: { requiresShipping: { eq: false } }, take: 100 }) {
            items {
                id
                name
                slug
                description
                variants {
                    id
                    name
                    sku
                    priceWithTax
                    currencyCode
                    stockLevel
                    customFields {
                        startsAt
                        endsAt
                        location
                    }
                }
            }
        }
    }
`;

/**
 * Fetches all workshop variants (across all workshop Products) from the DEFAULT channel
 * shop API and flattens them into a single list, each entry carrying its owning Product's
 * name/slug/description. `products` here is filtered by the `requiresShipping: false`
 * custom field, i.e. exactly the ticket/virtual products.
 *
 * Read-only catalog query with no cart/session involvement, so like `products.ts` it
 * sends `credentials` only where an active order is actually needed; catalog listing does
 * not need one.
 */
export async function getWorkshopVariants(): Promise<WorkshopEventDto[]> {
    const response = await fetch(VENDURE_SHOP_API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: WORKSHOP_VARIANTS_QUERY }),
    });

    const result = await response.json();
    if (result.errors) {
        console.error("getWorkshopVariants failed", result.errors);
        return [];
    }

    const products: ProductNode[] = result.data?.products?.items ?? [];
    const variants: WorkshopEventDto[] = [];
    for (const product of products) {
        for (const variant of product.variants) {
            variants.push({
                id: variant.id,
                productId: product.id,
                sku: variant.sku,
                variantName: variant.name,
                productName: product.name,
                productSlug: product.slug,
                description: product.description || null,
                startsAt: variant.customFields?.startsAt ?? null,
                endsAt: variant.customFields?.endsAt ?? null,
                location: variant.customFields?.location ?? null,
                priceWithTax: variant.priceWithTax,
                currencyCode: variant.currencyCode,
                stockLevel: variant.stockLevel,
            });
        }
    }
    return variants;
}

function isSoldOut(stockLevel: string): boolean {
    return stockLevel === "OUT_OF_STOCK";
}

/**
 * Returns workshop variants whose `startsAt` falls within [from, to], ordered by start,
 * excluding sold-out and un-scheduled (null startsAt) variants.
 */
export async function getWorkshopEventsInRange(from: Date, to: Date): Promise<WorkshopEventDto[]> {
    const variants = await getWorkshopVariants();
    return variants
        .filter(
            v =>
                v.startsAt != null &&
                !isSoldOut(v.stockLevel) &&
                new Date(v.startsAt) >= from &&
                new Date(v.startsAt) <= to,
        )
        .sort((a, b) => (a.startsAt! < b.startsAt! ? -1 : a.startsAt! > b.startsAt! ? 1 : 0));
}

/**
 * Finds a single workshop variant by its ProductVariant id, for the reserve/checkout page.
 * Returns null when the variant id is unknown, not a workshop variant, or sold out.
 */
export async function getWorkshopEvent(id: string): Promise<WorkshopEventDto | null> {
    const variants = await getWorkshopVariants();
    return variants.find(v => v.id === id) ?? null;
}