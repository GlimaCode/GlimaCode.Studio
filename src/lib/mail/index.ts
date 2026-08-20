/**
 * Mail delivery.
 *
 * Deliberately provider-agnostic and configured entirely from the
 * environment, because which service sends our mail is not settled and the
 * sender address changes the day hello@glimacode.com exists. Nothing above
 * this module knows who delivers anything.
 *
 *   MAIL_PROVIDER   none | resend        (default: none)
 *   MAIL_FROM       sender address       e.g. "GlimaCode <onboarding@resend.dev>"
 *   MAIL_TO         recipient            (default: the studio address in config)
 *   MAIL_API_KEY    provider credential
 *
 * With no provider configured the message is logged and reported as not
 * delivered. That is the right default: a preview deployment must never send
 * real mail, and a missing key should not look like success.
 *
 * Adding a provider means adding a branch here. SMTP would need a client
 * library, which is a dependency decision rather than a coding one, so it is
 * not assumed.
 */

import { siteConfig } from "@/config/site";

export type MailMessage = {
  subject: string;
  text: string;
  /** Lets a reply go straight to the visitor rather than to us. */
  replyTo?: string;
};

export type MailResult = {
  delivered: boolean;
  provider: string;
  /** Present when delivery was attempted and failed. */
  error?: string;
};

function provider(): string {
  return (process.env.MAIL_PROVIDER ?? "none").trim().toLowerCase();
}

function recipient(): string {
  return process.env.MAIL_TO?.trim() || siteConfig.email;
}

async function sendWithResend(message: MailMessage): Promise<MailResult> {
  const key = process.env.MAIL_API_KEY?.trim();
  const from = process.env.MAIL_FROM?.trim();

  if (!key || !from) {
    return {
      delivered: false,
      provider: "resend",
      error: "MAIL_API_KEY or MAIL_FROM is not set",
    };
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [recipient()],
        subject: message.subject,
        text: message.text,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
    });

    if (!response.ok) {
      const detail = await response.text();
      return {
        delivered: false,
        provider: "resend",
        error: `HTTP ${response.status}: ${detail.slice(0, 200)}`,
      };
    }
    return { delivered: true, provider: "resend" };
  } catch (cause) {
    return {
      delivered: false,
      provider: "resend",
      error: cause instanceof Error ? cause.message : String(cause),
    };
  }
}

export async function sendMail(message: MailMessage): Promise<MailResult> {
  switch (provider()) {
    case "resend":
      return sendWithResend(message);
    case "none":
      console.info(
        `[mail] no provider configured; would have sent to ${recipient()}: ${message.subject}`,
      );
      return { delivered: false, provider: "none" };
    default:
      return {
        delivered: false,
        provider: provider(),
        error: `Unknown MAIL_PROVIDER "${provider()}"`,
      };
  }
}
