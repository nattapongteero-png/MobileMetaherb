import { createContext, useContext, useState, type ReactNode } from "react";
import { INITIAL_BANK_ACCOUNTS, INITIAL_CARDS, type BankAccount, type CreditCard, type CardBrand } from "../data/bankAccounts";

type AddCardInput = { brand: CardBrand; last4: string; expMonth: number; expYear: number; isDefault?: boolean };

export const TRUEWALLET_ID = "truewallet";

type AddAccountInput = {
  bankCode: string;
  accountName: string;
  accountNo: string;
  isDefault?: boolean;
};

type RefundValue = {
  accounts: BankAccount[];
  /** Add a bank account and return it (handles the default flag). */
  addAccount: (input: AddAccountInput) => BankAccount;
  /** Remove a linked bank account by id. */
  removeAccount: (id: string) => void;
  /** Linked credit / debit cards. */
  cards: CreditCard[];
  /** Add a card and return it (handles the default flag). */
  addCard: (input: AddCardInput) => CreditCard;
  /** Remove a linked card by id. */
  removeCard: (id: string) => void;
  /** Linked TrueMoney Wallet number, or null if not linked. */
  trueWallet: string | null;
  /** Unlink the TrueMoney Wallet. */
  unlinkTrueWallet: () => void;
  /** The ONE default payment method id, shared across banks / cards / TrueMoney. */
  defaultId: string;
  setDefault: (id: string) => void;
  /** Selected refund channel — a bank account id or TRUEWALLET_ID. */
  selectedId: string;
  setSelectedId: (id: string) => void;
};

const RefundContext = createContext<RefundValue | null>(null);

export function RefundProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<BankAccount[]>(INITIAL_BANK_ACCOUNTS);
  const [cards, setCards] = useState<CreditCard[]>(INITIAL_CARDS);
  // Seeded as already-linked so "TrueWallet ที่ผูกไว้" shows as a refund option.
  const [trueWallet, setTrueWallet] = useState<string | null>("0812345678");
  const [selectedId, setSelectedId] = useState<string>(INITIAL_BANK_ACCOUNTS[0].id);
  // One global default across all payment types (seeded to the default bank account).
  const [defaultId, setDefaultId] = useState<string>(
    INITIAL_BANK_ACCOUNTS.find((a) => a.isDefault)?.id ?? INITIAL_BANK_ACCOUNTS[0].id,
  );
  const setDefault = (id: string) => setDefaultId(id);

  const addAccount = (input: AddAccountInput) => {
    const acc: BankAccount = {
      id: `acc-${accounts.length + 1}-${input.accountNo.slice(-4)}`,
      bankCode: input.bankCode,
      accountName: input.accountName,
      accountNo: input.accountNo,
      isDefault: input.isDefault,
    };
    setAccounts((prev) => {
      // A new default clears the default flag on the others.
      const base = input.isDefault ? prev.map((a) => ({ ...a, isDefault: false })) : prev;
      return [...base, acc];
    });
    if (input.isDefault) setDefaultId(acc.id);
    return acc;
  };

  const removeAccount = (id: string) => {
    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setSelectedId((cur) => {
      if (cur !== id) return cur;
      const next = accounts.find((a) => a.id !== id);
      return next ? next.id : trueWallet ? TRUEWALLET_ID : "";
    });
    if (id === defaultId) setDefaultId(accounts.find((a) => a.id !== id)?.id ?? cards[0]?.id ?? (trueWallet ? TRUEWALLET_ID : ""));
  };

  const unlinkTrueWallet = () => {
    setTrueWallet(null);
    setSelectedId((cur) => (cur === TRUEWALLET_ID ? accounts[0]?.id ?? "" : cur));
    if (defaultId === TRUEWALLET_ID) setDefaultId(accounts[0]?.id ?? cards[0]?.id ?? "");
  };

  const addCard = (input: AddCardInput) => {
    const c: CreditCard = { id: `card-${input.brand}-${input.last4}-${Date.now()}`, ...input };
    setCards((prev) => {
      const base = input.isDefault ? prev.map((x) => ({ ...x, isDefault: false })) : prev;
      return [...base, c];
    });
    if (input.isDefault) setDefaultId(c.id);
    return c;
  };

  const removeCard = (id: string) => {
    setCards((prev) => prev.filter((c) => c.id !== id));
    if (id === defaultId) setDefaultId(accounts[0]?.id ?? cards.find((c) => c.id !== id)?.id ?? (trueWallet ? TRUEWALLET_ID : ""));
  };

  return (
    <RefundContext.Provider value={{ accounts, addAccount, removeAccount, cards, addCard, removeCard, trueWallet, unlinkTrueWallet, defaultId, setDefault, selectedId, setSelectedId }}>
      {children}
    </RefundContext.Provider>
  );
}

export function useRefund(): RefundValue {
  const ctx = useContext(RefundContext);
  if (!ctx) throw new Error("useRefund must be used within RefundProvider");
  return ctx;
}
