import app from "./app";
import { logger } from "./lib/logger";
import { startLicenseCron } from "./lib/licenseCron";

async function initStripe() {
  const appDomain = process.env.APP_DOMAIN ?? "localhost";
  const webhookUrl = appDomain === "localhost"
    ? `http://localhost:${process.env.PORT}/api/stripe/webhook`
    : `https://${appDomain}/api/stripe/webhook`;

  logger.info({ webhookUrl }, "Stripe webhook URL configured (register manually in Stripe Dashboard)");
}

const rawPort = process.env["PORT"];
if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}

const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

await initStripe();

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  startLicenseCron();
});
