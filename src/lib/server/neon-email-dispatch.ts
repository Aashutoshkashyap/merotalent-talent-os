import { after } from "next/server";
import { neonEmailPolicy } from "./neon-delivery-policy";
import { dispatchNeonQueuedEmails } from "./neon-email-queue";

/** Run after the committed mutation/response; durable leases and cron own retries. */
export function scheduleNeonEmailDelivery(environment: Record<string,string|undefined> = process.env) {
  try {
    if (!environment.CRON_SECRET || !neonEmailPolicy(environment).enabled) return false;
    after(async()=>{
      try {
        const result=await dispatchNeonQueuedEmails(`Bearer ${environment.CRON_SECRET}`,10,{environment});
        console.info(JSON.stringify({event:"neon_transactional_email_dispatch",...result}));
      } catch { console.error(JSON.stringify({event:"neon_transactional_email_deferred",retry:"durable_queue"})); }
    });
    return true;
  } catch { return false; } // Outside a Next request, the durable cron queue still works.
}
