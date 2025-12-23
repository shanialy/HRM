import { Router } from "express";
import { login, createEmployee } from "../controllers/authController";
import { checkAuth } from "../middleware/checkAuth";
import role from "../middleware/checkRole";

const router = Router();

// POST /auth/login
router.post("/login", login);
router.post("/employee", checkAuth, role("ADMIN"), createEmployee);

export default router;
