/** Shared shop types (browser + server). */

export type CustomizationChoice = { label: string; priceDelta: number };
export type CustomizationOption =
  | { id: string; label: string; type: "text"; required: boolean; maxLength: number; placeholder?: string; priceDelta: number; help?: string }
  | { id: string; label: string; type: "select"; required: boolean; choices: CustomizationChoice[]; help?: string }
  | { id: string; label: string; type: "checkbox"; required: false; priceDelta: number; help?: string };

/** What the customer picked: option id → text / choice label / true. */
export type CustomizationInput = Record<string, string | boolean>;

export type ProductImage = { id?: string; url: string; alt: string | null; width?: number | null; height?: number | null };

export type VariantView = {
  id: string;
  sku: string;
  title: string;
  options: Record<string, string>;
  price: number;
  salePrice: number | null;
  stock: number;
  trackInventory: boolean;
  available: boolean;
  lowStock: boolean;
};

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  material: string | null;
  price: number;
  salePrice: number | null;
  maxPrice: number;
  inStock: boolean;
  variantCount: number;
  imageUrl: string | null;
  imageAlt: string | null;
  hoverImageUrl: string | null;
  ratingAvg: number;
  ratingCount: number;
  isNew: boolean;
  isBestseller: boolean;
  isCustomizable: boolean;
};

export type ProductDetail = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string | null;
  description: string | null;
  category: { id: string; slug: string; name: string; parent: { slug: string; name: string } | null } | null;
  printTechnology: string | null;
  material: string | null;
  finish: string | null;
  colors: string[];
  dimensionsMm: { length: number | null; width: number | null; height: number | null };
  weightG: number | null;
  gstRate: number;
  hsnCode: string | null;
  specifications: { label: string; value: string }[];
  customization: CustomizationOption[];
  leadTimeDays: number;
  isFeatured: boolean;
  isBestseller: boolean;
  isNew: boolean;
  tags: string[];
  modelUrl: string | null;
  seoTitle: string | null;
  seoDescription: string | null;
  ratingAvg: number;
  ratingCount: number;
  images: ProductImage[];
  variants: VariantView[];
  /** Option axes in display order, e.g. { Size: ["Small","Large"], Color: [...] } */
  axes: { name: string; values: string[] }[];
  updatedAt: string;
};

export type CartLineView = {
  id: string;
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantTitle: string;
  sku: string;
  imageUrl: string | null;
  unitPrice: number;
  basePrice: number;
  compareAt: number | null;
  quantity: number;
  maxQuantity: number | null;
  customization: CustomizationInput;
  customizationLabels: { label: string; value: string }[];
  lineTotal: number;
  issue: string | null;
};
