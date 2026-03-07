import { DynamoDBClient, GetItemCommand } from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient({ region: "ap-south-1" });

function computeCreditScore(profile: any): { eligibility: string; max_loan_inr: number; score: number } {
  let score = 0;

  const avgMonthly = profile.avg_monthly_transactions_inr || 0;
  if (avgMonthly > 15000) score += 30;
  else if (avgMonthly > 8000) score += 20;
  else score += 10;

  const stddev = profile.transaction_consistency_stddev || 10000;
  if (stddev < 3000) score += 30;
  else if (stddev < 5000) score += 20;
  else score += 10;

  const creds = profile.credential_count || 0;
  score += Math.min(creds * 7, 20);

  const months = profile.ondc_registration_months || 0;
  if (months >= 6) score += 20;
  else if (months >= 3) score += 12;
  else score += 5;

  let eligibility: string, max_loan: number;
  if (score >= 70) { eligibility = "HIGH"; max_loan = 25000; }
  else if (score >= 45) { eligibility = "MEDIUM"; max_loan = 10000; }
  else { eligibility = "LOW"; max_loan = 2000; }

  return { eligibility, max_loan_inr: max_loan, score };
}

export const handler = async (event: any) => {
  const startTime = Date.now();

  if (event.warmup) return { statusCode: 200, body: { message: "warm" } };

  const profileResult = await dynamo.send(new GetItemCommand({
    TableName: "shramsetu-worker-profiles",
    Key: { workerId: { S: "RAVI_001" } }
  }));

  const profile = profileResult.Item;
  const creditScore = computeCreditScore({
    avg_monthly_transactions_inr: Number(profile?.avg_monthly_transactions_inr?.N || 0),
    transaction_consistency_stddev: Number(profile?.transaction_consistency_stddev?.N || 0),
    credential_count: Number(profile?.credential_count?.N || 0),
    ondc_registration_months: Number(profile?.ondc_registration_months?.N || 0)
  });

  const mockLenders = [
    { lenderId: "OCEN-L1", name: "NanoFin Microloan", interest_rate: 12.5, tenure_flexibility: 0.9, prepayment_penalty: 0, max_amount: 10000, disbursement_time_hrs: 2 },
    { lenderId: "OCEN-L2", name: "StreetCredit Finance", interest_rate: 15.0, tenure_flexibility: 0.7, prepayment_penalty: 2.5, max_amount: 25000, disbursement_time_hrs: 4 },
    { lenderId: "OCEN-L3", name: "Jan Dhan Micro", interest_rate: 10.0, tenure_flexibility: 0.5, prepayment_penalty: 5.0, max_amount: 5000, disbursement_time_hrs: 1 },
    { lenderId: "OCEN-L4", name: "ONDC Credit Co-op", interest_rate: 11.0, tenure_flexibility: 0.85, prepayment_penalty: 1.0, max_amount: 15000, disbursement_time_hrs: 3 }
  ];

  const eligible = mockLenders.filter(l => l.max_amount >= 1000);

  const t_agent = Date.now() - startTime;
  console.log(JSON.stringify({ metric: "t_credit_agent", value: t_agent }));

  return {
    statusCode: 200,
    body: {
      source: "OCEN Sandbox Mock (Flow-Based Credit)",
      credit_assessment: creditScore,
      options: eligible,
      criteria: "credit",
      criteria_weights: { interest_rate: 0.4, tenure_flexibility: 0.35, prepayment_penalty: 0.25 },
      worker_profile_summary: {
        months_active: Number(profile?.ondc_registration_months?.N || 0),
        avg_monthly_inr: Number(profile?.avg_monthly_transactions_inr?.N || 0),
        credit_band: creditScore.eligibility
      }
    }
  };
};
