import { Router } from "express";
import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  changeEmployeeStatus,
  updateEmployee,
} from "../controllers/authorizationController";
import { checkAuth } from "../middleware/checkAuth";
import { validate } from "../middleware/validate";
import {
  changeEmployeeStatusSchema,
  createEmployeeSchema,
  getAllEmployeesSchema,
  getEmployeeByIdSchema,
  updateEmployeeSchema,
} from "../validators/authValidators";
import role from "../middleware/checkRole";

const router = Router();

router.post(
  "/createEmployee",
  checkAuth,
  role("ADMIN"),
  validate(createEmployeeSchema),
  createEmployee,
);

router.get(
  "/getAllEmployees",
  checkAuth,
  role("ADMIN"),
  validate(getAllEmployeesSchema),
  getAllEmployees,
);

router.get(
  "/employees/:id",
  checkAuth,
  role("ADMIN"),
  validate(getEmployeeByIdSchema),
  getEmployeeById,
);

router.put(
  "/employees/:id",
  checkAuth,
  role("ADMIN"),
  validate(updateEmployeeSchema),
  updateEmployee,
);

router.patch(
  "/employees/:id",
  checkAuth,
  role("ADMIN"),
  validate(changeEmployeeStatusSchema),
  changeEmployeeStatus,
);

export default router;
