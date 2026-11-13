export interface CheckoutOrder {
  id: string;
  number: string;
  publicToken: string;
  email: string;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  items: { title: string; priceCents: number }[];
}

/** Both implementations (mock and Stripe) satisfy this. The rest of the app only sees the interface. */
export interface PaymentProvider {
  name: "mock" | "stripe";
  /** Returns where to send the shopper to pay. Never marks anything paid. */
  createCheckout(order: CheckoutOrder): Promise<{ redirectUrl: string }>;
  /** Full refund. Must be idempotent for the same order. */
  refund(order: { id: string; paymentRef: string }): Promise<{ refundRef: string }>;
}
