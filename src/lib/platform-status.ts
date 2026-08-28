import { pingDatabase } from "./db";
import { useJsonStore } from "./config";
import { hasGemini, hasResend, hasStripe } from "./integrations";

export async function platformStatus() {
  let database: "ok" | "error" | "json" = "error";
  let databaseDetail = "";
  if (useJsonStore()) {
    database = "json";
  } else {
    try {
      await pingDatabase();
      database = "ok";
    } catch (error) {
      database = "error";
      databaseDetail = error instanceof Error ? error.message : "unreachable";
    }
  }
  return {
    database,
    databaseDetail,
    stripe: hasStripe(),
    gemini: hasGemini(),
    resend: hasResend(),
    appUrl: (process.env.NEXT_PUBLIC_APP_URL || "").trim(),
  };
}
