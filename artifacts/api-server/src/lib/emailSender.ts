export const DEFAULT_RESEND_FROM_EMAIL =
  "Plumb Level and Square <invites@emetholdings.co>";

const RESEND_FROM_EMAIL_ERROR =
  'RESEND_FROM_EMAIL must be a valid email address at emetholdings.co, for example "Plumb Level and Square <invites@emetholdings.co>".';

export function resolveResendFromEmail(configured = process.env.RESEND_FROM_EMAIL): string {
  return configured?.trim() || DEFAULT_RESEND_FROM_EMAIL;
}

export function validateResendFromEmail(fromAddress: string): string | undefined {
  const value = fromAddress.trim();
  let emailAddress = value;

  if (value.includes("<") || value.includes(">")) {
    const namedAddress = /^([^<>]+?)\s*<([^<>]+)>$/.exec(value);
    if (!namedAddress || !namedAddress[1].trim()) return RESEND_FROM_EMAIL_ERROR;
    emailAddress = namedAddress[2].trim();
  }

  const email = /^([A-Z0-9.!#$%&'*+/=?^_`{|}~-]+)@([A-Z0-9.-]+)$/i.exec(emailAddress);
  if (!email) return RESEND_FROM_EMAIL_ERROR;

  const localPart = email[1];
  const domain = email[2].toLowerCase();
  if (
    domain !== "emetholdings.co" ||
    localPart.startsWith(".") ||
    localPart.endsWith(".") ||
    localPart.includes("..")
  ) {
    return RESEND_FROM_EMAIL_ERROR;
  }

  return undefined;
}

export function getResendFromEmailError(): string | undefined {
  return validateResendFromEmail(resolveResendFromEmail());
}
