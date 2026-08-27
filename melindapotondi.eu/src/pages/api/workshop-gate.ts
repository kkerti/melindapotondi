import type { APIRoute } from "astro";
import { WORKSHOP_GATE_COOKIE_SECRET, WORKSHOP_GATE_PASSWORD } from "astro:env/server";
import {
	WORKSHOP_GATE_COOKIE_MAX_AGE,
	WORKSHOP_GATE_COOKIE_NAME,
	computeWorkshopGateCookieValue,
} from "@lib/workshop-gate";

export const prerender = false;

// Verifies the shared workshop-gate password and, on success, sets the signed access
// cookie server-side. A simple `===` check is fine here: this is a thin, shared-password
// gate (not per-user auth), so there's no per-user secret to protect against timing
// attacks on — everyone who knows the password gets the same cookie value anyway.
export const POST: APIRoute = async ({ request, cookies }) => {
	let password: unknown;
	try {
		const body = await request.json();
		password = (body as { password?: unknown }).password;
	} catch {
		return Response.json({ ok: false, error: "Invalid request body." }, { status: 400 });
	}

	if (typeof password !== "string" || password !== WORKSHOP_GATE_PASSWORD) {
		return Response.json({ ok: false, error: "Incorrect password." }, { status: 401 });
	}

	const cookieValue = await computeWorkshopGateCookieValue(WORKSHOP_GATE_COOKIE_SECRET);
	cookies.set(WORKSHOP_GATE_COOKIE_NAME, cookieValue, {
		httpOnly: true,
		secure: import.meta.env.PROD,
		sameSite: "lax",
		// Must be site-wide: this endpoint lives at /api/workshop-gate but the cookie
		// needs to be sent for requests under /workshops and /en/workshops too.
		path: "/",
		maxAge: WORKSHOP_GATE_COOKIE_MAX_AGE,
	});

	return Response.json({ ok: true });
};
