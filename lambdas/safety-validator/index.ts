export const handler = async (event: any) => {
  const startTime = Date.now();

  if (event.warmup) return { statusCode: 200, body: { message: "warm" } };

  const response = event.topsisResult?.body || {};
  const topPick = response.top_pick || {};
  let safetyScore = 1.0;
  const flags: string[] = [];

  // CeRAI Legal Safety Framework — Prototype Heuristics

  // Check 1: Loan amount disclosure
  if (topPick.max_amount && topPick.max_amount > 5000) {
    if (!topPick.interest_rate) {
      safetyScore -= 0.3;
      flags.push("Loan > ₹5000 without interest rate disclosure");
    }
  }

  // Check 2: No medical advice
  const text = JSON.stringify(response).toLowerCase();
  if (text.includes("doctor") || text.includes("medicine") || text.includes("treatment")) {
    safetyScore -= 0.4;
    flags.push("Potential medical advice detected");
  }

  // Check 3: No income guarantees
  if (text.includes("guaranteed income") || text.includes("pakka kamaai")) {
    safetyScore -= 0.3;
    flags.push("Income guarantee language detected");
  }

  // Check 4: Unreasonable interest rates
  if (topPick.interest_rate && topPick.interest_rate > 36) {
    safetyScore -= 0.3;
    flags.push("Interest rate exceeds 36% — potential predatory lending");
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
