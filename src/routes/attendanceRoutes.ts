import { Router } from "express";
import { checkAuth } from "../middleware/checkAuth";
import {
  checkInCheckOut,
  adminGetAllAttendance,
  approveRejectLeave,
  getMyAttendance,
  requestLeave,
} from "../controllers/attendanceController";

const router = Router();

router.post("/attendance", checkAuth, checkInCheckOut);
router.get("/attendance", checkAuth, getMyAttendance);
router.get("/attendance/admin", checkAuth, adminGetAllAttendance);
router.post("/attendance/leave", checkAuth, requestLeave);
router.patch("/attendance/leave/:id", checkAuth, approveRejectLeave);
export default router;
