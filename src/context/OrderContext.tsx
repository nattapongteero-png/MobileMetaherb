import { createContext, useContext, useState, type ReactNode } from "react";
import { MOCK_ORDERS, type Order, type OrderStatus } from "../data/orders";

type OrderValue = {
  orders: Order[];
  /** Look up a single order by id (used by the detail screen). */
  getOrder: (id: string) => Order | undefined;
  /** Move an order to a new status (cancel / mark received). */
  setStatus: (id: string, status: OrderStatus) => void;
  /** Attach a review and flip the order to "completed". */
  submitReview: (id: string, review: NonNullable<Order["review"]>) => void;
};

const OrderContext = createContext<OrderValue | null>(null);

export function OrderProvider({ children }: { children: ReactNode }) {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);

  const getOrder = (id: string) => orders.find((o) => o.id === id);

  const setStatus = (id: string, status: OrderStatus) =>
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));

  const submitReview = (id: string, review: NonNullable<Order["review"]>) =>
    setOrders((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "completed", review } : o)),
    );

  return (
    <OrderContext.Provider value={{ orders, getOrder, setStatus, submitReview }}>
      {children}
    </OrderContext.Provider>
  );
}

export function useOrders(): OrderValue {
  const ctx = useContext(OrderContext);
  if (!ctx) throw new Error("useOrders must be used within OrderProvider");
  return ctx;
}
