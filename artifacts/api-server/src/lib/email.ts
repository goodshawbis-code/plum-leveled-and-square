import { logger } from "./logger";
import { getResendFromEmailError, resolveResendFromEmail } from "./emailSender";

export const PLS_INVITE_PAGE_URL = "https://plumb-leveled-and-square.superapp.now/";

export type EmailSendResult =
  | { sent: true }
  | { sent: false; error: string };

async function sendEmail(
  to: string,
  subject: string,
  html: string,
  logContext: string,
): Promise<EmailSendResult> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const error = "Email was not sent because RESEND_API_KEY is not configured.";
    logger.warn({ to }, error);
    return { sent: false, error };
  }

  const senderError = getResendFromEmailError();
  if (senderError) {
    logger.error({ setting: "RESEND_FROM_EMAIL" }, senderError);
    return { sent: false, error: senderError };
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: resolveResendFromEmail(),
      to,
      subject,
      html,
    });

    if (error) {
      logger.error({ err: error }, `Resend API error ${logContext}`);
      return {
        sent: false,
        error: "Resend rejected the email. Check RESEND_FROM_EMAIL and verify emetholdings.co in Resend.",
      };
    }

    logger.info({ to }, `${logContext} email sent`);
    return { sent: true };
  } catch (err) {
    logger.error({ err }, `Failed to send ${logContext} email`);
    return {
      sent: false,
      error: "Email delivery failed unexpectedly. Check the API server logs and Resend configuration.",
    };
  }
}

interface LicenseWarningEmailArgs {
  to: string;
  granteeName: string;
  projectName: string;
  expiresAt: Date;
  daysUntilExpiry: number;
}

interface LicenseInviteEmailArgs {
  to: string;
  granteeName: string;
  projectName: string;
  accessToken: string;
  expiresAt: Date;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export async function sendLicenseWarningEmail(args: LicenseWarningEmailArgs): Promise<EmailSendResult> {
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #f97316; border-radius: 8px 8px 0 0; padding: 24px 32px;">
    <h1 style="color: white; margin: 0; font-size: 22px;">Plumb Level and Squared</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 14px;">Project Access Notification</p>
  </div>
  <div style="background: white; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 32px;">
    <p style="font-size: 16px;">Hi ${args.granteeName},</p>
    <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 16px 20px; margin: 20px 0;">
      <strong style="color: #92400e;">⚠ Your temporary access expires in ${args.daysUntilExpiry} day${args.daysUntilExpiry !== 1 ? "s" : ""}</strong>
    </div>
    <p>Your temporary project access to <strong>${args.projectName}</strong> will expire on <strong>${formatDate(args.expiresAt)}</strong>.</p>
    <p>Please log in as soon as possible to:</p>
    <ul style="color: #555; line-height: 1.8;">
      <li>Download any project files, bids, or communication history you need for your records</li>
      <li>Save any RFIs, field comments, or blueprint markups</li>
      <li>Export estimates or material takeoffs</li>
    </ul>
    <p>After ${formatDate(args.expiresAt)}, your access will be restricted unless a subscription is purchased.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <p style="font-size: 13px; color: #9ca3af;">
      This is an automated notification from Plumb Level and Squared. If you believe you received this in error, please contact your project manager.
    </p>
  </div>
</body>
</html>`;

  return sendEmail(
    args.to,
    `⚠ Your project access expires in ${args.daysUntilExpiry} day${args.daysUntilExpiry !== 1 ? "s" : ""} — ${args.projectName}`,
    html,
    "license warning",
  );
}

export async function sendLicenseInviteEmail(args: LicenseInviteEmailArgs): Promise<EmailSendResult> {
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #f97316; border-radius: 8px 8px 0 0; padding: 24px 32px;">
    <h1 style="color: white; margin: 0; font-size: 22px;">Plumb Level and Squared</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 14px;">Your project invitation</p>
  </div>
  <div style="background: white; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 32px;">
    <p style="font-size: 16px;">Hi ${args.granteeName},</p>
    <p>You've been invited to access the project <strong>${args.projectName}</strong> on Plumb Level and Squared.</p>
    <p>Your invitation code is <strong style="font-size: 18px; letter-spacing: 1px;">${args.accessToken}</strong>.</p>
    <p>This invitation is valid until <strong>${formatDate(args.expiresAt)}</strong>.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${PLS_INVITE_PAGE_URL}" style="background: #f97316; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
        Open Plumb Level and Square
      </a>
    </div>
    <p style="font-size: 13px; color: #6b7280;">Open the PLS page and keep this code handy. To finish setting up access, contact the person who sent you this invitation.</p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <p style="font-size: 13px; color: #9ca3af;">
      This invitation was generated by the Plumb Level and Squared project team. If you did not expect this, you can ignore this email.
    </p>
  </div>
</body>
</html>`;

  return sendEmail(
    args.to,
    `You've been invited to access ${args.projectName}`,
    html,
    "license invite",
  );
}
