import { Router } from "express";
import { getProfile, login } from "../controllers/authorizationController";
import { checkAuth } from "../middleware/checkAuth";
import { loginSchema } from "../validators/authValidators";
import { validate } from "../middleware/validate";

const router = Router();

// POST /auth/login
router.post("/login", validate(loginSchema), login);
router.get("/get-profile", checkAuth, getProfile);

export default router;
