import { Router } from "express";
import { checkAuth } from "../middleware/checkAuth";
import {
  checkInCheckOut,
  adminGetAllAttendance,
  approveRejectLeave,
  getMyAttendance,
  requestLeave,
} from "../controllers/attendanceController";
import { validate } from "../middleware/validate";

import role from "../middleware/checkRole";
import {
  adminAttendanceSchema,
  LeaveSchema,
  AttendanceSchema,
  checkInCheckOutSchema,
  requestLeaveSchema,
} from "../validators/attendanceValidators";
const router = Router();

/**
 * @swagger
 * /api/v1/attendance/attendance:
 *   post:
 *     summary: Employee check-in / check-out
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - dateTime
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [CHECK_IN, CHECK_OUT]
 *                 example: CHECK_IN
 *               dateTime:
 *                 type: string
 *                 format: date-time
 *                 example: 2026-02-20T09:00:00.000Z
 *               notes:
 *                 type: string
 *                 example: Arrived at office
 *     responses:
 *       200:
 *         description: Attendance marked successfully
 *       400:
 *         description: Validation error
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Only employee)
 */

router.post(
  "/attendance",
  checkAuth,
  role("EMPLOYEE"),
  validate(checkInCheckOutSchema),
  checkInCheckOut,
);

/**
 * @swagger
 * /api/v1/attendance/attendance:
 *   get:
 *     summary: Get logged-in employee attendance
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         required: false
 *         example: 2
 *         description: Filter by month (1-12)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         required: false
 *         example: 2026
 *         description: Filter by year
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         required: false
 *         example: 1
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *         example: 20
 *         description: Records per page (default 20)
 *     responses:
 *       200:
 *         description: Attendance fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Only employee)
 */

router.get(
  "/attendance",
  checkAuth,
  role("EMPLOYEE"),
  validate(AttendanceSchema),
  getMyAttendance,
);

/**
 * @swagger
 * /api/v1/attendance/attendance/admin:
 *   get:
 *     summary: Admin get all employees attendance
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema:
 *           type: string
 *         required: false
 *         example: 698ecd5ceddd5a1e769d0f18
 *         description: Filter by employee ID
 *       - in: query
 *         name: month
 *         schema:
 *           type: integer
 *         required: false
 *         example: 2
 *         description: Filter by month (1-12)
 *       - in: query
 *         name: year
 *         schema:
 *           type: integer
 *         required: false
 *         example: 2026
 *         description: Filter by year
 *       - in: query
 *         name: from
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         example: 2026-02-01
 *         description: Start date filter
 *       - in: query
 *         name: to
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         example: 2026-02-28
 *         description: End date filter
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         required: false
 *         example: 1
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *         example: 20
 *         description: Records per page (default 20)
 *     responses:
 *       200:
 *         description: Attendance fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Only admin)
 */

router.get(
  "/attendance/admin",
  checkAuth,
  role("ADMIN"),
  validate(adminAttendanceSchema),
  adminGetAllAttendance,
);

/**
 * @swagger
 * /api/v1/attendance/attendance/leave:
 *   post:
 *     summary: Employee request leave
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - date
 *             properties:
 *               date:
 *                 type: string
 *                 format: date
 *                 example: 2026-02-25
 *               notes:
 *                 type: string
 *                 example: Sick leave
 *     responses:
 *       200:
 *         description: Leave requested successfully
 *       400:
 *         description: Leave already exists for this date
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Only employee)
 */

router.post(
  "/attendance/leave",
  checkAuth,
  role("EMPLOYEE"),
  validate(requestLeaveSchema),
  requestLeave,
);

/**
 * @swagger
 * /api/v1/attendance/attendance/leave/{id}:
 *   patch:
 *     summary: Admin approve or reject leave
 *     tags: [Attendance]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 699335e84480b08fef653e4f
 *         description: Leave record ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [APPROVED, REJECTED]
 *                 example: APPROVED
 *     responses:
 *       200:
 *         description: Leave status updated successfully
 *       404:
 *         description: Leave record not found
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Only admin)
 */

router.patch(
  "/attendance/leave/:id",
  checkAuth,
  role("ADMIN"),
  validate(LeaveSchema),
  approveRejectLeave,
);
export default router;
