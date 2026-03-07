import { SFNClient, StartSyncExecutionCommand } from "@aws-sdk/client-sfn";

const sfn = new SFNClient({ region: "ap-south-1" });

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Max-Age": "300"
};

export const handler = async (event) => {
  console.log("Event received:", JSON.stringify(event));

  const method = event.requestContext?.http?.method || event.httpMethod || "";
  
  if (method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: ""
    };
  }

  try {
    const body = JSON.parse(event.body || "{}");
    console.log("Parsed body:", JSON.stringify(body));

    // Build Step Functions input — pass text if provided
    const sfnInput = {
      sessionId: body.sessionId || "session-" + Date.now(),
      language: body.language || "hi"
    };

    if (body.text || body.query) {
      // User typed or spoke text — pass it directly
      sfnInput.text = body.text || body.query;
    } else {
      // No text — use demo mode for stub
      sfnInput.demoMode = body.demoMode || "demo_procurement";
    }

    const result = await sfn.send(new StartSyncExecutionCommand({
      stateMachineArn: process.env.STATE_MACHINE_ARN,
      input: JSON.stringify(sfnInput)
    }));

    console.log("Step Functions status:", result.status);

    if (result.status !== "SUCCEEDED") {
      return {
        statusCode: 500,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: "Pipeline execution failed",
          status: result.status,
          cause: result.cause || "Unknown error"
        })
      };
    }

    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: result.output || JSON.stringify({ error: "No output returned" })
    };

  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({
        error: "Pipeline failed",
        message: error.message
      })
    };
  }
};
