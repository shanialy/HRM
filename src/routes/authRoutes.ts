import { Router } from "express";
import {
  createEmployee,
  getProfile,
  getAllEmployees,
  getSingleEmployee,
  login,
  changeEmployeeStatus,
  updateEmployee,
} from "../controllers/authController";
import { checkAuth } from "../middleware/checkAuth";
import { checkInCheckOut } from "../controllers/attenController";
import { getMyAttendance } from "../controllers/attenController";
import { adminGetAllAttendance } from "../controllers/attenController";
import { requestLeave } from "../controllers/attenController";
import { approveRejectLeave } from "../controllers/attenController";

// import { checkAuth } from "../middleware/checkAuth";
// import role from "../middleware/checkRole";

const router = Router();

// POST /auth/login
router.post("/login", login);
router.get("/get-profile", checkAuth, getProfile);
router.post("/createEmployee", checkAuth, createEmployee);
router.get("/getAllEmployees", checkAuth, getAllEmployees);
router.get("/employees/:id", checkAuth, getSingleEmployee);
router.put("/employees/:id", checkAuth, updateEmployee);
router.patch("/employees/:id/status", checkAuth, changeEmployeeStatus);
router.post("/attendance", checkAuth, checkInCheckOut);
router.get("/attendance", checkAuth, getMyAttendance);
router.get("/attendance/admin", checkAuth, adminGetAllAttendance);
router.post("/attendance/leave", checkAuth, requestLeave);
router.patch("/attendance/leave/:id", checkAuth, approveRejectLeave);

export default router;
