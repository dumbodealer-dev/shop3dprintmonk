import { describe, expect, it } from "vitest";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://abc.supabase.co";
const { parseTracking, mapDelhiveryStatus, istToIso } = await import("./delhivery");
const { isHttpsUrl, isStorageUrl, optionalHttpsUrl } = await import("@/shop/lib/url");

const sample = {
  ShipmentData: [
    {
      Shipment: {
        AWB: "1234567890123",
        Origin: "Delhi_Okhla_PC (Delhi)",
        Destination: "Mumbai_Andheri (Maharashtra)",
        ExpectedDeliveryDate: "2026-12-02T23:59:59",
        Status: { Status: "In Transit", StatusType: "UD", StatusLocation: "Bhiwandi_Hub (Maharashtra)", StatusDateTime: "2026-11-29T08:10:00.000", Instructions: "Shipment Received at Facility" },
        Scans: [
          { ScanDetail: { Scan: "In Transit", ScanDateTime: "2026-11-29T08:10:00.000", ScannedLocation: "Bhiwandi_Hub (Maharashtra)", Instructions: "Shipment Received at Facility", ScanType: "UD" } },
          { ScanDetail: { Scan: "Manifested", ScanDateTime: "2026-11-27T18:00:00.000", ScannedLocation: "Delhi_Okhla_PC (Delhi)", Instructions: "Consignment Manifested", ScanType: "UD" } },
        ],
      },
    },
  ],
};

describe("Delhivery tracking parser", () => {
  it("parses status, location, ETA and orders scans oldest → newest", () => {
    const [r] = parseTracking(sample);
    expect(r.awb).toBe("1234567890123");
    expect(r.status).toBe("In Transit");
    expect(r.statusType).toBe("UD");
    expect(r.location).toContain("Bhiwandi");
    expect(r.expectedDelivery).toBe("2026-12-02");
    expect(r.scans.map((s) => s.status)).toEqual(["Manifested", "In Transit"]);
    expect(r.at).toBe("2026-11-29T02:40:00.000Z"); // IST → UTC
  });
  it("accepts push-webhook shape and tolerates junk", () => {
    expect(parseTracking({ Shipment: sample.ShipmentData[0].Shipment })).toHaveLength(1);
    expect(parseTracking(null)).toEqual([]);
    expect(parseTracking({ ShipmentData: [{}] })).toEqual([]);
    expect(istToIso("not a date")).toBeNull();
  });
  it("maps Delhivery statuses to our shipment lifecycle", () => {
    expect(mapDelhiveryStatus({ status: "Manifested", statusType: "UD" })).toBe("packed");
    expect(mapDelhiveryStatus({ status: "Not Picked", statusType: "UD" })).toBe("packed");
    expect(mapDelhiveryStatus({ status: "In Transit", statusType: "UD" })).toBe("in_transit");
    expect(mapDelhiveryStatus({ status: "Dispatched", statusType: "UD" })).toBe("out_for_delivery");
    expect(mapDelhiveryStatus({ status: "Delivered", statusType: "DL" })).toBe("delivered");
    expect(mapDelhiveryStatus({ status: "RTO", statusType: "RT" })).toBe("returned");
  });
});

describe("URL safety", () => {
  it("rejects javascript:, data:, http: and credentialed URLs", () => {
    expect(isHttpsUrl("javascript:alert(1)//")).toBe(false);
    expect(isHttpsUrl("data:text/html,x")).toBe(false);
    expect(isHttpsUrl("http://example.com")).toBe(false);
    expect(isHttpsUrl("https://user:pw@example.com")).toBe(false);
    expect(isHttpsUrl("https://www.delhivery.com/track-v2/package/1")).toBe(true);
    expect(optionalHttpsUrl.safeParse("javascript:alert(1)").success).toBe(false);
    expect(optionalHttpsUrl.parse("")).toBeNull();
  });
  it("only accepts images from our own storage bucket", () => {
    expect(isStorageUrl("https://abc.supabase.co/storage/v1/object/public/shop-media/a.webp")).toBe(true);
    expect(isStorageUrl("https://evil.com/storage/v1/object/public/a.webp")).toBe(false);
    expect(isStorageUrl("https://abc.supabase.co/storage/v1/object/sign/x")).toBe(false);
  });
});
