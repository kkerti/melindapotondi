import { unique } from '@vendure/common/lib/unique';
import {
    configureDefaultOrderProcess,
    Injector,
    OrderProcess,
    OrderState,
    Product,
    ProductVariant,
    RequestContext,
    TransactionalConnection,
} from '@vendure/core';

/**
 * @description
 * The exact translation key Vendure's own default {@link OrderProcess} (see
 * `configureDefaultOrderProcess` in `@vendure/core`, `default-order-process.js`) returns
 * when a transition to `ArrangingPayment` is blocked because the Order has no shipping
 * method assigned. Reused verbatim here so this plugin's own conditional shipping check
 * produces byte-for-byte the same (already-registered, already-translated) error message
 * as the unconditional guard it replaces.
 */
const CANNOT_TRANSITION_WITHOUT_SHIPPING_METHOD_MESSAGE =
    'message.cannot-transition-to-payment-without-shipping-method';

/**
 * The underlying default process, with its own unconditional shipping-method requirement
 * switched off - this plugin re-implements that one check conditionally below, and
 * delegates every other built-in guard (empty order, missing customer, insufficient
 * stock, payment coverage, fulfillment states, etc.), the full `transitions` graph, and
 * the `onTransitionEnd` side effects (stock allocation, OrderPlacedEvent, history entries)
 * unchanged.
 */
const delegateOrderProcess = configureDefaultOrderProcess({
    arrangingPaymentRequiresShipping: false,
});

let connection: TransactionalConnection;

/**
 * @description
 * A drop-in replacement for Vendure's `defaultOrderProcess` that makes the "Order must
 * have a shipping method before payment" guard conditional on what the Order actually
 * contains, instead of unconditionally requiring it for every Order.
 *
 * Ticket-only Orders (workshop products) have nothing to ship, so the unconditional
 * default guard would block every ticket-only checkout. Rather than disabling the guard
 * globally - which would remove real protection for any future physical products this
 * shop sells - this process only enforces it when the Order contains at least one line
 * for a Product whose `requiresShipping` customField is not explicitly `false`. Products
 * that predate this customField (or otherwise have it unset) default to "needs shipping",
 * matching the customField's own `defaultValue: true` registered in
 * `vendure-workshop.plugin.ts`.
 *
 * This is registered as the SOLE entry in `orderOptions.process` (see
 * `vendure-workshop.plugin.ts`'s `configuration` hook), so it spreads `delegateOrderProcess`
 * to fully stand in for the default process (transitions, onTransitionEnd, etc.) rather than
 * merely contributing an additional check.
 */
export const conditionalShippingOrderProcess: OrderProcess<OrderState> = {
    ...delegateOrderProcess,
    async init(injector: Injector) {
        connection = injector.get(TransactionalConnection);
        await delegateOrderProcess.init?.(injector);
    },
    async onTransitionStart(fromState, toState, data) {
        if (delegateOrderProcess.onTransitionStart) {
            const delegateResult = await delegateOrderProcess.onTransitionStart(fromState, toState, data);
            if (delegateResult === false || typeof delegateResult === 'string') {
                return delegateResult;
            }
        }

        if (toState !== 'ArrangingPayment') {
            return;
        }

        const { ctx, order } = data;
        if (order.shippingLines && order.shippingLines.length > 0) {
            // Already has a shipping method - nothing further to check.
            return;
        }

        if (await orderContainsAProductRequiringShipping(ctx, order.lines.map(line => line.productVariant.id))) {
            return CANNOT_TRANSITION_WITHOUT_SHIPPING_METHOD_MESSAGE;
        }
    },
};

/**
 * @description
 * Determines whether any of the given ProductVariant ids belong to a Product that needs
 * shipping (i.e. `customFields.requiresShipping !== false`).
 *
 * `order.lines[].productVariant.product` is NOT among the relations
 * `OrderService.transitionToState` loads before invoking `onTransitionStart` - it loads
 * `lines`, `lines.productVariant`, `lines.productVariant.productVariantPrices`,
 * `shippingLines`, `surcharges` and `customer`, but never `lines.productVariant.product` -
 * so the Product (and its customFields) is fetched here directly via a repository query,
 * mirroring how `configureDefaultOrderProcess`'s own `checkAllVariantsExist` guard queries
 * `ProductVariant` joined to `product` for its own purposes.
 */
async function orderContainsAProductRequiringShipping(
    ctx: RequestContext,
    productVariantIds: Array<ProductVariant['id']>,
): Promise<boolean> {
    const variantIds = unique(productVariantIds);
    if (variantIds.length === 0) {
        return false;
    }
    const variants = await connection
        .getRepository(ctx, ProductVariant)
        .createQueryBuilder('variant')
        .leftJoinAndSelect('variant.product', 'product')
        .where('variant.id IN (:...variantIds)', { variantIds })
        .getMany();

    return variants.some(variant => productRequiresShipping(variant.product));
}

/**
 * @description
 * Reads the `requiresShipping` Product customField registered by this plugin
 * (`vendure-workshop.plugin.ts`'s `configuration` hook). Cast locally rather than via
 * global `CustomProductFields` declaration-merging, since this plugin does not augment
 * that interface anywhere else in the codebase - keeping the type dependency contained to
 * this file. Defaults to `true` (needs shipping) for any Product where the field is
 * missing/unset, matching the customField's own `defaultValue: true`.
 */
function productRequiresShipping(product: Product | null | undefined): boolean {
    const customFields = product?.customFields as { requiresShipping?: boolean } | undefined;
    return customFields?.requiresShipping !== false;
}
