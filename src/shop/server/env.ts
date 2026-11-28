import "server-only";

/** Shop-specific server configuration. Secrets come only from environment variables. */
export const shopEnv = {
  isProd: process.env.NODE_ENV === "production",
  /** e.g. ".3dprintmonk.com" to share the customer login between www and shop subdomains. Empty = host-only cookie. */
  cookieDomain: process.env.SHOP_COOKIE_DOMAIN || undefined,
  /** One-time token that unlocks /admin/setup to create the first owner account (only while no admin exists). */
  adminSetupToken: process.env.SHOP_ADMIN_SETUP_TOKEN ?? "",
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? "",
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
    apiBase: process.env.RAZORPAY_API_BASE || "https://api.razorpay.com/v1",
  },
  shiprocket: {
    email: process.env.SHIPROCKET_EMAIL ?? "",
    password: process.env.SHIPROCKET_PASSWORD ?? "",
    pickupLocation: process.env.SHIPROCKET_PICKUP_LOCATION ?? "Primary",
    pickupPincode: process.env.SHIPROCKET_PICKUP_PINCODE ?? "",
    apiBase: process.env.SHIPROCKET_API_BASE || "https://apiv2.shiprocket.in/v1/external",
  },
  delhivery: {
    token: process.env.DELHIVERY_API_TOKEN ?? "",
    apiBase: (process.env.DELHIVERY_API_BASE || "https://track.delhivery.com").replace(/\/$/, ""),
    /** Shared secret Delhivery sends with scan-push webhooks (header or ?token=). */
    webhookSecret: process.env.DELHIVERY_WEBHOOK_SECRET ?? "",
  },
  cronSecret: process.env.CRON_SECRET ?? "",
};

export const shopIntegrations = {
  get razorpay() {
    return Boolean(shopEnv.razorpay.keyId && shopEnv.razorpay.keySecret);
  },
  get razorpayWebhook() {
    return Boolean(shopEnv.razorpay.webhookSecret);
  },
  get delhivery() {
    return Boolean(shopEnv.delhivery.token);
  },
  get shiprocket() {
    return Boolean(shopEnv.shiprocket.email && shopEnv.shiprocket.password);
  },
};
