// Shared helpers for the workshop-ticket password gate.
//
// This is a thin, *shared-password* gate, not per-user auth: everyone who enters the
// correct password gets an identical, deterministic signed cookie. The HMAC signature
// only proves "this cookie was minted by our server after a correct password check" so
// a visitor can't just set an arbitrary `workshop_gate` cookie by hand and skip the
// password. There is no server-side session storage — the whole scheme is stateless.
//
// Uses the Web Crypto API (`crypto.subtle`) rather than Node's `crypto` module because
// this app runs on the Cloudflare adapter, where Node's `crypto` isn't available.

/** Cookie that marks a visitor as having passed the workshop gate. */
export const WORKSHOP_GATE_COOKIE_NAME = "workshop_gate";

/** Route (outside /workshops and /en/workshops) where the PIN form lives. */
export const WORKSHOP_GATE_PATH = "/workshop-gate";

/** 180 days, in seconds — long enough that return visits skip re-entry. */
export const WORKSHOP_GATE_COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

/** Fixed plaintext the cookie value is an HMAC of. Not secret by itself. */
const GATE_TOKEN = "unlocked";

const textEncoder = new TextEncoder();

async function importHmacKey(secret: string): Promise<CryptoKey> {
	return crypto.subtle.importKey(
		"raw",
		textEncoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
}

function toHex(buffer: ArrayBuffer): string {
	return Array.from(new Uint8Array(buffer))
		.map((byte) => byte.toString(16).padStart(2, "0"))
		.join("");
}

/** Computes the expected signed cookie value (hex-encoded HMAC-SHA256) for the given secret. */
export async function computeWorkshopGateCookieValue(secret: string): Promise<string> {
	const key = await importHmacKey(secret);
	const signature = await crypto.subtle.sign("HMAC", key, textEncoder.encode(GATE_TOKEN));
	return toHex(signature);
}

/** Verifies a cookie value against the expected HMAC for the given secret. */
export async function isValidWorkshopGateCookie(
	cookieValue: string | undefined | null,
	secret: string,
): Promise<boolean> {
	if (!cookieValue) return false;
	const expected = await computeWorkshopGateCookieValue(secret);
	return cookieValue === expected;
}

/**
 * Paths protected by the workshop gate: `/workshops`, `/workshops/*`,
 * `/en/workshops`, and `/en/workshops/*`. The gate-entry page itself
 * (WORKSHOP_GATE_PATH) deliberately lives outside this prefix so the
 * middleware's redirect never loops.
 */
export function isWorkshopGatedPath(pathname: string): boolean {
	return (
		pathname === "/workshops" ||
		pathname.startsWith("/workshops/") ||
		pathname === "/en/workshops" ||
		pathname.startsWith("/en/workshops/")
	);
}
