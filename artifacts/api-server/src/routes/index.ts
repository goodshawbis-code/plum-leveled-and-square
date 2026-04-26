import { Router, type IRouter } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import blueprintsRouter from "./blueprints";
import segmentsRouter from "./segments";
import materialsRouter from "./materials";
import vendorsRouter from "./vendors";
import bidsRouter from "./bids";
import estimatesRouter from "./estimates";
import dashboardRouter from "./dashboard";
import storageRouter from "./storage";
import stripeRouter from "./stripe";
import commentsRouter from "./comments";
import rfisRouter from "./rfis";
import licensesRouter from "./licenses";

const router: IRouter = Router();

router.use(healthRouter);
router.use(stripeRouter);
router.use(projectsRouter);
router.use(blueprintsRouter);
router.use(segmentsRouter);
router.use(materialsRouter);
router.use(vendorsRouter);
router.use(bidsRouter);
router.use(estimatesRouter);
router.use(dashboardRouter);
router.use(storageRouter);
router.use(commentsRouter);
router.use(rfisRouter);
router.use(licensesRouter);

export default router;
