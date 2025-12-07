import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';

import { VENDURE_BARION_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';
import { BarionService } from './services/barion.service';
import { BarionAdminResolver } from './api/barion-admin.resolver';
import { adminApiExtensions } from './api/api-extensions';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [{ provide: VENDURE_BARION_PLUGIN_OPTIONS, useFactory: () => VendureBarionPlugin.options }, BarionService],
    configuration: config => {
        // Plugin-specific configuration
        // such as custom fields, custom permissions,
        // strategies etc. can be configured here by
        // modifying the `config` object.
        return config;
    },
    compatibility: '^3.0.0',
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [BarionAdminResolver]
    },
})
export class VendureBarionPlugin {
    static options: PluginInitOptions;

    static init(options: PluginInitOptions): Type<VendureBarionPlugin> {
        this.options = options;
        return VendureBarionPlugin;
    }
}
