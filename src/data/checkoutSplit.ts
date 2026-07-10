/**
 * Split one checkout across the shops in the basket.
 *
 * The cart is supplier-grouped and each seller must see only their own order,
 * so a mixed basket becomes one order per shop. Shipping, VAT and coupon
 * discounts apply to the WHOLE checkout, so each shop's order carries a share
 * of the grand total, proportional to its goods — and the shares must sum to
 * exactly the grand total, or money appears or vanishes in the books.
 *
 * This lived inline in PaymentScreen, where no test could reach it. Extracting
 * it surfaced a real defect: the old code rounded each share and let the LAST
 * shop absorb the remainder — with a deep coupon and several shops the earlier
 * roundings could over-allocate, pushing the last share NEGATIVE. An order with
 * a negative total would have poisoned every report downstream.
 *
 * Pure TS.
 */

export type SplitLine = { shop: string; price: number; quantity: number };

export type ShopShare<T extends SplitLine> = {
  shopName: string;
  lines: T[];
  /** This shop's slice of the grand total. Never negative; all slices sum to it. */
  share: number;
};

export function splitByShop<T extends SplitLine>(
  items: T[],
  grandTotal: number,
  subtotal: number,
): ShopShare<T>[] {
  const byShop = new Map<string, T[]>();
  for (const it of items) byShop.set(it.shop, [...(byShop.get(it.shop) ?? []), it]);

  const groups = [...byShop.entries()];
  const lineTotal = (ls: T[]) => ls.reduce((s, i) => s + i.price * i.quantity, 0);
  const grand = Math.max(0, grandTotal);

  const out: ShopShare<T>[] = [];
  let remaining = grand;
  for (let g = 0; g < groups.length; g++) {
    const [shopName, lines] = groups[g];
    const isLast = g === groups.length - 1;
    // Proportional share, clamped into what is still unallocated — the clamp is
    // what keeps a rounded-up early share from driving the last one below zero.
    const fraction = subtotal > 0 ? lineTotal(lines) / subtotal : 0;
    const share = isLast ? remaining : Math.min(Math.max(0, Math.round(fraction * grand)), remaining);
    remaining -= share;
    out.push({ shopName, lines, share });
  }
  return out;
}
