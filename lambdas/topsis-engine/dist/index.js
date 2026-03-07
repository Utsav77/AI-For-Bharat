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

// lambdas/topsis-engine/index.ts
var index_exports = {};
__export(index_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(index_exports);
function runTOPSIS(options, criteria) {
  const n = options.length;
  const m = criteria.length;
  const matrix = options.map(
    (opt) => criteria.map((c) => Number(opt[c.key]) || 0)
  );
  const colNorms = criteria.map(
    (_, j) => Math.sqrt(matrix.reduce((sum, row) => sum + row[j] ** 2, 0))
  );
  const normalized = matrix.map(
    (row) => row.map((val, j) => colNorms[j] === 0 ? 0 : val / colNorms[j])
  );
  const weighted = normalized.map(
    (row) => row.map((val, j) => val * criteria[j].weight)
  );
  const idealBest = criteria.map((c, j) => {
    const colVals = weighted.map((row) => row[j]);
    return c.isBenefit ? Math.max(...colVals) : Math.min(...colVals);
  });
  const idealWorst = criteria.map((c, j) => {
    const colVals = weighted.map((row) => row[j]);
    return c.isBenefit ? Math.min(...colVals) : Math.max(...colVals);
  });
  const dPlus = weighted.map(
    (row) => Math.sqrt(row.reduce((sum, val, j) => sum + (val - idealBest[j]) ** 2, 0))
  );
  const dMinus = weighted.map(
    (row) => Math.sqrt(row.reduce((sum, val, j) => sum + (val - idealWorst[j]) ** 2, 0))
  );
  const scores = options.map((opt, i) => ({
    ...opt,
    topsis_score: dMinus[i] / (dPlus[i] + dMinus[i]),
    d_plus: dPlus[i],
    d_minus: dMinus[i]
  }));
  return scores.sort((a, b) => b.topsis_score - a.topsis_score);
}
var handler = async (event) => {
  const startTime = Date.now();
  if (event.warmup) return { statusCode: 200, body: { message: "warm" } };
  const { options, criteria: criteriaType } = event.agentResult.body;
  let criteriaConfig;
  if (criteriaType === "procurement") {
    criteriaConfig = [
      { key: "price_inr", weight: 0.35, isBenefit: false },
      { key: "delivery_days", weight: 0.25, isBenefit: false },
      { key: "rating", weight: 0.25, isBenefit: true },
      { key: "accepts_credit", weight: 0.15, isBenefit: true }
    ];
    options.forEach((o) => o.accepts_credit = o.accepts_credit ? 1 : 0);
  } else {
    criteriaConfig = [
      { key: "interest_rate", weight: 0.4, isBenefit: false },
      { key: "tenure_flexibility", weight: 0.35, isBenefit: true },
      { key: "prepayment_penalty", weight: 0.25, isBenefit: false }
    ];
  }
  const ranked = runTOPSIS(options, criteriaConfig);
  const t_topsis = Date.now() - startTime;
  console.log(JSON.stringify({ metric: "t_topsis", value: t_topsis }));
  return {
    statusCode: 200,
    body: {
      ranked_options: ranked,
      top_pick: ranked[0],
      criteria_used: criteriaConfig.map((c) => c.key),
      criteria_weights: Object.fromEntries(criteriaConfig.map((c) => [c.key, c.weight])),
      t_topsis
    }
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
