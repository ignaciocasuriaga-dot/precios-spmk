export interface Product {
  id: string;
  name: string;
  brand: string;
  supermarket: string;
  publishedPrice: number;
  regularPrice: number | null;
  offerPrice: number | null;
  discount: number | null;
  pvpSugerido: number | null;
  gapPercent: number | null;
  url: string;
  imageUrl: string;
  scrapedAt: string;
}

export interface PriceHistoryEntry {
  date: string;
  productId: string;
  name: string;
  brand: string;
  supermarket: string;
  price: number;
}

export interface Alert {
  id: number;
  productId: string;
  productName: string;
  supermarket: string;
  brand: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  type: 'increase' | 'decrease';
  createdAt: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'user';
  createdAt: string;
}
