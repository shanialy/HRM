import { Router } from "express";
import {
  getProfile,
   login,
} from "../controllers/authorizationController";
import { checkAuth } from "../middleware/checkAuth";

// import { checkAuth } from "../middleware/checkAuth";
// import role from "../middleware/checkRole";

const router = Router();

// POST /auth/login
router.post("/login", login);
router.get("/get-profile", checkAuth, getProfile);



export default router;
