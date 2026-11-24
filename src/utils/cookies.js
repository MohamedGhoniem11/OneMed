import { env } from "../config/env.js";

const baseOptions = () => ({
  httpOnly: true,
  secure: env.authCookieSecure,
  sameSite: env.authCookieSameSite,
  path: "/api/auth",
  ...(env.authCookieDomain ? { domain: env.authCookieDomain } : {}),
});

export function setRefreshCookie(res, token, expiresAt) {
  const options = { ...baseOptions() };
  if (expiresAt) options.expires = new Date(expiresAt);
  res.cookie(env.authCookieName, token, options);
}

export function clearRefreshCookie(res) {
  res.clearCookie(env.authCookieName, baseOptions());
}

export function readRefreshCookie(req) {
  return req.cookies?.[env.authCookieName] || null;
}
