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

// lambdas/safety-validator/index.ts
var index_exports = {};
__export(index_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(index_exports);
var handler = async (event) => {
  const startTime = Date.now();
  if (event.warmup) return { statusCode: 200, body: { message: "warm" } };
  const response = event.topsisResult?.body || {};
  const topPick = response.top_pick || {};
  let safetyScore = 1;
  const flags = [];
  if (topPick.max_amount && topPick.max_amount > 5e3) {
    if (!topPick.interest_rate) {
      safetyScore -= 0.3;
      flags.push("Loan > \u20B95000 without interest rate disclosure");
    }
  }
  const text = JSON.stringify(response).toLowerCase();
  if (text.includes("doctor") || text.includes("medicine") || text.includes("treatment")) {
    safetyScore -= 0.4;
    flags.push("Potential medical advice detected");
  }
  if (text.includes("guaranteed income") || text.includes("pakka kamaai")) {
    safetyScore -= 0.3;
    flags.push("Income guarantee language detected");
  }
  if (topPick.interest_rate && topPick.interest_rate > 36) {
    safetyScore -= 0.3;
    flags.push("Interest rate exceeds 36% \u2014 potential predatory lending");
  }
  const isSafe = safetyScore >= 0.8;
  const t_safety = Date.now() - startTime;
  console.log(JSON.stringify({ metric: "t_safety", value: t_safety }));
  return {
    statusCode: 200,
    body: {
      safety_score: Math.max(0, safetyScore),
      is_safe: isSafe,
      flags,
      framework: "CeRAI Legal Safety Framework (Prototype)",
      action: isSafe ? "PROCEED" : "HUMAN_REVIEW",
      t_safety
    }
  };
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});
