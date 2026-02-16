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

/**
 * @swagger
 * /api/v1/employee/createEmployee:
 *   post:
 *     summary: Create new employee (Admin only)
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - firstName
 *               - lastName
 *               - email
 *               - department
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Saad
 *               lastName:
 *                 type: string
 *                 example: Sikander
 *               email:
 *                 type: string
 *                 example: saad@gmail.com
 *               department:
 *                 type: string
 *                 example: SALES
 *               designation:
 *                 type: string
 *                 example: Sales Executive
 *               salary:
 *                 type: number
 *                 example: 50000
 *     responses:
 *       200:
 *         description: Employee created successfully
 *       401:
 *         description: Unauthorized
 */

router.post(
  "/createEmployee",
  checkAuth,
  role("ADMIN"),
  validate(createEmployeeSchema),
  createEmployee,
);

/**
 * @swagger
 * /api/v1/employee/getAllEmployees:
 *   get:
 *     summary: Get all employees (Admin only)
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         example: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         example: 5
 *     responses:
 *       200:
 *         description: Employees fetched successfully
 *       401:
 *         description: Unauthorized
 */

router.get(
  "/getAllEmployees",
  checkAuth,
  role("ADMIN"),
  validate(AllEmployeesSchema),
  getAllEmployees,
);

/**
 * @swagger
 * /api/v1/employee/employees/{id}:
 *   get:
 *     summary: Get employee by ID (Admin only)
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 69930301bc074001b13a8d00
 *     responses:
 *       200:
 *         description: Employee fetched successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Employee not found
 */

router.get(
  "/employees/:id",
  checkAuth,
  role("ADMIN"),
  validate(EmployeeByIdSchema),
  getEmployeeById,
);

/**
 * @swagger
 * /api/v1/employee/employees/{id}:
 *   put:
 *     summary: Update employee details (Admin only)
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 69930301bc074001b13a8d00
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: UpdatedName
 *               lastName:
 *                 type: string
 *                 example: UpdatedLast
 *               designation:
 *                 type: string
 *                 example: Senior Guard
 *               department:
 *                 type: string
 *                 example: SALES
 *               salary:
 *                 type: number
 *                 example: 5000
 *     responses:
 *       200:
 *         description: Employee updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Employee not found
 */

router.put(
  "/employees/:id",
  checkAuth,
  role("ADMIN"),
  validate(updateEmployeeSchema),
  updateEmployee,
);

/**
 * @swagger
 * /api/v1/employee/employees/{id}:
 *   patch:
 *     summary: Change employee status (Admin only)
 *     tags: [Employee]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 69930301bc074001b13a8d00
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
 *                 example: INACTIVE
 *     responses:
 *       200:
 *         description: Employee status updated successfully
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Employee not found
 */

router.patch(
  "/employees/:id",
  checkAuth,
  role("ADMIN"),
  validate(EmployeeStatusSchema),
  changeEmployeeStatus,
);

export default router;
