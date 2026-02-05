import { Router } from "express";
import { checkAuth } from "../middleware/checkAuth";
import { checkInCheckOut } from "../controllers/attendanceController";
import { getMyAttendance } from "../controllers/attendanceController";
import { adminGetAllAttendance } from "../controllers/attendanceController";
import { requestLeave } from "../controllers/attendanceController";
import { approveRejectLeave } from "../controllers/attendanceController";

const router = Router();


router.post("/attendance", checkAuth, checkInCheckOut);
router.get("/attendance", checkAuth, getMyAttendance);
router.get("/attendance/admin", checkAuth, adminGetAllAttendance);
router.post("/attendance/leave", checkAuth, requestLeave);
router.patch("/attendance/leave/:id", checkAuth, approveRejectLeave);
export default router;