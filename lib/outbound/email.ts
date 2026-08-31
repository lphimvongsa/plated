import "server-only";
import nodemailer from "nodemailer";

function gmailUser() {
  return process.env.GMAIL_USER?.trim() || "";
}

function gmailPassword() {
  return (process.env.GMAIL_APP_PASSWORD ?? "").replace(/\s+/g, "");
}

function gmailFrom() {
  return process.env.GMAIL_FROM?.trim() || gmailUser();
}

export function emailOutboundConfigured() {
  return Boolean(gmailUser() && gmailPassword());
}

function fromHeader(displayName?: string | null) {
  const raw = gmailFrom();
  if (raw.includes("<")) return raw;
  const name = (displayName?.trim() || "plated.").replace(/"/g, "").slice(0, 80);
  return `"${name}" <${raw}>`;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
  text: string;
  fromName?: string | null;
  replyTo?: string | null;
  ics?: { filename: string; content: string };
}): Promise<{ id: string | null; error: string | null }> {
  const user = gmailUser();
  const pass = gmailPassword();
  if (!user || !pass) {
    return {
      id: null,
      error: "Email sending is not configured. Add GMAIL_USER and GMAIL_APP_PASSWORD.",
    };
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: { user, pass },
  });

  try {
    const info = await transporter.sendMail({
      from: fromHeader(input.fromName),
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
      replyTo: input.replyTo || user,
      headers: {
        "X-Mailer": "plated.",
      },
      attachments: input.ics
        ? [
            {
              filename: input.ics.filename,
              content: Buffer.from(input.ics.content),
              contentType: "text/calendar; charset=utf-8; method=PUBLISH",
            },
          ]
        : undefined,
    });
    return { id: info.messageId ?? null, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gmail SMTP could not send this email.";
    return { id: null, error: message };
  }
}
