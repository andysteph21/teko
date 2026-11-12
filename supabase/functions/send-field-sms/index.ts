import { admin } from "../_shared/db.ts";
import { fieldSms } from "./handler.ts";

Deno.serve(fieldSms({
  secret: Deno.env.get("SEND_FIELD_SMS_HOOK_SECRET"),
  apiKey: Deno.env.get("ESMS_SMS_API_KEY"),
  sender: Deno.env.get("ESMS_SMS_SENDER"),
  async invited(phone) {
    const { data, error } = await admin().from("alpha_invites")
      .select("id").eq("phone", phone).eq("is_active", true).limit(1);
    if (error) throw error;
    return data.length === 1;
  },
}));
