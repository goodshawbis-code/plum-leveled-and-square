import http from "http";
import { Router, type IRouter, type Request, type Response } from "express";

const router: IRouter = Router();

const PIPELINE_PORT = parseInt(process.env.PORT_BLUEPRINT ?? "8099", 10);

function proxyToPipeline(req: Request, res: Response, path: string) {
  const options: http.RequestOptions = {
    hostname: "localhost",
    port: PIPELINE_PORT,
    path,
    method: req.method,
    headers: {
      ...req.headers,
      host: `localhost:${PIPELINE_PORT}`,
    },
  };

  const proxy = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode ?? 502, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxy.on("error", () => {
    if (!res.headersSent) {
      res.status(502).json({
        error: "Blueprint pipeline is starting up — please try again in a moment.",
      });
    }
  });

  req.pipe(proxy, { end: true });
}

router.get("/blueprint-pipeline/health", (req, res) => {
  proxyToPipeline(req, res, "/health");
});

router.post("/blueprint-pipeline/process", (req, res) => {
  proxyToPipeline(req, res, "/analyze");
});

export default router;
