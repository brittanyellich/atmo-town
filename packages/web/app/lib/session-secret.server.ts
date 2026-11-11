const configuredSecret = process.env.SESSION_SECRET;
if (!configuredSecret && process.env.NODE_ENV === "production") {
  throw new Error("SESSION_SECRET must be set in production");
}

export const sessionSecret = configuredSecret ?? "atmo-town-dev-only-secret";
