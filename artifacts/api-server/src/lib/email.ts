import { logger } from "./logger";

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
  appUrl: string;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export async function sendLicenseWarningEmail(args: LicenseWarningEmailArgs): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn("RESEND_API_KEY not set — skipping warning email to " + args.to);
    return false;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

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

  try {
    const fromAddress = process.env.RESEND_FROM_EMAIL ?? "noreply@plumblevel.com";
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: args.to,
      subject: `⚠ Your project access expires in ${args.daysUntilExpiry} day${args.daysUntilExpiry !== 1 ? "s" : ""} — ${args.projectName}`,
      html,
    });
    if (error) {
      logger.error({ err: error }, "Resend API error sending warning email");
      return false;
    }
    logger.info({ to: args.to }, "License warning email sent");
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to send license warning email");
    return false;
  }
}

export async function sendLicenseInviteEmail(args: LicenseInviteEmailArgs): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    logger.warn("RESEND_API_KEY not set — skipping invite email to " + args.to);
    return false;
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const accessUrl = `${args.appUrl}/access/${args.accessToken}`;

  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
  <div style="background: #f97316; border-radius: 8px 8px 0 0; padding: 24px 32px;">
    <h1 style="color: white; margin: 0; font-size: 22px;">Plumb Level and Squared</h1>
    <p style="color: rgba(255,255,255,0.85); margin: 4px 0 0; font-size: 14px;">You've been granted project access</p>
  </div>
  <div style="background: white; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; padding: 32px;">
    <p style="font-size: 16px;">Hi ${args.granteeName},</p>
    <p>You've been granted temporary access to the project <strong>${args.projectName}</strong> on Plumb Level and Squared.</p>
    <p>Your access is valid until <strong>${formatDate(args.expiresAt)}</strong>.</p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${accessUrl}" style="background: #f97316; color: white; padding: 14px 32px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 16px; display: inline-block;">
        Access Your Project
      </a>
    </div>
    <p style="font-size: 13px; color: #6b7280;">Or copy this link: <a href="${accessUrl}" style="color: #f97316;">${accessUrl}</a></p>
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
    <p style="font-size: 13px; color: #9ca3af;">
      This invitation was generated by the Plumb Level and Squared project team. If you did not expect this, you can ignore this email.
    </p>
  </div>
</body>
</html>`;

  try {
    const fromAddress = process.env.RESEND_FROM_EMAIL ?? "noreply@plumblevel.com";
    const { error } = await resend.emails.send({
      from: fromAddress,
      to: args.to,
      subject: `You've been invited to access ${args.projectName}`,
      html,
    });
    if (error) {
      logger.error({ err: error }, "Resend API error sending invite email");
      return false;
    }
    logger.info({ to: args.to }, "License invite email sent");
    return true;
  } catch (err) {
    logger.error({ err }, "Failed to send license invite email");
    return false;
  }
}
