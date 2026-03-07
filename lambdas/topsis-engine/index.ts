interface Option {
  [key: string]: any;
}

interface CriteriaConfig {
  key: string;
  weight: number;
  isBenefit: boolean;
}

function runTOPSIS(options: Option[], criteria: CriteriaConfig[]): any[] {
  const n = options.length;
  const m = criteria.length;

  // Step 1: Build decision matrix
  const matrix: number[][] = options.map(opt =>
    criteria.map(c => Number(opt[c.key]) || 0)
  );

  // Column norms
  const colNorms = criteria.map((_, j) =>
    Math.sqrt(matrix.reduce((sum, row) => sum + row[j] ** 2, 0))
  );

  // Normalized matrix
  const normalized = matrix.map(row =>
    row.map((val, j) => colNorms[j] === 0 ? 0 : val / colNorms[j])
  );

  // Step 2: Weighted normalized
  const weighted = normalized.map(row =>
    row.map((val, j) => val * criteria[j].weight)
  );

  // Step 3: Ideal best (A+) and worst (A-)
  const idealBest = criteria.map((c, j) => {
    const colVals = weighted.map(row => row[j]);
    return c.isBenefit ? Math.max(...colVals) : Math.min(...colVals);
  });

  const idealWorst = criteria.map((c, j) => {
    const colVals = weighted.map(row => row[j]);
    return c.isBenefit ? Math.min(...colVals) : Math.max(...colVals);
  });

  // Step 4: Euclidean distances
  const dPlus = weighted.map(row =>
    Math.sqrt(row.reduce((sum, val, j) => sum + (val - idealBest[j]) ** 2, 0))
  );

  const dMinus = weighted.map(row =>
    Math.sqrt(row.reduce((sum, val, j) => sum + (val - idealWorst[j]) ** 2, 0))
  );

  // Step 5: Closeness coefficient
  const scores = options.map((opt, i) => ({
    ...opt,
    topsis_score: dMinus[i] / (dPlus[i] + dMinus[i]),
    d_plus: dPlus[i],
    d_minus: dMinus[i]
  }));

  return scores.sort((a, b) => b.topsis_score - a.topsis_score);
}

export const handler = async (event: any) => {
  const startTime = Date.now();

  if (event.warmup) return { statusCode: 200, body: { message: "warm" } };

  const { options, criteria: criteriaType } = event.agentResult.body;

  let criteriaConfig: CriteriaConfig[];

  if (criteriaType === "procurement") {
    criteriaConfig = [
      { key: "price_inr", weight: 0.35, isBenefit: false },
      { key: "delivery_days", weight: 0.25, isBenefit: false },
      { key: "rating", weight: 0.25, isBenefit: true },
      { key: "accepts_credit", weight: 0.15, isBenefit: true }
    ];
    options.forEach((o: any) => o.accepts_credit = o.accepts_credit ? 1 : 0);
  } else {
    criteriaConfig = [
      { key: "interest_rate", weight: 0.40, isBenefit: false },
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
      criteria_used: criteriaConfig.map(c => c.key),
      criteria_weights: Object.fromEntries(criteriaConfig.map(c => [c.key, c.weight])),
      t_topsis
    }
  };
};
