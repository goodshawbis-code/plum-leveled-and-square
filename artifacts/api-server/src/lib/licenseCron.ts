import { db, tempLicensesTable, projectsTable } from "@workspace/db";
import { eq, and, isNull, lte, gte, sql } from "drizzle-orm";
import { sendLicenseWarningEmail } from "./email";
import { logger } from "./logger";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000;

export async function checkExpiringLicenses(): Promise<void> {
  logger.info("Running license expiry check...");

  const now = new Date();
  const warningWindowStart = new Date(now.getTime() + SEVEN_DAYS_MS - 60 * 60 * 1000);
  const warningWindowEnd = new Date(now.getTime() + SEVEN_DAYS_MS + 60 * 60 * 1000);

  try {
    const expiringLicenses = await db
      .select({
        id: tempLicensesTable.id,
        granteeEmail: tempLicensesTable.granteeEmail,
        granteeName: tempLicensesTable.granteeName,
        expiresAt: tempLicensesTable.expiresAt,
        projectId: tempLicensesTable.projectId,
        warningSentAt: tempLicensesTable.warningSentAt,
      })
      .from(tempLicensesTable)
      .where(
        and(
          eq(tempLicensesTable.isActive, true),
          isNull(tempLicensesTable.warningSentAt),
          gte(tempLicensesTable.expiresAt, warningWindowStart),
          lte(tempLicensesTable.expiresAt, warningWindowEnd),
        ),
      );

    logger.info({ count: expiringLicenses.length }, "Licenses expiring in ~7 days");

    for (const license of expiringLicenses) {
      const [project] = await db
        .select({ name: projectsTable.name })
        .from(projectsTable)
        .where(eq(projectsTable.id, license.projectId));

      const projectName = project?.name ?? "Your Project";
      const msUntilExpiry = license.expiresAt.getTime() - now.getTime();
      const daysUntilExpiry = Math.ceil(msUntilExpiry / (1000 * 60 * 60 * 24));

      const sent = await sendLicenseWarningEmail({
        to: license.granteeEmail,
        granteeName: license.granteeName,
        projectName,
        expiresAt: license.expiresAt,
        daysUntilExpiry,
      });

      if (sent.sent) {
        await db
          .update(tempLicensesTable)
          .set({ warningSentAt: new Date(), updatedAt: new Date() })
          .where(eq(tempLicensesTable.id, license.id));
      }
    }

    const expiredCount = await db
      .update(tempLicensesTable)
      .set({ isActive: false, updatedAt: new Date() })
      .where(
        and(
          eq(tempLicensesTable.isActive, true),
          lte(tempLicensesTable.expiresAt, now),
        ),
      );

    logger.info("License expiry check complete");
  } catch (err) {
    logger.error({ err }, "Error during license expiry check");
  }
}

export function startLicenseCron(): void {
  checkExpiringLicenses().catch((err) =>
    logger.error({ err }, "Initial license cron failed"),
  );

  setInterval(() => {
    checkExpiringLicenses().catch((err) =>
      logger.error({ err }, "License cron failed"),
    );
  }, CHECK_INTERVAL_MS);

  logger.info("License expiry cron started (runs every 24 hours)");
}
