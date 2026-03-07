export const handler = async (event: any) => {
  const startTime = Date.now();

  if (event.warmup) return { statusCode: 200, body: { message: "warm" } };

  // Mock ONDC Catalog (Beckn Protocol Sandbox)
  const mockOndcCatalog = [
    { providerId: "DEL-001", name: "Delhivery Express", price_inr: 450, delivery_days: 2, coverage_pincode: "560102", rating: 4.2, commission_pct: 3.5, accepts_credit: true },
    { providerId: "EKT-002", name: "Ekart Logistics", price_inr: 380, delivery_days: 3, coverage_pincode: "560102", rating: 4.5, commission_pct: 4.0, accepts_credit: true },
    { providerId: "LOC-003", name: "Karnataka Local Transport", price_inr: 280, delivery_days: 4, coverage_pincode: "560102", rating: 3.8, commission_pct: 2.0, accepts_credit: false },
    { providerId: "XPB-004", name: "XpressBees", price_inr: 520, delivery_days: 1, coverage_pincode: "560102", rating: 4.6, commission_pct: 5.0, accepts_credit: true },
    { providerId: "DTP-005", name: "DTDC Premium", price_inr: 410, delivery_days: 2, coverage_pincode: "560102", rating: 4.0, commission_pct: 3.0, accepts_credit: false },
    { providerId: "LOC-006", name: "Namma Cargo Co-op", price_inr: 320, delivery_days: 3, coverage_pincode: "560102", rating: 3.5, commission_pct: 1.5, accepts_credit: true },
    { providerId: "SHR-007", name: "ShipRocket Economy", price_inr: 350, delivery_days: 4, coverage_pincode: "560102", rating: 4.1, commission_pct: 3.2, accepts_credit: false }
  ];

  const t_agent = Date.now() - startTime;
  console.log(JSON.stringify({ metric: "t_procurement_agent", value: t_agent }));

  return {
    statusCode: 200,
    body: {
      source: "ONDC Sandbox Mock (Beckn Protocol)",
      options: mockOndcCatalog,
      query_context: event.intent?.body?.entities || {},
      criteria: "procurement",
      criteria_weights: { price: 0.35, delivery_time: 0.25, rating: 0.25, credit_availability: 0.15 }
    }
  };
};
