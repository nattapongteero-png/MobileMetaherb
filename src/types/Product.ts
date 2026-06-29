// Shared Product type — used by HomeScreen, ProductDetailScreen, and any
// future screen that touches a product object.
export type ProductImage = number | { uri: string };

export type Product = {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  discountPercent?: number;
  rating: number;
  sold: string;
  image: ProductImage;
  isFlashSale?: boolean;
  isRecommended?: boolean;
  isFreeShipping?: boolean;
  hasCoupon?: boolean;
  flashSaleEndsIn?: number;
  /** 0–100 sold progress for the Flash Sale Goal-Gradient bar */
  soldPercent?: number;
  /** Owning shop's display name — drives multi-shop seller attribution. */
  shop?: string;
};
