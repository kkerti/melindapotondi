/**
 * @description
 * The plugin can be configured using the following options:
 */
export interface PluginInitOptions {
    /**
     * @description
     * The secret API key (POSKey) for your Barion shop.
     */
    posKey: string;
    /**
     * @description
     * The email address of the shop owner (payee).
     */
    payeeEmail: string;
    /**
     * @description
     * The URL where Barion will send payment status callbacks (IPN).
     * Must be accessible from the internet.
     */
    callbackUrl: string;
    /**
     * @description
     * The URL where users are redirected after completing payment.
     */
    redirectUrl: string;
    /**
     * @description
     * Whether to use Barion sandbox environment for testing.
     * @default false
     */
    sandbox?: boolean;
}

// ============================================================
// Barion Payment API Types
// Based on Barion API v2 documentation
// ============================================================

// === Enums ===

export enum PaymentType {
    IMMEDIATE = 'Immediate',
    RESERVATION = 'Reservation',
    DELAYED_CAPTURE = 'DelayedCapture',
}

export enum Currency {
    CZK = 'CZK',
    EUR = 'EUR',
    HUF = 'HUF',
    USD = 'USD',
}

export enum Locale {
    CZECH = 'cs-CZ',
    GERMAN = 'de-DE',
    ENGLISH = 'en-US',
    SPANISH = 'es-ES',
    FRENCH = 'fr-FR',
    HUNGARIAN = 'hu-HU',
    SLOVAK = 'sk-SK',
    SLOVENIAN = 'sl-SI',
}

export enum PaymentStatus {
    PREPARED = 'Prepared',
    STARTED = 'Started',
    IN_PROGRESS = 'InProgress',
    WAITING = 'Waiting',
    RESERVED = 'Reserved',
    AUTHORIZED = 'Authorized',
    CANCELED = 'Canceled',
    SUCCEEDED = 'Succeeded',
    FAILED = 'Failed',
    PARTIALLY_SUCCEEDED = 'PartiallySucceeded',
    EXPIRED = 'Expired',
}

export enum RecurrenceResult {
    NONE = 'None',
    SUCCESSFUL = 'Successful',
    FAILED = 'Failed',
    NOT_FOUND = 'NotFound',
    THREE_DS_AUTHENTICATION_REQUIRED = 'ThreeDSAuthenticationRequired',
}

export enum RecurrenceType {
    ONE_CLICK_PAYMENT = 'OneClickPayment',
    RECURRING_PAYMENT = 'RecurringPayment',
    MERCHANT_INITIATED_PAYMENT = 'MerchantInitiatedPayment',
}

export enum ChallengePreference {
    NO_PREFERENCE = 'NoPreference',
    CHALLENGE_REQUIRED = 'ChallengeRequired',
    NO_CHALLENGE_NEEDED = 'NoChallengeNeeded',
    CHALLENGE_MANDATED = 'ChallengeMandated',
}

// === Basic Types ===

export type TimeSpan = string; // Format: "d.hh:mm:ss"
export type Guid = string;

// === Complex Interfaces ===

export interface ShippingAddress {
    country: string;
    region?: string;
    city: string;
    zip: string;
    street: string;
    street2?: string;
    street3?: string;
    fullName: string;
}

export interface BillingAddress {
    country: string;
    region?: string;
    city: string;
    zip: string;
    street: string;
    street2?: string;
    street3?: string;
    fullName: string;
}

export interface PayerAccountInformation {
    accountId?: string;
    accountCreated?: Date;
    accountLastChanged?: Date;
    accountChangeIndicator?: string;
    passwordLastChanged?: Date;
    passwordChangeIndicator?: string;
    purchasesInTheLastSixMonths?: number;
    shippingAddressFirstUsed?: Date;
    shippingAddressUsageIndicator?: string;
    shippingNameMatchesAccountName?: boolean;
    suspiciousActivityIndicator?: string;
    paymentMethodFirstUsed?: Date;
    paymentMethodIndicator?: string;
    transactionActivityDay?: number;
    transactionActivityYear?: number;
    paymentAccountAge?: string;
    paymentAccountAgeIndicator?: string;
}

export interface PurchaseInformation {
    deliveryTimeFrame?: string;
    deliveryEmailAddress?: string;
    preOrderDate?: Date;
    preOrderPurchaseIndicator?: string;
    reOrderItemsIndicator?: string;
    shippingMethod?: string;
    giftCardAmount?: number;
    giftCardCount?: number;
    giftCardCurrency?: string;
}

export interface PaymentTransaction {
    posTransactionId: string;
    payee: string;
    total: number;
    comment?: string;
    payeeTransactions?: PayeeTransaction[];
    items?: Item[];
}

export interface PayeeTransaction {
    posTransactionId: string;
    payee: string;
    total: number;
    comment?: string;
}

export interface Item {
    name: string;
    description?: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    itemTotal: number;
    sku?: string;
}

export interface ProcessedTransaction {
    posTransactionId: string;
    transactionId: string;
    status: string;
    transactionType: string;
    currency: Currency;
    total: number;
    payee?: string;
    comment?: string;
    transactionTime?: Date;
    relatedTransactionId?: string;
}

// === Main Request Interface ===

export interface BarionPaymentStartRequest {
    // Required properties
    POSKey: Guid;
    PaymentType: PaymentType;
    GuestCheckOut: boolean;
    FundingSources: string[];
    PaymentRequestId: string;
    RedirectUrl: string;
    CallbackUrl: string;
    Transactions: PaymentTransaction[];
    Locale: Locale;
    Currency: Currency;

    // Conditional required properties
    ReservationPeriod?: TimeSpan; // Required if PaymentType is "Reservation"
    DelayedCapturePeriod?: TimeSpan; // Required if PaymentType is "DelayedCapture"
    RecurrenceId?: string; // Required when executing token payments
    RecurrenceType?: RecurrenceType; // Required for 3DS when executing token payments
    TraceId?: string; // Required for 3DS when executing token payments

    // 3DS Required properties
    PayerHint?: string; // Required for 3DS
    CardHolderNameHint?: string; // Required for 3DS
    ShippingAddress?: ShippingAddress; // Required for 3DS
    PayerPhoneNumber?: string; // Required for 3DS
    PayerWorkPhoneNumber?: string; // Required for 3DS
    PayerHomeNumber?: string; // Required for 3DS
    BillingAddress?: BillingAddress; // Required for 3DS
    PayerAccountInformation?: PayerAccountInformation; // Required for 3DS
    PurchaseInformation?: PurchaseInformation; // Required for 3DS
    ChallengePreference?: ChallengePreference; // Required for 3DS

    // Optional properties
    PaymentWindow?: TimeSpan;
    InitiateRecurrence?: boolean;
    OrderNumber?: string;
}

// === Main Response Interface ===

export interface BarionPaymentStartResponse {
    PaymentId: Guid;
    PaymentRequestId: string;
    Status: PaymentStatus;
    QRUrl: string;
    RecurrenceResult: RecurrenceResult;
    Transactions: ProcessedTransaction[];
    GatewayUrl: string;
    CallbackUrl: string;
    RedirectUrl: string;
    ThreeDSAuthClientData?: string;
    TraceId?: string;
}

// === Payment State Response ===

export interface BarionPaymentStateResponse {
    PaymentId: Guid;
    PaymentRequestId: string;
    POSId: Guid;
    POSName: string;
    POSOwnerEmail: string;
    Status: PaymentStatus;
    PaymentType: PaymentType;
    FundingSource?: string;
    FundingSourceType?: string;
    AllowedFundingSources: string[];
    GuestCheckout: boolean;
    CreatedAt: string;
    StartedAt?: string;
    CompletedAt?: string;
    ValidUntil: string;
    Total: number;
    Currency: Currency;
    Transactions: ProcessedTransaction[];
    RecurrenceResult?: RecurrenceResult;
    SuggestedLocale?: Locale;
    FraudRiskScore?: number;
    RedirectUrl: string;
    CallbackUrl: string;
}

// === Error Response Interface ===

export interface BarionErrorResponse {
    Errors: BarionError[];
}

export interface BarionError {
    ErrorCode: string;
    Title: string;
    Description: string;
    HappenedAt: Date;
    AuthData?: string;
}

// === Utility Types ===

export type BarionApiResponse<T> = T | BarionErrorResponse;

// Type guards for response checking
export function isBarionError(response: unknown): response is BarionErrorResponse {
    return (
        typeof response === 'object' &&
        response !== null &&
        'Errors' in response &&
        Array.isArray((response as BarionErrorResponse).Errors)
    );
}

export function isPaymentStartResponse(response: unknown): response is BarionPaymentStartResponse {
    return (
        typeof response === 'object' &&
        response !== null &&
        'PaymentId' in response &&
        typeof (response as BarionPaymentStartResponse).PaymentId === 'string' &&
        !isBarionError(response)
    );
}

export function isPaymentStateResponse(response: unknown): response is BarionPaymentStateResponse {
    return (
        typeof response === 'object' &&
        response !== null &&
        'PaymentId' in response &&
        'Status' in response &&
        'Total' in response &&
        !isBarionError(response)
    );
}
