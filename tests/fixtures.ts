/** Données d'exemple : 1 véhicule, 3 mois d'activité. */
const V = "11111111-1111-1111-1111-111111111111";
export const vehicles = [
  { id: V, name: "Asaad 1", plate: "DK-1234-AB", model: "Leapmotor T03", color: "Blanc", active: true, purchase_price: 9_500_000, purchase_date: "2026-09-01", created_at: "2026-09-01T00:00:00Z" },
];
const mk = (i: number, day: string, hour: number, price: number, km: number, status = "completed", pm = "cash") => ({
  id: `b${i}`, reference: `LA-${String(i).padStart(4, "0")}`, created_at: `${day}T07:00:00Z`, customer_name: `Client ${i}`, customer_phone: "+221771234567",
  pickup_address: "Plateau, Dakar", pickup_lat: 14.67, pickup_lng: -17.43, pickup_note: null, dropoff_address: "Almadies", dropoff_lat: 14.74, dropoff_lng: -17.52,
  start_at: `${day}T${String(hour).padStart(2, "0")}:00:00Z`, blocked_until: `${day}T${String(hour + 1).padStart(2, "0")}:00:00Z`, passengers: 1, comment: null,
  distance_km: km, duration_min: 25, estimated_price: price, final_price: status === "completed" ? price : null, payment_method: status === "completed" ? pm : null,
  status, vehicle_id: null, driver_id: null, tracking_token: "x", driver_lat: null, driver_lng: null, driver_pos_at: null, paid_online: false, wave_session_id: null, ip_hash: null,
});
export const bookings = [
  mk(1, "2026-09-03", 9, 4200, 12), mk(2, "2026-09-10", 14, 2700, 7.3, "completed", "wave"), mk(3, "2026-09-18", 10, 15000, 45),
  mk(4, "2026-10-02", 8, 3500, 10, "completed", "orange_money"), mk(5, "2026-10-09", 16, 5100, 15), mk(6, "2026-10-20", 11, 2000, 5, "cancelled"),
  mk(7, "2026-10-25", 18, 15000, 46, "completed", "wave"), mk(8, "2026-11-04", 9, 4400, 13), mk(9, "2026-11-12", 12, 3000, 8, "no_show"), mk(10, "2026-11-18", 15, 6200, 19, "completed", "wave"),
];
export const expenses = [
  { id: "e1", spent_on: "2026-09-05", vehicle_id: V, category: "recharge", amount: 18000, payment_method: "wave", supplier: "Total Énergies", note: null, odometer_km: null, receipt_path: "x.jpg", source: "scan", created_at: "" },
  { id: "e2", spent_on: "2026-09-30", vehicle_id: null, category: "salaire", amount: 120000, payment_method: "cash", supplier: null, note: "Chauffeur septembre", odometer_km: null, receipt_path: null, source: "manuel", created_at: "" },
  { id: "e3", spent_on: "2026-10-12", vehicle_id: V, category: "entretien", amount: 35000, payment_method: "cash", supplier: "Garage Médina", note: null, odometer_km: 4200, receipt_path: null, source: "manuel", created_at: "" },
  { id: "e4", spent_on: "2026-10-15", vehicle_id: V, category: "recharge", amount: 21000, payment_method: "wave", supplier: null, note: null, odometer_km: null, receipt_path: null, source: "manuel", created_at: "" },
  { id: "e5", spent_on: "2026-10-31", vehicle_id: null, category: "salaire", amount: 120000, payment_method: "cash", supplier: null, note: null, odometer_km: null, receipt_path: null, source: "manuel", created_at: "" },
  { id: "e6", spent_on: "2026-11-08", vehicle_id: V, category: "recharge", amount: 19500, payment_method: "orange_money", supplier: null, note: null, odometer_km: null, receipt_path: null, source: "scan", created_at: "" },
  { id: "e7", spent_on: "2026-11-10", vehicle_id: V, category: "assurance", amount: 45000, payment_method: "wave", supplier: "AXA Sénégal", note: null, odometer_km: null, receipt_path: null, source: "manuel", created_at: "" },
];
export const incomes = [
  { id: "i1", earned_on: "2026-09-28", vehicle_id: V, source: "yango", amount: 185000, trips: 42, payment_method: "wave", note: "Relevé septembre", receipt_path: null, source_kind: "scan", created_at: "" },
  { id: "i2", earned_on: "2026-10-30", vehicle_id: V, source: "yango", amount: 212000, trips: 47, payment_method: "wave", note: null, receipt_path: null, source_kind: "manuel", created_at: "" },
  { id: "i3", earned_on: "2026-11-15", vehicle_id: V, source: "direct", amount: 60000, trips: 5, payment_method: "cash", note: "Mise à disposition mariage", receipt_path: null, source_kind: "manuel", created_at: "" },
];

/** Faux client Supabase : from(table).select().order() renvoie les données ci-dessus. */
export function fakeSupabase() {
  const data: Record<string, unknown[]> = { luxus_vehicles: vehicles, luxus_bookings: bookings, luxus_expenses: expenses, luxus_incomes: incomes };
  return {
    from(table: string) {
      const q = { select: () => q, order: () => Promise.resolve({ data: data[table] ?? [], error: null }) };
      return q;
    },
  } as never;
}
