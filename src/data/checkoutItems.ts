import type { ImageSourcePropType } from "react-native";

export type CheckoutItem = {
  id: string;
  name: string;
  option: string;
  price: number;
  originalPrice?: number;
  quantity: number;
  image: ImageSourcePropType;
};

// Mock items being checked out. Shared so the coupon picker can read the
// subtotal (to gray out coupons under their minimum spend).
export const CHECKOUT_ITEMS: CheckoutItem[] = [
  {
    id: "p1",
    name: "อบเชยเทศ Cinnamon Varum 150g",
    option: "ขนาด 150g",
    price: 199,
    originalPrice: 330,
    quantity: 2,
    image: require("../../assets/products/catalog/product-37.jpg"),
  },
  {
    id: "p2",
    name: "เมต้าเฮิร์บ ยาดมสมุนไพร แดง+น้ำเงิน",
    option: "เซต 2 ขวด",
    price: 89,
    originalPrice: 150,
    quantity: 1,
    image: require("../../assets/products/catalog/product-10.jpg"),
  },
];

export const CHECKOUT_SUBTOTAL = CHECKOUT_ITEMS.reduce((s, i) => s + i.price * i.quantity, 0);
