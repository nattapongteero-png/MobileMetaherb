import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEYS = {
  isSeller: "metaherb.isSeller",
  isSupplier: "metaherb.isSupplier",
  isTrialBrand: "metaherb.isTrialBrand",
  shopLogo: "metaherb.shopLogo",
  shopProfile: "metaherb.shopProfile",
} as const;

/** Core shop-registration data reused (and locked) by other apply forms. */
export type ShopProfile = { shopName: string; ownerName: string; taxId: string; address: string; email: string; phone: string };

type SellerValue = {
  /** Registered (and opened) a shop. */
  isSeller: boolean;
  setIsSeller: (v: boolean) => void;
  /** Registered as a Herbal Market supplier (B2B raw materials). */
  isSupplier: boolean;
  setIsSupplier: (v: boolean) => void;
  /** Registered as a trial brand (lists products for users to try). */
  isTrialBrand: boolean;
  setIsTrialBrand: (v: boolean) => void;
  /** Shop logo uploaded at registration — reused by other apply forms. */
  shopLogoUri: string | null;
  setShopLogoUri: (v: string | null) => void;
  /** Shop registration data — reused (and locked) by other apply forms. */
  shopProfile: ShopProfile | null;
  setShopProfile: (v: ShopProfile | null) => void;
};

const SellerContext = createContext<SellerValue | null>(null);

export function SellerProvider({ children }: { children: ReactNode }) {
  const [isSeller, setIsSeller] = useState(false);
  const [isSupplier, setIsSupplier] = useState(false);
  const [isTrialBrand, setIsTrialBrand] = useState(false);
  const [shopLogoUri, setShopLogoUri] = useState<string | null>(null);
  const [shopProfile, setShopProfile] = useState<ShopProfile | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(KEYS.isSeller),
      AsyncStorage.getItem(KEYS.isSupplier),
      AsyncStorage.getItem(KEYS.isTrialBrand),
      AsyncStorage.getItem(KEYS.shopLogo),
      AsyncStorage.getItem(KEYS.shopProfile),
    ]).then(([s, sup, tb, logo, profile]) => {
      if (s === "1") setIsSeller(true);
      if (sup === "1") setIsSupplier(true);
      if (tb === "1") setIsTrialBrand(true);
      if (logo) setShopLogoUri(logo);
      if (profile) { try { setShopProfile(JSON.parse(profile)); } catch {} }
      setHydrated(true);
    });
  }, []);

  useEffect(() => { if (hydrated) AsyncStorage.setItem(KEYS.isSeller, isSeller ? "1" : "0").catch(() => {}); }, [isSeller, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(KEYS.isSupplier, isSupplier ? "1" : "0").catch(() => {}); }, [isSupplier, hydrated]);
  useEffect(() => { if (hydrated) AsyncStorage.setItem(KEYS.isTrialBrand, isTrialBrand ? "1" : "0").catch(() => {}); }, [isTrialBrand, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    if (shopLogoUri) AsyncStorage.setItem(KEYS.shopLogo, shopLogoUri).catch(() => {});
    else AsyncStorage.removeItem(KEYS.shopLogo).catch(() => {});
  }, [shopLogoUri, hydrated]);
  useEffect(() => {
    if (!hydrated) return;
    if (shopProfile) AsyncStorage.setItem(KEYS.shopProfile, JSON.stringify(shopProfile)).catch(() => {});
    else AsyncStorage.removeItem(KEYS.shopProfile).catch(() => {});
  }, [shopProfile, hydrated]);

  return (
    <SellerContext.Provider value={{ isSeller, setIsSeller, isSupplier, setIsSupplier, isTrialBrand, setIsTrialBrand, shopLogoUri, setShopLogoUri, shopProfile, setShopProfile }}>
      {children}
    </SellerContext.Provider>
  );
}

export function useSeller(): SellerValue {
  const ctx = useContext(SellerContext);
  if (!ctx) throw new Error("useSeller must be used within SellerProvider");
  return ctx;
}
