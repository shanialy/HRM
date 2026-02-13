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

router.post(
  "/attendance",
  checkAuth,
  role("EMPLOYEE"),
  validate(checkInCheckOutSchema),
  checkInCheckOut,
);

router.get(
  "/attendance",
  checkAuth,
  role("EMPLOYEE"),
  validate(AttendanceSchema),
  getMyAttendance,
);

router.get(
  "/attendance/admin",
  checkAuth,
  role("ADMIN"),
  validate(adminAttendanceSchema),
  adminGetAllAttendance,
);

router.post(
  "/attendance/leave",
  checkAuth,
  role("EMPLOYEE"),
  validate(requestLeaveSchema),
  requestLeave,
);

router.patch(
  "/attendance/leave/:id",
  checkAuth,
  role("ADMIN"),
  validate(LeaveSchema),
  approveRejectLeave,
);
export default router;
