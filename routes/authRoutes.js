import express from "express";
import { login, me, register } from "../controllers/authController.js";
import { rateLimiter, requireAuth, validateRegister } from "../middleware/auth.js";

const router = express.Router();

router.post("/register", rateLimiter, validateRegister, register);
router.post("/login", rateLimiter, login);
router.get("/me", requireAuth, me);

export default router;
