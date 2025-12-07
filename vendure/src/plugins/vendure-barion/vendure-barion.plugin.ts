import { PluginCommonModule, Type, VendurePlugin } from '@vendure/core';

import { VENDURE_BARION_PLUGIN_OPTIONS } from './constants';
import { PluginInitOptions } from './types';
import { BarionService } from './services/barion.service';
import { BarionAdminResolver } from './api/barion-admin.resolver';
import { BarionShopResolver } from './api/barion-shop.resolver';
import { adminApiExtensions, shopApiExtensions } from './api/api-extensions';
import { barionPaymentHandler } from './barion.handler';
import { BarionCallbackController } from './api/barion-callback.controller';

@VendurePlugin({
    imports: [PluginCommonModule],
    providers: [{ provide: VENDURE_BARION_PLUGIN_OPTIONS, useFactory: () => VendureBarionPlugin.options }, BarionService],
    configuration: config => {
        // Register the Barion payment handler
        config.paymentOptions.paymentMethodHandlers.push(barionPaymentHandler);
        return config;
    },
    controllers: [BarionCallbackController],
    compatibility: '^3.0.0',
    adminApiExtensions: {
        schema: adminApiExtensions,
        resolvers: [BarionAdminResolver],
    },
    shopApiExtensions: {
        schema: shopApiExtensions,
        resolvers: [BarionShopResolver],
    },
})
export class VendureBarionPlugin {
    static options: PluginInitOptions;

    static init(options: PluginInitOptions): Type<VendureBarionPlugin> {
        this.options = options;
        return VendureBarionPlugin;
    }
}
