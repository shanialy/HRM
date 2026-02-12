import { Router } from "express";
import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  getSingleEmployee,
  changeEmployeeStatus,
  updateEmployee,
} from "../controllers/authorizationController";
import { checkAuth } from "../middleware/checkAuth";
import { validate } from "../middleware/validate";
import { employeeStatus } from "../validators/authValidators";
import role from "../middleware/checkRole";

const router = Router();

router.post("/createEmployee", checkAuth, role("ADMIN"), createEmployee);
router.get("/getAllEmployees", checkAuth, role("ADMIN"), getAllEmployees);
router.get("/getEmployee/:id", checkAuth, getEmployeeById);
router.get("/employees/:id", checkAuth, getSingleEmployee);
router.put("/employees/:id", checkAuth, updateEmployee);
router.patch(
  "/employees/:id/status",
  checkAuth,
  validate(employeeStatus),
  changeEmployeeStatus,
);
export default router;
