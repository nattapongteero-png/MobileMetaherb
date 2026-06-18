import { createContext, useContext, useState, type ReactNode } from "react";
import { DEFAULT_SHIPPING_ID } from "../data/shippingMethods";
import { INITIAL_ADDRESSES, type Address } from "../data/addresses";

type PaymentValue = {
  /** Currently selected payment-method id (e.g. "promptpay", "truemoney", a card id). */
  selectedPayment: string;
  setSelectedPayment: (id: string) => void;
  /** Phone linked to TrueMoney, or null until the user links one. */
  trueMoneyPhone: string | null;
  setTrueMoneyPhone: (phone: string | null) => void;
  /** Currently selected shipping-carrier id. */
  selectedShipping: string;
  setSelectedShipping: (id: string) => void;
  /** Index of the applied checkout coupon, or null when none. */
  selectedCouponIdx: number | null;
  setSelectedCouponIdx: (idx: number | null) => void;
  /** MetaHerb Coins applied as discount (1,000 coins = ฿1). */
  coinsUsed: number;
  setCoinsUsed: (n: number) => void;
  /** Saved shipping addresses + the chosen one. */
  addresses: Address[];
  selectedAddressId: string;
  setSelectedAddressId: (id: string) => void;
  addAddress: (a: Omit<Address, "id">) => void;
};

const PaymentContext = createContext<PaymentValue | null>(null);

/**
 * Holds the checkout payment selection so it survives navigation between the
 * Payment screen, the method picker, and the TrueMoney link flow. Keeping it
 * here means screens never pass callbacks/values through navigation params —
 * which is fragile across stacked modals.
 */
export function PaymentProvider({ children }: { children: ReactNode }) {
  const [selectedPayment, setSelectedPayment] = useState<string>("promptpay");
  const [trueMoneyPhone, setTrueMoneyPhone] = useState<string | null>(null);
  const [selectedShipping, setSelectedShipping] = useState<string>(DEFAULT_SHIPPING_ID);
  const [selectedCouponIdx, setSelectedCouponIdx] = useState<number | null>(null);
  const [coinsUsed, setCoinsUsed] = useState<number>(0);
  const [addresses, setAddresses] = useState<Address[]>(INITIAL_ADDRESSES);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    INITIAL_ADDRESSES.find((a) => a.isDefault)?.id ?? INITIAL_ADDRESSES[0].id,
  );

  const addAddress = (a: Omit<Address, "id">) => {
    const id = `addr-${addresses.length + 1}`;
    setAddresses((prev) => {
      const cleared = a.isDefault ? prev.map((p) => ({ ...p, isDefault: false })) : prev;
      return [...cleared, { ...a, id }];
    });
    setSelectedAddressId(id);
  };

  return (
    <PaymentContext.Provider
      value={{
        selectedPayment,
        setSelectedPayment,
        trueMoneyPhone,
        setTrueMoneyPhone,
        selectedShipping,
        setSelectedShipping,
        selectedCouponIdx,
        setSelectedCouponIdx,
        coinsUsed,
        setCoinsUsed,
        addresses,
        selectedAddressId,
        setSelectedAddressId,
        addAddress,
      }}
    >
      {children}
    </PaymentContext.Provider>
  );
}

export function usePayment(): PaymentValue {
  const ctx = useContext(PaymentContext);
  if (!ctx) throw new Error("usePayment must be used within PaymentProvider");
  return ctx;
}
