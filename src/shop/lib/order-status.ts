/** Order & payment status vocabulary shared by storefront, emails and admin. */
export const ORDER_STATUSES = [
  "pending_payment",
  "payment_confirmed",
  "processing",
  "ready_for_shipment",
  "shipped",
  "delivered",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const PAYMENT_STATUSES = ["pending", "cod_pending", "paid", "failed", "refunded", "partially_refunded"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending_payment: "Pending payment",
  payment_confirmed: "Payment confirmed",
  processing: "Processing",
  ready_for_shipment: "Ready for shipment",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "Awaiting payment",
  cod_pending: "Cash on delivery",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
  partially_refunded: "Partially refunded",
};

/** Which manual status changes the admin may make from each status. */
export const ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending_payment: ["payment_confirmed", "processing", "cancelled"],
  payment_confirmed: ["processing", "ready_for_shipment", "cancelled"],
  processing: ["ready_for_shipment", "shipped", "cancelled"],
  ready_for_shipment: ["processing", "shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["refunded"],
  cancelled: [],
  refunded: [],
};

/** Steps shown on the customer's tracking timeline. */
export const TRACKING_STEPS: OrderStatus[] = ["payment_confirmed", "processing", "ready_for_shipment", "shipped", "delivered"];

export const statusTone = (s: string) =>
  s === "delivered" || s === "paid" || s === "payment_confirmed"
    ? "success"
    : s === "cancelled" || s === "failed" || s === "refunded"
      ? "danger"
      : s === "pending_payment" || s === "pending"
        ? "warning"
        : "info";

/** Customers may cancel themselves only before the order is being made. */
export const customerCanCancel = (s: OrderStatus) => s === "pending_payment" || s === "payment_confirmed";
