export const VENDURE_WORKSHOP_PLUGIN_OPTIONS = Symbol('VENDURE_WORKSHOP_PLUGIN_OPTIONS');
export const loggerCtx = 'VendureWorkshopPlugin';

/**
 * @description
 * Token of the dedicated Vendure Channel that workshop-ticket Products/ProductVariants
 * are provisioned into. This Channel is created out-of-band by
 * `scripts/setup-workshops-channel.ts` and is expected to already exist.
 */
export const WORKSHOPS_CHANNEL_TOKEN = 'workshops';
