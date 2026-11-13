import "server-only";
import { signOrderToken } from "@/lib/security/tokens";
import type { PaymentProvider } from "./types";

/** Simulated payment: no external calls. The /mock/pay page plays the role of Stripe's hosted page. */
export const mockProvider: PaymentProvider = {
  name: "mock",
  async createCheckout(order) {
    return { redirectUrl: `/mock/pay?o=${encodeURIComponent(signOrderToken(order.publicToken))}` };
  },
  async refund(order) {
    return { refundRef: `mock_refund_${order.id}` };
  },
};
