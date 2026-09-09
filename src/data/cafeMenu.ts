/**
 * METAHERB Café menu — AUTO-DERIVED from assets/menu caffe/<main>/<sub>/*.png.
 * 2-level taxonomy: main category (drink/dessert) → sub category (Coffee, Tea,
 * Milk, Soda, Bakery, Thai Desserts) → items. Prices are mock (seeded by sub).
 * Regenerate with scratchpad/gen-cafe.js if the folder changes.
 */

export type CafeMainId = "drink" | "dessert";
export type CafeMain = { id: CafeMainId; label: string; emoji: string };
export type CafeSub = { id: string; mainId: CafeMainId; label: string; accent: string };
export type CafeItem = { id: string; name: string; desc: string; price: number; sold: number; image: number; mainId: CafeMainId; subId: string; popular?: boolean; hasMilk?: boolean; hasShot?: boolean };

export const CAFE_MAINS: CafeMain[] = [
  { id: "drink", label: "เครื่องดื่ม", emoji: "🥤" },
  { id: "dessert", label: "ของหวาน", emoji: "🍰" },
];

export const CAFE_SUBS: CafeSub[] = [
  { id: "drink-coffee", mainId: "drink", label: "กาแฟ", accent: "#8b5e3c" },
  { id: "drink-milk", mainId: "drink", label: "นม & โกโก้", accent: "#db6aa0" },
  { id: "drink-soda", mainId: "drink", label: "โซดา", accent: "#3b82f6" },
  { id: "drink-tea", mainId: "drink", label: "ชา", accent: "#2f9e6f" },
  { id: "dessert-bakery", mainId: "dessert", label: "เบเกอรี่", accent: "#d97706" },
  { id: "dessert-thai-desserts", mainId: "dessert", label: "ขนมไทย", accent: "#16a34a" },
];

export const CAFE_MENU: CafeItem[] = [
  { id: "drink-coffee-black-coffee", name: "Black Coffee", desc: "กาแฟสดคั่วพิเศษ หอมเข้มกลมกล่อม", price: 60, sold: 58, mainId: "drink", subId: "drink-coffee", hasShot: true, image: require("../../assets/menu-caffe/drink/Coffee/Black-Coffee.jpg") },
  { id: "drink-coffee-black-honey-lemon", name: "Black Honey Lemon", desc: "กาแฟสดคั่วพิเศษ หอมเข้มกลมกล่อม", price: 65, sold: 168, mainId: "drink", subId: "drink-coffee", hasShot: true, image: require("../../assets/menu-caffe/drink/Coffee/Black-Honey-Lemon.jpg") },
  { id: "drink-coffee-hot-americano", name: "Hot Americano", desc: "ร้อน · กาแฟสดคั่วพิเศษ หอมเข้มกลมกล่อม", price: 70, sold: 207, mainId: "drink", subId: "drink-coffee", hasShot: true, image: require("../../assets/menu-caffe/drink/Coffee/Hot-Americano.jpg") },
  { id: "drink-coffee-hot-cappuccino", name: "Hot Cappuccino", desc: "ร้อน · กาแฟสดคั่วพิเศษ หอมเข้มกลมกล่อม", price: 75, sold: 145, mainId: "drink", subId: "drink-coffee", hasMilk: true, hasShot: true, image: require("../../assets/menu-caffe/drink/Coffee/Hot-Cappuccino.jpg") },
  { id: "drink-coffee-hot-espresso", name: "Hot Espresso", desc: "ร้อน · กาแฟสดคั่วพิเศษ หอมเข้มกลมกล่อม", price: 60, sold: 148, mainId: "drink", subId: "drink-coffee", hasShot: true, image: require("../../assets/menu-caffe/drink/Coffee/Hot-Espresso.jpg") },
  { id: "drink-coffee-hot-mocha", name: "Hot Mocha", desc: "ร้อน · กาแฟสดคั่วพิเศษ หอมเข้มกลมกล่อม", price: 65, sold: 144, mainId: "drink", subId: "drink-coffee", hasMilk: true, hasShot: true, image: require("../../assets/menu-caffe/drink/Coffee/Hot-Mocha.jpg") },
  { id: "drink-coffee-iced-americano", name: "Iced Americano", desc: "เย็น · กาแฟสดคั่วพิเศษ หอมเข้มกลมกล่อม", price: 80, sold: 276, mainId: "drink", subId: "drink-coffee", popular: true, hasShot: true, image: require("../../assets/menu-caffe/drink/Coffee/Iced-Americano.jpg") },
  { id: "drink-coffee-iced-cappuccino", name: "Iced Cappuccino", desc: "เย็น · กาแฟสดคั่วพิเศษ หอมเข้มกลมกล่อม", price: 75, sold: 219, mainId: "drink", subId: "drink-coffee", hasMilk: true, hasShot: true, image: require("../../assets/menu-caffe/drink/Coffee/Iced-Cappuccino.jpg") },
  { id: "drink-coffee-iced-caramel-macchiato", name: "Iced Caramel Macchiato", desc: "เย็น · กาแฟสดคั่วพิเศษ หอมเข้มกลมกล่อม", price: 70, sold: 275, mainId: "drink", subId: "drink-coffee", popular: true, hasMilk: true, hasShot: true, image: require("../../assets/menu-caffe/drink/Coffee/Iced-Caramel-Macchiato.jpg") },
  { id: "drink-coffee-iced-coconut-americano", name: "Iced Coconut Americano", desc: "เย็น · กาแฟสดคั่วพิเศษ หอมเข้มกลมกล่อม", price: 65, sold: 144, mainId: "drink", subId: "drink-coffee", hasShot: true, image: require("../../assets/menu-caffe/drink/Coffee/Iced-Coconut-Americano.jpg") },
  { id: "drink-coffee-iced-coconut-latte", name: "Iced Coconut Latte", desc: "เย็น · กาแฟสดคั่วพิเศษ หอมเข้มกลมกล่อม", price: 70, sold: 99, mainId: "drink", subId: "drink-coffee", hasMilk: true, hasShot: true, image: require("../../assets/menu-caffe/drink/Coffee/Iced-Coconut-Latte.jpg") },
  { id: "drink-coffee-iced-espresso", name: "Iced Espresso", desc: "เย็น · กาแฟสดคั่วพิเศษ หอมเข้มกลมกล่อม", price: 75, sold: 222, mainId: "drink", subId: "drink-coffee", hasShot: true, image: require("../../assets/menu-caffe/drink/Coffee/Iced-Espresso.jpg") },
  { id: "drink-coffee-iced-latte", name: "Iced Latte", desc: "เย็น · กาแฟสดคั่วพิเศษ หอมเข้มกลมกล่อม", price: 70, sold: 231, mainId: "drink", subId: "drink-coffee", popular: true, hasMilk: true, hasShot: true, image: require("../../assets/menu-caffe/drink/Coffee/Iced-Latte.jpg") },
  { id: "drink-coffee-iced-mocha", name: "Iced Mocha", desc: "เย็น · กาแฟสดคั่วพิเศษ หอมเข้มกลมกล่อม", price: 65, sold: 218, mainId: "drink", subId: "drink-coffee", hasMilk: true, hasShot: true, image: require("../../assets/menu-caffe/drink/Coffee/Iced-Mocha.jpg") },
  { id: "drink-coffee-iced-orange-americano", name: "Iced Orange Americano", desc: "เย็น · กาแฟสดคั่วพิเศษ หอมเข้มกลมกล่อม", price: 70, sold: 197, mainId: "drink", subId: "drink-coffee", hasShot: true, image: require("../../assets/menu-caffe/drink/Coffee/Iced-Orange-Americano.jpg") },
  { id: "drink-coffee-iced-yuzu-americano", name: "Iced Yuzu Americano", desc: "เย็น · กาแฟสดคั่วพิเศษ หอมเข้มกลมกล่อม", price: 75, sold: 218, mainId: "drink", subId: "drink-coffee", hasShot: true, image: require("../../assets/menu-caffe/drink/Coffee/Iced-Yuzu-Americano.jpg") },
  { id: "drink-milk-butterfly-pea-latte", name: "Butterfly Pea Latte", desc: "เครื่องดื่มนมเนียนนุ่ม หวานกำลังดี", price: 65, sold: 54, mainId: "drink", subId: "drink-milk", hasMilk: true, image: require("../../assets/menu-caffe/drink/Milk/Butterfly-Pea-Latte.jpg") },
  { id: "drink-milk-caramel-milk", name: "Caramel Milk", desc: "เครื่องดื่มนมเนียนนุ่ม หวานกำลังดี", price: 70, sold: 87, mainId: "drink", subId: "drink-milk", hasMilk: true, image: require("../../assets/menu-caffe/drink/Milk/Caramel-Milk.jpg") },
  { id: "drink-milk-coconut-milk", name: "Coconut Milk", desc: "เครื่องดื่มนมเนียนนุ่ม หวานกำลังดี", price: 75, sold: 125, mainId: "drink", subId: "drink-milk", hasMilk: true, image: require("../../assets/menu-caffe/drink/Milk/Coconut-Milk.jpg") },
  { id: "drink-milk-iced-cocoa", name: "Iced Cocoa", desc: "เย็น · เครื่องดื่มนมเนียนนุ่ม หวานกำลังดี", price: 80, sold: 215, mainId: "drink", subId: "drink-milk", hasMilk: true, image: require("../../assets/menu-caffe/drink/Milk/Iced-Cocoa.jpg") },
  { id: "drink-milk-mint-dark-cocoa", name: "Mint Dark Cocoa", desc: "เครื่องดื่มนมเนียนนุ่ม หวานกำลังดี", price: 65, sold: 128, mainId: "drink", subId: "drink-milk", hasMilk: true, image: require("../../assets/menu-caffe/drink/Milk/Mint-Dark-Cocoa.jpg") },
  { id: "drink-milk-pink-milk", name: "Pink Milk", desc: "เครื่องดื่มนมเนียนนุ่ม หวานกำลังดี", price: 70, sold: 156, mainId: "drink", subId: "drink-milk", hasMilk: true, image: require("../../assets/menu-caffe/drink/Milk/Pink-Milk.jpg") },
  { id: "drink-milk-strawberry-milk", name: "Strawberry Milk", desc: "เครื่องดื่มนมเนียนนุ่ม หวานกำลังดี", price: 85, sold: 286, mainId: "drink", subId: "drink-milk", popular: true, hasMilk: true, image: require("../../assets/menu-caffe/drink/Milk/Strawberry-Milk.jpg") },
  { id: "drink-milk-sweet-potato-milk", name: "Sweet Potato Milk", desc: "เครื่องดื่มนมเนียนนุ่ม หวานกำลังดี", price: 80, sold: 217, mainId: "drink", subId: "drink-milk", hasMilk: true, image: require("../../assets/menu-caffe/drink/Milk/Sweet-Potato-Milk.jpg") },
  { id: "drink-soda-blue-hawaii-soda", name: "Blue Hawaii Soda", desc: "โซดาเย็นซ่า สดชื่นทุกอึก", price: 55, sold: 47, mainId: "drink", subId: "drink-soda", image: require("../../assets/menu-caffe/drink/Soda/Blue-Hawaii-Soda.jpg") },
  { id: "drink-soda-butterfly-pea-lemon-soda", name: "Butterfly Pea Lemon Soda", desc: "โซดาเย็นซ่า สดชื่นทุกอึก", price: 60, sold: 118, mainId: "drink", subId: "drink-soda", image: require("../../assets/menu-caffe/drink/Soda/Butterfly-Pea-Lemon-Soda.jpg") },
  { id: "drink-soda-honey-lemon-soda", name: "Honey Lemon Soda", desc: "โซดาเย็นซ่า สดชื่นทุกอึก", price: 75, sold: 257, mainId: "drink", subId: "drink-soda", popular: true, image: require("../../assets/menu-caffe/drink/Soda/Honey-Lemon-Soda.jpg") },
  { id: "drink-soda-lychee-soda", name: "Lychee Soda", desc: "โซดาเย็นซ่า สดชื่นทุกอึก", price: 70, sold: 170, mainId: "drink", subId: "drink-soda", image: require("../../assets/menu-caffe/drink/Soda/Lychee-Soda.jpg") },
  { id: "drink-soda-pineapple-soda", name: "Pineapple Soda", desc: "โซดาเย็นซ่า สดชื่นทุกอึก", price: 55, sold: 134, mainId: "drink", subId: "drink-soda", image: require("../../assets/menu-caffe/drink/Soda/Pineapple-Soda.jpg") },
  { id: "drink-soda-plum-soda", name: "Plum Soda", desc: "โซดาเย็นซ่า สดชื่นทุกอึก", price: 60, sold: 162, mainId: "drink", subId: "drink-soda", image: require("../../assets/menu-caffe/drink/Soda/Plum-Soda.jpg") },
  { id: "drink-soda-pure-matcha-lemon-soda", name: "Pure Matcha Lemon Soda", desc: "โซดาเย็นซ่า สดชื่นทุกอึก", price: 65, sold: 61, mainId: "drink", subId: "drink-soda", image: require("../../assets/menu-caffe/drink/Soda/Pure-Matcha-Lemon-Soda.jpg") },
  { id: "drink-soda-red-lime-soda", name: "Red Lime Soda", desc: "โซดาเย็นซ่า สดชื่นทุกอึก", price: 70, sold: 94, mainId: "drink", subId: "drink-soda", image: require("../../assets/menu-caffe/drink/Soda/Red-Lime-Soda.jpg") },
  { id: "drink-soda-rose-soda", name: "Rose Soda", desc: "โซดาเย็นซ่า สดชื่นทุกอึก", price: 55, sold: 157, mainId: "drink", subId: "drink-soda", image: require("../../assets/menu-caffe/drink/Soda/Rose-Soda.jpg") },
  { id: "drink-soda-strawberry-soda", name: "Strawberry Soda", desc: "โซดาเย็นซ่า สดชื่นทุกอึก", price: 60, sold: 105, mainId: "drink", subId: "drink-soda", image: require("../../assets/menu-caffe/drink/Soda/Strawberry-Soda.jpg") },
  { id: "drink-soda-apple-soda", name: "apple soda", desc: "โซดาเย็นซ่า สดชื่นทุกอึก", price: 65, sold: 130, mainId: "drink", subId: "drink-soda", image: require("../../assets/menu-caffe/drink/Soda/apple-soda.jpg") },
  { id: "drink-tea-assam-milk-tea", name: "Assam Milk Tea", desc: "ชาคุณภาพ ชงสดหอมละมุน", price: 55, sold: 209, mainId: "drink", subId: "drink-tea", hasMilk: true, image: require("../../assets/menu-caffe/drink/Tea/Assam-Milk-Tea.jpg") },
  { id: "drink-tea-camellia-milk-tea", name: "Camellia Milk Tea", desc: "ชาคุณภาพ ชงสดหอมละมุน", price: 60, sold: 140, mainId: "drink", subId: "drink-tea", hasMilk: true, image: require("../../assets/menu-caffe/drink/Tea/Camellia-Milk-Tea.jpg") },
  { id: "drink-tea-green-tea-coconut", name: "Green Tea Coconut", desc: "ชาคุณภาพ ชงสดหอมละมุน", price: 65, sold: 179, mainId: "drink", subId: "drink-tea", image: require("../../assets/menu-caffe/drink/Tea/Green-Tea-Coconut.jpg") },
  { id: "drink-tea-green-tea-latte", name: "Green Tea Latte", desc: "ชาคุณภาพ ชงสดหอมละมุน", price: 80, sold: 309, mainId: "drink", subId: "drink-tea", popular: true, hasMilk: true, image: require("../../assets/menu-caffe/drink/Tea/Green-Tea-Latte.jpg") },
  { id: "drink-tea-green-tea", name: "Green Tea", desc: "ชาคุณภาพ ชงสดหอมละมุน", price: 55, sold: 136, mainId: "drink", subId: "drink-tea", image: require("../../assets/menu-caffe/drink/Tea/Green-Tea.jpg") },
  { id: "drink-tea-iced-black-tea", name: "Iced Black Tea", desc: "เย็น · ชาคุณภาพ ชงสดหอมละมุน", price: 60, sold: 161, mainId: "drink", subId: "drink-tea", image: require("../../assets/menu-caffe/drink/Tea/Iced-Black-Tea.jpg") },
  { id: "drink-tea-iced-honey-lemon-tea", name: "Iced Honey Lemon Tea", desc: "เย็น · ชาคุณภาพ ชงสดหอมละมุน", price: 65, sold: 198, mainId: "drink", subId: "drink-tea", image: require("../../assets/menu-caffe/drink/Tea/Iced-Honey-Lemon-Tea.jpg") },
  { id: "drink-tea-iced-lemon-tea", name: "Iced Lemon Tea", desc: "เย็น · ชาคุณภาพ ชงสดหอมละมุน", price: 70, sold: 191, mainId: "drink", subId: "drink-tea", image: require("../../assets/menu-caffe/drink/Tea/Iced-Lemon-Tea.jpg") },
  { id: "drink-tea-jasmine-milk-tea", name: "Jasmine Milk Tea", desc: "ชาคุณภาพ ชงสดหอมละมุน", price: 55, sold: 59, mainId: "drink", subId: "drink-tea", hasMilk: true, image: require("../../assets/menu-caffe/drink/Tea/Jasmine-Milk-Tea.jpg") },
  { id: "drink-tea-osmanthus-milk-tea", name: "Osmanthus Milk Tea", desc: "ชาคุณภาพ ชงสดหอมละมุน", price: 60, sold: 130, mainId: "drink", subId: "drink-tea", hasMilk: true, image: require("../../assets/menu-caffe/drink/Tea/Osmanthus-Milk-Tea.jpg") },
  { id: "drink-tea-pure-matcha-coconut", name: "Pure Matcha Coconut", desc: "ชาคุณภาพ ชงสดหอมละมุน", price: 65, sold: 222, mainId: "drink", subId: "drink-tea", image: require("../../assets/menu-caffe/drink/Tea/Pure-Matcha-Coconut.jpg") },
  { id: "drink-tea-pure-matcha", name: "Pure Matcha", desc: "ชาคุณภาพ ชงสดหอมละมุน", price: 80, sold: 354, mainId: "drink", subId: "drink-tea", popular: true, image: require("../../assets/menu-caffe/drink/Tea/Pure-Matcha.jpg") },
  { id: "drink-tea-thai-tea-coconut", name: "Thai Tea Coconut", desc: "ชาคุณภาพ ชงสดหอมละมุน", price: 55, sold: 72, mainId: "drink", subId: "drink-tea", hasMilk: true, image: require("../../assets/menu-caffe/drink/Tea/Thai-Tea-Coconut.jpg") },
  { id: "drink-tea-thai-tea", name: "Thai Tea", desc: "ชาคุณภาพ ชงสดหอมละมุน", price: 70, sold: 384, mainId: "drink", subId: "drink-tea", popular: true, hasMilk: true, image: require("../../assets/menu-caffe/drink/Tea/Thai-Tea.jpg") },
  { id: "dessert-bakery-blueberry-cream-cheese-croffle", name: "Blueberry Cream Cheese Croffle", desc: "เบเกอรี่อบใหม่ ละมุนทุกคำ", price: 65, sold: 338, mainId: "dessert", subId: "dessert-bakery", popular: true, image: require("../../assets/menu-caffe/dessert/Bakery/Blueberry-Cream-Cheese-Croffle.jpg") },
  { id: "dessert-bakery-brownie", name: "Brownie", desc: "เบเกอรี่อบใหม่ ละมุนทุกคำ", price: 70, sold: 226, mainId: "dessert", subId: "dessert-bakery", popular: true, image: require("../../assets/menu-caffe/dessert/Bakery/Brownie.jpg") },
  { id: "dessert-bakery-egg-trat", name: "Egg Trat", desc: "เบเกอรี่อบใหม่ ละมุนทุกคำ", price: 65, sold: 223, mainId: "dessert", subId: "dessert-bakery", image: require("../../assets/menu-caffe/dessert/Bakery/Egg-Trat.jpg") },
  { id: "dessert-bakery-mini-donuts", name: "Mini Donuts", desc: "เบเกอรี่อบใหม่ ละมุนทุกคำ", price: 80, sold: 386, mainId: "dessert", subId: "dessert-bakery", popular: true, image: require("../../assets/menu-caffe/dessert/Bakery/Mini-Donuts.jpg") },
  { id: "dessert-bakery-mixed-fruit-whipped-cream-croffle", name: "Mixed Fruit Whipped Cream Croffle", desc: "เบเกอรี่อบใหม่ ละมุนทุกคำ", price: 55, sold: 52, mainId: "dessert", subId: "dessert-bakery", image: require("../../assets/menu-caffe/dessert/Bakery/Mixed-Fruit-Whipped-Cream-Croffle.jpg") },
  { id: "dessert-bakery-muffin", name: "Muffin", desc: "เบเกอรี่อบใหม่ ละมุนทุกคำ", price: 60, sold: 118, mainId: "dessert", subId: "dessert-bakery", image: require("../../assets/menu-caffe/dessert/Bakery/Muffin.jpg") },
  { id: "dessert-bakery-oreo-whipped-cream-croffle", name: "Oreo Whipped Cream Croffle", desc: "เบเกอรี่อบใหม่ ละมุนทุกคำ", price: 65, sold: 120, mainId: "dessert", subId: "dessert-bakery", image: require("../../assets/menu-caffe/dessert/Bakery/Oreo-Whipped-Cream-Croffle.jpg") },
  { id: "dessert-bakery-strawberry-banana-whipped-cream-croffle", name: "Strawberry Banana Whipped Cream Croffle", desc: "เบเกอรี่อบใหม่ ละมุนทุกคำ", price: 70, sold: 141, mainId: "dessert", subId: "dessert-bakery", image: require("../../assets/menu-caffe/dessert/Bakery/Strawberry-Banana-Whipped-Cream-Croffle.jpg") },
  { id: "dessert-thai-desserts-coconut-jelly", name: "Coconut Jelly", desc: "ขนมไทยแท้ หวานหอมกลมกล่อม", price: 39, sold: 60, mainId: "dessert", subId: "dessert-thai-desserts", image: require("../../assets/menu-caffe/dessert/Thai-Desserts/Coconut-Jelly.jpg") },
  { id: "dessert-thai-desserts-khanom-chan", name: "Khanom Chan", desc: "ขนมไทยแท้ หวานหอมกลมกล่อม", price: 54, sold: 336, mainId: "dessert", subId: "dessert-thai-desserts", popular: true, image: require("../../assets/menu-caffe/dessert/Thai-Desserts/Khanom-Chan.jpg") },
  { id: "dessert-thai-desserts-khanom-piak-pun", name: "Khanom Piak Pun", desc: "ขนมไทยแท้ หวานหอมกลมกล่อม", price: 49, sold: 151, mainId: "dessert", subId: "dessert-thai-desserts", image: require("../../assets/menu-caffe/dessert/Thai-Desserts/Khanom-Piak-Pun.jpg") },
];
