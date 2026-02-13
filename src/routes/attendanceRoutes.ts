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
import {
  adminGetAllAttendanceSchema,
  approveRejectLeaveSchema,
  checkInCheckOutSchema,
  getMyAttendanceSchema,
  requestLeaveSchema,
} from "../validators/authValidators";
import role from "../middleware/checkRole";
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
  validate(getMyAttendanceSchema),
  getMyAttendance,
);

router.get(
  "/attendance/admin",
  checkAuth,
  role("ADMIN"),
  validate(adminGetAllAttendanceSchema),
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
  validate(approveRejectLeaveSchema),
  approveRejectLeave,
);
export default router;
