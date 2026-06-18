import { createContext, useContext, useState, type ReactNode } from "react";

export type CartItem = {
  id: string;
  name: string;
  option: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  inStock: boolean;
  image: number | { uri: string };
  shop: string;
};

type AddInput = Omit<CartItem, "quantity" | "inStock" | "shop"> & {
  quantity?: number;
  inStock?: boolean;
  shop?: string;
};

type CartValue = {
  items: CartItem[];
  /** Number of distinct line items — drives the cart badge. */
  count: number;
  addToCart: (item: AddInput) => void;
  updateQty: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  removeMany: (ids: string[]) => void;
};

// Seed the cart with the previous mock contents so existing screens look the
// same on first open; new additions append to this single source of truth.
const SEED: CartItem[] = [
  {
    id: "c1",
    name: "อบเชยเทศ Cinnamon Varum 150g",
    option: "ขนาด 150g",
    price: 199,
    originalPrice: 330,
    quantity: 2,
    inStock: true,
    image: require("../../assets/products/catalog/product-37.jpg"),
    shop: "METAHERB Store",
  },
  {
    id: "c2",
    name: "เมต้าเฮิร์บ ยาดมสมุนไพร แดง+น้ำเงิน",
    option: "เซต 2 ขวด",
    price: 89,
    originalPrice: 150,
    quantity: 1,
    inStock: true,
    image: require("../../assets/products/catalog/product-10.jpg"),
    shop: "METAHERB Store",
  },
  {
    id: "c3",
    name: "กาแฟดริป Dark Roast Arabica 9 ซอง",
    option: "Dark Roast",
    price: 220,
    originalPrice: 320,
    quantity: 1,
    inStock: false,
    image: require("../../assets/products/catalog/product-03.png"),
    shop: "บ้านสมุนไพรไทย",
  },
];

const CartContext = createContext<CartValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(SEED);

  const addToCart: CartValue["addToCart"] = (input) => {
    const addQty = input.quantity ?? 1;
    setItems((prev) => {
      const existing = prev.find((i) => i.id === input.id);
      if (existing) {
        // Same product + option already in cart → bump its quantity.
        return prev.map((i) =>
          i.id === input.id ? { ...i, quantity: Math.min(99, i.quantity + addQty) } : i,
        );
      }
      const line: CartItem = {
        id: input.id,
        name: input.name,
        option: input.option,
        price: input.price,
        originalPrice: input.originalPrice,
        quantity: addQty,
        inStock: input.inStock ?? true,
        image: input.image,
        shop: input.shop ?? "METAHERB Store",
      };
      return [line, ...prev]; // newest first
    });
  };

  const updateQty = (id: string, quantity: number) =>
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, quantity: Math.max(1, Math.min(99, quantity)) } : i)),
    );

  const removeItem = (id: string) => setItems((prev) => prev.filter((i) => i.id !== id));

  const removeMany = (ids: string[]) =>
    setItems((prev) => prev.filter((i) => !ids.includes(i.id)));

  return (
    <CartContext.Provider
      value={{ items, count: items.length, addToCart, updateQty, removeItem, removeMany }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
