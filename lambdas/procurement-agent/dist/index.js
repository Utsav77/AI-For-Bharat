"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// lambdas/procurement-agent/index.ts
var index_exports = {};
__export(index_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(index_exports);
var handler = async (event) => {
  const startTime = Date.now();
  if (event.warmup) return { statusCode: 200, body: { message: "warm" } };
  const mockOndcCatalog = [
    { providerId: "DEL-001", name: "Delhivery Express", price_inr: 450, delivery_days: 2, coverage_pincode: "560102", rating: 4.2, commission_pct: 3.5, accepts_credit: true },
    { providerId: "EKT-002", name: "Ekart Logistics", price_inr: 380, delivery_days: 3, coverage_pincode: "560102", rating: 4.5, commission_pct: 4, accepts_credit: true },
    { providerId: "LOC-003", name: "Karnataka Local Transport", price_inr: 280, delivery_days: 4, coverage_pincode: "560102", rating: 3.8, commission_pct: 2, accepts_credit: false },
    { providerId: "XPB-004", name: "XpressBees", price_inr: 520, delivery_days: 1, coverage_pincode: "560102", rating: 4.6, commission_pct: 5, accepts_credit: true },
    { providerId: "DTP-005", name: "DTDC Premium", price_inr: 410, delivery_days: 2, coverage_pincode: "560102", rating: 4, commission_pct: 3, accepts_credit: false },
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
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
