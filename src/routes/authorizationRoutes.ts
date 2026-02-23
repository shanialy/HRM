import { Router } from "express";
import {
  getProfile,
  login,
  changePassword,
  forgotPassword,
  resetPassword,
} from "../controllers/authorizationController";
import { checkAuth } from "../middleware/checkAuth";
import {
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/authValidators";
import { validate } from "../middleware/validate";

const router = Router();

// POST /auth/login
/**
 * @swagger
 * /api/v1/authorization/login:
 *   post:
 *     summary: Login user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: admin@gmail.com
 *               password:
 *                 type: string
 *                 example: Password@12
 *     responses:
 *       200:
 *         description: User logged in successfully
 */

router.post("/login", validate(loginSchema), login);
/**
 * @swagger
 * /api/v1/authorization/get-profile:
 *   get:
 *     summary: Get logged in user profile
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Profile fetched successfully
 *       401:
 *         description: Unauthorized
 */

router.get("/get-profile", checkAuth, getProfile);

router.post(
  "/change-password",
  checkAuth,
  validate(changePasswordSchema),
  changePassword,
);
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

export default router;
