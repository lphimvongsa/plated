import "server-only";

function accountSid() {
  return process.env.TWILIO_ACCOUNT_SID?.trim() || "";
}

function authToken() {
  return process.env.TWILIO_AUTH_TOKEN?.trim() || "";
}

function fromNumber() {
  return process.env.TWILIO_FROM_NUMBER?.trim() || "";
}

function messagingServiceSid() {
  return process.env.TWILIO_MESSAGING_SERVICE_SID?.trim() || "";
}

export function smsOutboundConfigured() {
  return Boolean(accountSid().startsWith("AC") && authToken() && (fromNumber() || messagingServiceSid()));
}

function credentialError() {
  const sid = accountSid();
  if (sid && !sid.startsWith("AC")) {
    const kind =
      sid.startsWith("PN") ? "a phone number SID" :
      sid.startsWith("MG") ? "a messaging service SID" :
      sid.startsWith("SK") ? "an API key SID" :
      "the wrong identifier";
    return `TWILIO_ACCOUNT_SID is ${kind}. Twilio auth needs the Account SID from https://console.twilio.com — it starts with AC.`;
  }
  if (!sid || !authToken()) {
    return "Text sending is not configured. Add TWILIO_ACCOUNT_SID (starts with AC) and TWILIO_AUTH_TOKEN from the Twilio Console.";
  }
  if (!fromNumber() && !messagingServiceSid()) {
    return "Add TWILIO_FROM_NUMBER (E.164, like +14155550123) or TWILIO_MESSAGING_SERVICE_SID.";
  }
  return null;
}

export async function sendSms(input: {
  to: string;
  body: string;
}): Promise<{ id: string | null; error: string | null }> {
  const setupError = credentialError();
  if (setupError) return { id: null, error: setupError };

  const sid = accountSid();
  const token = authToken();
  const params = new URLSearchParams({ To: input.to, Body: input.body });
  if (messagingServiceSid()) params.set("MessagingServiceSid", messagingServiceSid());
  else params.set("From", fromNumber());

  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });
  const payload = (await response.json().catch(() => ({}))) as {
    sid?: string;
    code?: number;
    message?: string;
    error_message?: string;
  };
  if (!response.ok) {
    if (payload.code === 20003 || /invalid username|authenticate/i.test(payload.message || "")) {
      return {
        id: null,
        error: "Twilio rejected the Account SID/Auth Token. Copy both from the Twilio Console dashboard. Account SID must start with AC.",
      };
    }
    return { id: null, error: payload.message || payload.error_message || `Twilio returned ${response.status}.` };
  }
  return { id: payload.sid ?? null, error: null };
}
