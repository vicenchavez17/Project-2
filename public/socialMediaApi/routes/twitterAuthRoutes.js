import express from "express";
import { twitterAuthController } from "../controllers/twitterAuthController.js";

const router = express.Router();

router.get("/auth", twitterAuthController.beginAuth);
router.get("/callback", twitterAuthController.handleCallback);

export default router;
