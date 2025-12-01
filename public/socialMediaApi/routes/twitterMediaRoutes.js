import express from "express";
import { twitterMediaController } from "../controllers/twitterMediaController.js";

const router = express.Router();

router.get("/media", twitterMediaController.fetchMedia);

export default router;
