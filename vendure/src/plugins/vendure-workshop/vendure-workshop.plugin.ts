import { LanguageCode, PluginCommonModule, VendurePlugin } from '@vendure/core';

import { conditionalShippingOrderProcess } from './config/conditional-shipping-order-process';

/**
 * @description
 * Slim "ticketing" plugin: workshops are modelled as ordinary Vendure `Product`s
 * (one per workshop type) and each scheduled occurrence as a `ProductVariant` (one per
 * date). This plugin no longer introduces any custom entities, admin/shop resolvers or
 * dashboard UI - it only contributes the two things that Vendure cannot express natively:
 *
 * 1. A `requiresShipping` custom field on `Product` so ticket/digital products can be
 *    checked out without a shipping method, plus a conditional `OrderProcess` that only
 *    enforces "order must have a shipping method before payment" when the order actually
 *    contains a product that needs it.
 *
 * 2. `ProductVariant` custom fields (`startsAt`, `endsAt`, `location`) that carry the
 *    event-specific scheduling data which admin staff fill in alongside the standard
 *    variant fields (name = date, SKU per occurrence, `stockOnHand` = capacity,
 *    `trackInventory` = true).
 */
@VendurePlugin({
    imports: [PluginCommonModule],
    configuration: config => {
        // Marks whether a Product needs a shipping method before its Order can proceed
        // to payment. Defaults to `true` so any pre-existing (or future physical) Product
        // that never explicitly sets this field keeps requiring shipping, matching
        // Vendure's unconditional default behaviour. Workshop ticket Products are
        // provisioned with this set to `false` (see the seed/README admin workflow).
        config.customFields.Product = (config.customFields.Product ?? []).concat({
            name: 'requiresShipping',
            type: 'boolean',
            defaultValue: true,
            label: [{ languageCode: LanguageCode.en, value: 'Requires shipping' }],
            description: [
                {
                    languageCode: LanguageCode.en,
                    value: 'Whether an Order containing this product must have a shipping method assigned before it can proceed to payment. Disable for virtual/ticket products such as workshop tickets.',
                },
            ],
        });

        // Event-specific scheduling data, set per occurrence (variant) by admin staff.
        config.customFields.ProductVariant = (config.customFields.ProductVariant ?? []).concat(
            {
                name: 'startsAt',
                type: 'datetime',
                nullable: true,
                label: [{ languageCode: LanguageCode.en, value: 'Starts at' }],
            },
            {
                name: 'endsAt',
                type: 'datetime',
                nullable: true,
                label: [{ languageCode: LanguageCode.en, value: 'Ends at' }],
            },
            {
                name: 'location',
                type: 'string',
                nullable: true,
                label: [{ languageCode: LanguageCode.en, value: 'Location' }],
            },
        );

        // This plugin is the sole owner of `orderOptions.process`: it replaces Vendure's
        // unconditional "Order must have a shipping method before payment" guard with a
        // conditional one (see `conditionalShippingOrderProcess`) that only enforces it
        // when the Order actually contains a product that needs shipping.
        config.orderOptions.process = [conditionalShippingOrderProcess];

        return config;
    },
    compatibility: '^3.0.0',
})
export class VendureWorkshopPlugin {
    static init(): typeof VendureWorkshopPlugin {
        return VendureWorkshopPlugin;
    }
}