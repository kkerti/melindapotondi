import { OnApplicationBootstrap, OnApplicationShutdown } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Injector, LanguageCode, PluginCommonModule, Type, VendurePlugin } from '@vendure/core';

import { VENDURE_WORKSHOP_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';
import { Workshop } from './entities/workshop.entity';
import { WorkshopEvent } from './entities/workshop-event.entity';
import { WorkshopService } from './services/workshop.service';
import { WorkshopEventService } from './services/workshop-event.service';
import { adminApiExtensions, shopApiExtensions } from './api/api-extensions';
import { WorkshopAdminResolver } from './api/workshop-admin.resolver';
import { WorkshopShopResolver } from './api/workshop-shop.resolver';
import { DefaultWorkshopSkuStrategy } from './strategies/workshop-sku.strategy';
import { conditionalShippingOrderProcess } from './config/conditional-shipping-order-process';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [
        {
            provide: VENDURE_WORKSHOP_PLUGIN_OPTIONS,
            useFactory: () => VendureWorkshopPlugin.options,
        },
        WorkshopService,
        WorkshopEventService,
    ],
    configuration: config => {
        // Marks whether a Product needs a shipping method before its Order can proceed
        // to payment. Defaults to `true` so any pre-existing (or future physical) Product
        // that never explicitly sets this field keeps requiring shipping, matching
        // Vendure's unconditional default behaviour. Workshop ticket Products are
        // provisioned with this set to `false` - see `provisionProductForEvent` in
        // `services/workshop-event.service.ts`.
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

        // This plugin is the sole owner of `orderOptions.process`: it replaces Vendure's
        // unconditional "Order must have a shipping method before payment" guard with a
        // conditional one (see `conditionalShippingOrderProcess`) that only enforces it
        // when the Order actually contains a product that needs shipping.
        config.orderOptions.process = [conditionalShippingOrderProcess];

        return config;
    },
    compatibility: '^3.0.0',
    entities: [Workshop, WorkshopEvent],
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [WorkshopAdminResolver],
    },
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [WorkshopShopResolver],
    },
})
export class VendureWorkshopPlugin implements OnApplicationBootstrap, OnApplicationShutdown {
    static options: PluginInitOptions;

    constructor(private moduleRef: ModuleRef) {}

    static init(options: PluginInitOptions = {}): Type<VendureWorkshopPlugin> {
        this.options = { skuStrategy: new DefaultWorkshopSkuStrategy(), ...options };
        return VendureWorkshopPlugin;
    }

    async onApplicationBootstrap() {
        if (VendureWorkshopPlugin.options.skuStrategy?.init) {
            await VendureWorkshopPlugin.options.skuStrategy.init(new Injector(this.moduleRef));
        }
    }

    async onApplicationShutdown() {
        if (VendureWorkshopPlugin.options.skuStrategy?.destroy) {
            await VendureWorkshopPlugin.options.skuStrategy.destroy();
        }
    }
}
