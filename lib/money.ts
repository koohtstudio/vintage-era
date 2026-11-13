const cad = new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 2 });

/** Integer cents -> "$145.00". */
export const formatMoney = (cents: number) => cad.format(cents / 100).replace("CA$", "$");

/** Whole-dollar prices render without cents: "$145". Placeholder prices render as [price]. */
export function displayPrice(cents: number, placeholder: boolean): string {
  if (placeholder) return "[price]";
  return cents % 100 === 0 ? `$${cents / 100}` : formatMoney(cents);
}

export const displayTotal = (cents: number, anyPlaceholder: boolean) => (anyPlaceholder ? "[price total]" : formatMoney(cents));
