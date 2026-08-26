import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';

import { VENDURE_WORKSHOP_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';
import { Workshop } from './entities/workshop.entity';
import { WorkshopEvent } from './entities/workshop-event.entity';
import { WorkshopService } from './services/workshop.service';
import { WorkshopEventService } from './services/workshop-event.service';
import { adminApiExtensions, shopApiExtensions } from './api/api-extensions';
import { WorkshopAdminResolver } from './api/workshop-admin.resolver';
import { WorkshopShopResolver } from './api/workshop-shop.resolver';

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
        // Plugin-specific configuration
        // such as custom fields, custom permissions,
        // strategies etc. can be configured here by
        // modifying the `config` object.
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
export class VendureWorkshopPlugin {
    static options: PluginInitOptions;

    static init(options: PluginInitOptions = {}): Type<VendureWorkshopPlugin> {
        this.options = options;
        return VendureWorkshopPlugin;
    }
}
