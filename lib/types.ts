export type BookingStatus =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "no_show";

export type PaymentMethod = "cash" | "wave" | "orange_money";

export const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "En attente",
  confirmed: "Confirmée",
  in_progress: "En cours",
  completed: "Terminée",
  cancelled: "Annulée",
  no_show: "Client absent",
};

export const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "bg-amber-100 text-amber-900 border-amber-300",
  confirmed: "bg-sky-100 text-sky-900 border-sky-300",
  in_progress: "bg-violet-100 text-violet-900 border-violet-300",
  completed: "bg-emerald-100 text-emerald-900 border-emerald-300",
  cancelled: "bg-neutral-200 text-neutral-700 border-neutral-300",
  no_show: "bg-rose-100 text-rose-900 border-rose-300",
};

export const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cash: "Espèces",
  wave: "Wave",
  orange_money: "Orange Money",
};

/** Ligne unique de la table settings (noms de colonnes Postgres). */
export interface ContactLine {
  label: string;
  phone: string; // E.164 « +2217XXXXXXXX »
  whatsapp: boolean; // numéro joignable sur WhatsApp
}

export interface Settings {
  pickup_fee: number;
  price_per_km: number;
  min_fare: number;
  round_to: number;
  airport_enabled: boolean;
  airport_fixed_price: number;
  open_time: string; // "08:00:00"
  close_time: string; // "20:00:00"
  open_days: number[]; // 0 = dimanche
  slot_minutes: number;
  approach_minutes: number;
  margin_minutes: number;
  min_notice_minutes: number;
  max_days_ahead: number;
  vehicles: number;
  whatsapp_number: string;
  phone_number: string;
  max_active_per_phone: number;
  max_per_ip_per_day: number;
  contact_lines: ContactLine[];
}

export const DEFAULT_SETTINGS: Settings = {
  pickup_fee: 500,
  price_per_km: 300,
  min_fare: 1000,
  round_to: 100,
  airport_enabled: true,
  airport_fixed_price: 15000,
  open_time: "08:00:00",
  close_time: "20:00:00",
  open_days: [1, 2, 3, 4, 5, 6],
  slot_minutes: 30,
  approach_minutes: 30,
  margin_minutes: 15,
  min_notice_minutes: 60,
  max_days_ahead: 14,
  vehicles: 1,
  whatsapp_number: "+221770000000",
  phone_number: "+221770000000",
  max_active_per_phone: 3,
  max_per_ip_per_day: 6,
  contact_lines: [{ label: "Asaad 1", phone: "+221770000000", whatsapp: true }],
};

export interface Booking {
  id: string;
  reference: string;
  created_at: string;
  customer_name: string;
  customer_phone: string;
  pickup_address: string;
  pickup_lat: number;
  pickup_lng: number;
  pickup_note: string | null;
  dropoff_address: string;
  dropoff_lat: number;
  dropoff_lng: number;
  start_at: string;
  blocked_until: string;
  passengers: number;
  comment: string | null;
  distance_km: number;
  duration_min: number;
  estimated_price: number;
  final_price: number | null;
  payment_method: PaymentMethod | null;
  status: BookingStatus;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface Place extends LatLng {
  address: string;
}
