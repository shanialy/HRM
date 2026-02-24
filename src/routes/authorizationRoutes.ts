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

/**
 * @swagger
 * /api/v1/authorization/change-password:
 *   post:
 *     summary: Change user password
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 example: OldPassword@12
 *               newPassword:
 *                 type: string
 *                 example: NewPassword@123
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       401:
 *         description: Unauthorized
 */
router.post(
  "/change-password",
  checkAuth,
  validate(changePasswordSchema),
  changePassword,
);

/**
 * @swagger
 * /api/v1/authorization/forgot-password:
 *   post:
 *     summary: Send OTP to user email for password reset
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@gmail.com
 *     responses:
 *       200:
 *         description: OTP sent to email
 */
router.post("/forgot-password", validate(forgotPasswordSchema), forgotPassword);

/**
 * @swagger
 * /api/v1/authorization/reset-password:
 *   post:
 *     summary: Reset password using OTP
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 example: user@gmail.com
 *               otp:
 *                 type: string
 *                 example: 123456
 *               newPassword:
 *                 type: string
 *                 example: NewPassword@123
 *     responses:
 *       200:
 *         description: Password reset successfully
 */
router.post("/reset-password", validate(resetPasswordSchema), resetPassword);

export default router;
