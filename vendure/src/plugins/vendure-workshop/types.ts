import { ID } from '@vendure/common/lib/shared-types';

/**
 * @description
 * The plugin can be configured using the following options:
 */
export interface PluginInitOptions {
    /**
     * @description
     * Whether to send email notifications on booking changes.
     * @default false
     */
    enableEmailNotifications?: boolean;
}

// ============ Input Types ============

export interface CreateWorkshopEventInput {
    title: string;
    description?: string | null;
    location: string;
    startsAt: Date;
    endsAt: Date;
    maxParticipants: number;
    bookingPassword: string;
    isPublished?: boolean;
}

export interface UpdateWorkshopEventInput {
    id: ID;
    title?: string;
    description?: string | null;
    location?: string;
    startsAt?: Date;
    endsAt?: Date;
    maxParticipants?: number;
    bookingPassword?: string;
    isPublished?: boolean;
}

export interface ReserveWorkshopSpotInput {
    eventId: ID;
    nickname: string;
    password: string;
    email?: string | null;
}

// ============ Error Codes ============

/**
 * @description
 * Error codes for the workshop plugin following Vendure's error pattern.
 */
export enum WorkshopErrorCode {
    EVENT_NOT_FOUND = 'EVENT_NOT_FOUND',
    EVENT_FULL = 'EVENT_FULL',
    INVALID_PASSWORD = 'INVALID_PASSWORD',
    EVENT_NOT_PUBLISHED = 'EVENT_NOT_PUBLISHED',
    BOOKING_NOT_FOUND = 'BOOKING_NOT_FOUND',
    DUPLICATE_NICKNAME = 'DUPLICATE_NICKNAME',
}

// ============ Error Result Types ============

export interface WorkshopErrorResult {
    errorCode: WorkshopErrorCode;
    message: string;
}

export interface EventNotFoundError extends WorkshopErrorResult {
    errorCode: WorkshopErrorCode.EVENT_NOT_FOUND;
}

export interface EventFullError extends WorkshopErrorResult {
    errorCode: WorkshopErrorCode.EVENT_FULL;
}

export interface InvalidPasswordError extends WorkshopErrorResult {
    errorCode: WorkshopErrorCode.INVALID_PASSWORD;
}

export interface EventNotPublishedError extends WorkshopErrorResult {
    errorCode: WorkshopErrorCode.EVENT_NOT_PUBLISHED;
}

export interface DuplicateNicknameError extends WorkshopErrorResult {
    errorCode: WorkshopErrorCode.DUPLICATE_NICKNAME;
}

// ============ Result Union Types ============

export type ReserveSpotResult =
    | { __typename: 'EventBooking'; id: ID; nickname: string }
    | EventNotFoundError
    | EventFullError
    | InvalidPasswordError
    | EventNotPublishedError
    | DuplicateNicknameError;
