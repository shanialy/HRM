import { Router } from "express";
import {
  createEmployee,
  getAllEmployees,
  getSingleEmployee,
   changeEmployeeStatus,
  updateEmployee,
} from "../controllers/authorizationController";
import { checkAuth } from "../middleware/checkAuth";




const router = Router();


router.post("/createEmployee", checkAuth, createEmployee);
router.get("/getAllEmployees", checkAuth, getAllEmployees);
router.get("/employees/:id", checkAuth, getSingleEmployee);
router.put("/employees/:id", checkAuth, updateEmployee);
router.patch("/employees/:id/status", checkAuth, changeEmployeeStatus);
export default router;

