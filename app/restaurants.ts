export interface Review {
  author_name: string;
  author_url: string;
  language: string;
  original_language: string;
  profile_photo_url: string;
  rating: number;
  relative_time_description: string;
  text: string;
  time: number;
  translated: boolean;
}

export interface Detail {
  name: string;
  place_id: string;
  rating: number;
  reviews: Review[];
  serves_beer: boolean;
  serves_breakfast: boolean;
  serves_dinner: boolean;
  serves_wine: boolean;
  url: string;
  user_ratings_total: number;
}

export interface Location {
  lat: number;
  lng: number;
}

export interface Viewport {
  northeast: Location;
  southwest: Location;
}

export interface Geometry {
  location: Location;
  viewport: Viewport;
}

export interface Photo {
  height: number;
  html_attributions: string[];
  photo_reference: string;
  width: number;
}

export interface PlusCode {
  compound_code: string;
  global_code: string;
}

export interface OpeningHours {
  open_now: boolean;
}

export interface Place {
  business_status: string;
  geometry: Geometry;
  icon: string;
  icon_background_color: string;
  icon_mask_base_uri: string;
  name: string;
  opening_hours: OpeningHours;
  photos: Photo[];
  place_id: string;
  plus_code: PlusCode;
  price_level: number;
  rating: number;
  reference: string;
  scope: string;
  types: string[];
  user_ratings_total: number;
  vicinity: string;
  bayesianRating: number;
}

export interface Ai {
  score: number;
  reason: string;
  bestDish: string;
}

export interface Restaurant {
  id: string;
  name: string;
  detail: Detail;
  place: Place;
  ai: Ai;
  bayesianRating: number;
}
