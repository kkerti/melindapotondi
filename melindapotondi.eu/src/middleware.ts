import { defineMiddleware } from "astro:middleware";
import { WORKSHOP_GATE_COOKIE_SECRET, WORKSHOP_GATE_ENABLED } from "astro:env/server";
import {
	WORKSHOP_GATE_COOKIE_NAME,
	WORKSHOP_GATE_PATH,
	isValidWorkshopGateCookie,
	isWorkshopGatedPath,
} from "@lib/workshop-gate";

// Site-wide password gate for the upcoming workshop-ticket-purchase pages.
//
// WORKSHOP_GATE_ENABLED=false fully bypasses this for every request, so the gate can be
// switched off (private group -> fully public) without a code change. When enabled, only
// requests under /workshops or /en/workshops are checked; everything else on the site
// (shop, checkout, homepage, the gate page itself) is untouched.
export const onRequest = defineMiddleware(async (context, next) => {
	if (!WORKSHOP_GATE_ENABLED) {
		return next();
	}

	const { pathname } = context.url;
	if (!isWorkshopGatedPath(pathname)) {
		return next();
	}

	const cookieValue = context.cookies.get(WORKSHOP_GATE_COOKIE_NAME)?.value;
	const hasValidCookie = await isValidWorkshopGateCookie(cookieValue, WORKSHOP_GATE_COOKIE_SECRET);
	if (hasValidCookie) {
		return next();
	}

	const originalPath = `${pathname}${context.url.search}`;
	const gateUrl = `${WORKSHOP_GATE_PATH}?redirect=${encodeURIComponent(originalPath)}`;
	return context.redirect(gateUrl, 302);
});
