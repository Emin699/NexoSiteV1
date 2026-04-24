import { Router, type IRouter } from "express";
import healthRouter from "./health";
import usersRouter from "./users";
import productsRouter from "./products";
import cartRouter from "./cart";
import ordersRouter from "./orders";
import walletRouter from "./wallet";
import wheelRouter from "./wheel";
import loyaltyRouter from "./loyalty";
import referralRouter from "./referral";
import jackpotRouter from "./jackpot";
import tiersRouter from "./tiers";
import adminRouter from "./admin";
import authRouter from "./auth";
import reviewsRouter from "./reviews";
import paypalRouter from "./paypal";
import ticketsRouter from "./tickets";

const router: IRouter = Router();

router.use(healthRouter);
router.use(usersRouter);
router.use(productsRouter);
router.use(cartRouter);
router.use(ordersRouter);
router.use(walletRouter);
router.use(wheelRouter);
router.use(loyaltyRouter);
router.use(referralRouter);
router.use(jackpotRouter);
router.use(tiersRouter);
router.use(adminRouter);
router.use(authRouter);
router.use(reviewsRouter);
router.use(paypalRouter);
router.use(ticketsRouter);

export default router;
