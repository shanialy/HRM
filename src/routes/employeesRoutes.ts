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

import role from "../middleware/checkRole";
import {
  AllEmployeesSchema,
  createEmployeeSchema,
  EmployeeByIdSchema,
  EmployeeStatusSchema,
  updateEmployeeSchema,
} from "../validators/employeeValidators";

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
  validate(AllEmployeesSchema),
  getAllEmployees,
);

router.get(
  "/employees/:id",
  checkAuth,
  role("ADMIN"),
  validate(EmployeeByIdSchema),
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
  validate(EmployeeStatusSchema),
  changeEmployeeStatus,
);

export default router;
