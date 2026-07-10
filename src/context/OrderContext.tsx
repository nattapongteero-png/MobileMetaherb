import { type ReactNode } from "react";
import { useStore } from "../store/db";
import {
  cancelOrder as cancelOrderAction,
  createOrder as createOrderAction,
  markDelivered,
  markPaid,
  ordersForUser,
  ordersStore,
  submitOrderReview,
  type CreateOrderInput,
  type CreateOrderResult,
} from "../store/orders";
import { currentUserId } from "../store/session";
import { sessionStore } from "../store/session";
import type { Order, OrderStatus } from "../store/types";

/**
 * Thin view over the shared orders table (src/store/orders.ts). It exists so the
 * five buyer screens can keep calling `useOrders()`, but the data now lives in
 * the same table the shop console writes to — a shipment marked by the seller
 * shows up here on the next render.
 */
type OrderValue = {
  /** Only this buyer's orders. The shop's own rows live in the same table. */
  orders: Order[];
  getOrder: (id: string) => Order | undefined;
  /** Move an order to a new status. Illegal transitions are ignored. */
  setStatus: (id: string, status: OrderStatus) => void;
  /** Attach a review and flip the order to "completed". */
  submitReview: (id: string, review: NonNullable<Order["review"]>) => void;
  /** Place a real order at checkout — reserves stock, notifies the shop. */
  placeOrder: (input: Omit<CreateOrderInput, "userId">) => CreateOrderResult;
};

export function OrderProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useOrders(): OrderValue {
  const all = useStore(ordersStore);
  const session = useStore(sessionStore);
  const userId = session.user?.id ?? currentUserId();

  const orders = all.filter((o) => o.userId === userId);

  const setStatus: OrderValue["setStatus"] = (id, status) => {
    // Route through the domain actions so each transition emits its event.
    if (status === "pending_verify") markPaid(id);
    else if (status === "delivered") markDelivered(id);
    else if (status === "cancelled") cancelOrderAction(id, { by: "customer" });
  };

  return {
    orders,
    getOrder: (id) => all.find((o) => o.id === id),
    setStatus,
    submitReview: (id, review) => void submitOrderReview(id, review),
    placeOrder: (input) => createOrderAction({ ...input, userId }),
  };
}

/** Kept for callers that want the raw selector outside React. */
export { ordersForUser };
