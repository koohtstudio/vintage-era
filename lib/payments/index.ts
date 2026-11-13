import "server-only";
import { isMock } from "@/lib/mode";
import { mockProvider } from "./mock";
import { stripeProvider } from "./stripe";
import type { PaymentProvider } from "./types";

/** The one switch between simulated and real payments. */
export const payments = (): PaymentProvider => (isMock ? mockProvider : stripeProvider);
export type { PaymentProvider, CheckoutOrder } from "./types";
