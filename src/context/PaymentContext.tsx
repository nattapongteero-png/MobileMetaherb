import { createContext, useContext, useState, type ReactNode } from "react";
import { DEFAULT_SHIPPING_ID } from "../data/shippingMethods";
import type { Address } from "../data/addresses";
import { useStore } from "../store/db";
import {
  addAddress as addAddressAction,
  addresses as addressList,
  prefsStore,
  removeAddress as removeAddressAction,
  selectAddress,
  setDefaultAddress as setDefaultAddressAction,
  updateAddress as updateAddressAction,
} from "../store/prefs";

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
  /** Id of the applied checkout coupon, or null when none. (Was an array index
   * into a frozen coupon list — meaningless now that the list is the buyer's
   * own wallet and can change between screens.) */
  selectedCouponId: string | null;
  setSelectedCouponId: (id: string | null) => void;
  /** MetaHerb Coins applied as discount (1,000 coins = ฿1). */
  coinsUsed: number;
  setCoinsUsed: (n: number) => void;
  /** Saved shipping addresses + the chosen one. */
  addresses: Address[];
  selectedAddressId: string;
  setSelectedAddressId: (id: string) => void;
  addAddress: (a: Omit<Address, "id">) => void;
  updateAddress: (id: string, a: Omit<Address, "id">) => void;
  removeAddress: (id: string) => void;
  setDefaultAddress: (id: string) => void;
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
  const [selectedCouponId, setSelectedCouponId] = useState<string | null>(null);
  const [coinsUsed, setCoinsUsed] = useState<number>(0);
  // Addresses live in the persisted preferences store — an address the buyer
  // typed used to vanish on restart while the order shipped to it persisted.
  const prefs = useStore(prefsStore);
  const addresses = prefs.addresses;
  const selectedAddressId = prefs.selectedAddressId || addresses[0]?.id || "";

  const addAddress = (a: Omit<Address, "id">) => void addAddressAction(a);
  const updateAddress = (id: string, a: Omit<Address, "id">) => updateAddressAction(id, a);
  const removeAddress = removeAddressAction;
  const setDefaultAddress = setDefaultAddressAction;
  const setSelectedAddressId = selectAddress;

  return (
    <PaymentContext.Provider
      value={{
        selectedPayment,
        setSelectedPayment,
        trueMoneyPhone,
        setTrueMoneyPhone,
        selectedShipping,
        setSelectedShipping,
        selectedCouponId,
        setSelectedCouponId,
        coinsUsed,
        setCoinsUsed,
        addresses,
        selectedAddressId,
        setSelectedAddressId,
        addAddress,
        updateAddress,
        removeAddress,
        setDefaultAddress,
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
