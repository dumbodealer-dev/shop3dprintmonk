import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/headers", () => ({ cookies: vi.fn(), headers: vi.fn() }));
process.env.RAZORPAY_KEY_SECRET = "test_secret";
process.env.RAZORPAY_WEBHOOK_SECRET = "whsec_test";

const { hashPassword, verifyPassword, DUMMY_HASH, safeEqual } = await import("./auth/crypto");
const rzp = await import("./payments/razorpay");
const { amountInWords } = await import("./invoice");
const { deliveryEstimate, trackingUrl } = await import("./shipping");
const { defaultSettings } = await import("@/shop/lib/settings-schema");
const { can } = await import("./auth/admin");

describe("password hashing", () => {
  it("hashes with scrypt and verifies", async () => {
    const h = await hashPassword("s3cret-pass");
    expect(h.startsWith("scrypt$16384$8$1$")).toBe(true);
    expect(await verifyPassword("s3cret-pass", h)).toBe(true);
    expect(await verifyPassword("wrong", h)).toBe(false);
    expect(await hashPassword("s3cret-pass")).not.toBe(h); // salted
  });
  it("dummy hash never matches and malformed hashes fail closed", async () => {
    expect(await verifyPassword("", DUMMY_HASH)).toBe(false);
    expect(await verifyPassword("x", "plain-text")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
});

describe("Razorpay verification", () => {
  it("accepts only the correct checkout signature", () => {
    const sig = createHmac("sha256", "test_secret").update("order_1|pay_1").digest("hex");
    expect(rzp.verifyCheckoutSignature("order_1", "pay_1", sig)).toBe(true);
    expect(rzp.verifyCheckoutSignature("order_1", "pay_2", sig)).toBe(false);
    expect(rzp.verifyCheckoutSignature("order_1", "pay_1", "")).toBe(false);
  });
  it("verifies webhook bodies byte-for-byte", () => {
    const body = JSON.stringify({ event: "payment.captured" });
    const sig = createHmac("sha256", "whsec_test").update(body).digest("hex");
    expect(rzp.verifyWebhookSignature(body, sig)).toBe(true);
    expect(rzp.verifyWebhookSignature(body + " ", sig)).toBe(false);
    expect(rzp.verifyWebhookSignature(body, null)).toBe(false);
  });
});

describe("invoice", () => {
  it("writes amounts in the Indian numbering system", () => {
    expect(amountInWords(1299)).toBe("Rupees One Thousand Two Hundred Ninety Nine Only");
    expect(amountInWords(125000.5)).toBe("Rupees One Lakh Twenty Five Thousand and Fifty Paise Only");
  });
});

describe("shipping", () => {
  it("estimates business days, skipping Sundays", () => {
    const s = defaultSettings();
    const m = s.shipping.methods[0]; // 4–7 days + 1 processing
    const e = deliveryEstimate(m, s, { from: new Date("2026-11-27T10:00:00") }); // Friday
    expect(e.from.getDay()).not.toBe(0);
    expect(e.to > e.from).toBe(true);
    const local = deliveryEstimate(m, s, { local: true, from: new Date("2026-11-27T10:00:00") });
    expect(local.to <= e.to).toBe(true);
  });
  it("builds courier tracking links", () => {
    expect(trackingUrl("Delhivery", "123")).toContain("delhivery.com");
    expect(trackingUrl("Unknown", "123")).toBeNull();
  });
});

describe("admin roles", () => {
  it("restricts permissions by role", () => {
    expect(can("owner", "team")).toBe(true);
    expect(can("manager", "settings")).toBe(false);
    expect(can("manager", "refunds")).toBe(true);
    expect(can("staff", "refunds")).toBe(false);
    expect(can("staff", "orders")).toBe(true);
  });
});
