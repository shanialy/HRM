import { Router } from "express";
import {
  createClient,
  getMyClients,
  getSingleClient,
  updateClient,
  deleteClient,
} from "../controllers/clientController";
import { checkAuth } from "../middleware/checkAuth";
import { validate } from "../middleware/validate";
import {
  createClientSchema,
  updateClientSchema,
  deleteClientSchema,
  getClientsSchema,
  SingleClientSchema,
} from "../validators/clientValidators";
import role from "../middleware/checkRole";

const router = Router();

/**
 * @swagger
 * /api/v1/client/create-client:
 *   post:
 *     summary: Create new client (Sales Employee only)
 *     tags: [Client]
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
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Ali
 *               lastName:
 *                 type: string
 *                 example: Khan
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ali.khan@example.com
 *               phone:
 *                 type: string
 *                 example: 03001234567
 *               address:
 *                 type: string
 *                 example: Lahore, Pakistan
 *     responses:
 *       200:
 *         description: Client created successfully
 *       400:
 *         description: Email already exists
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Only Sales Employee)
 */

router.post(
  "/create-client",
  checkAuth,
  role("EMPLOYEE", "SALES"),
  validate(createClientSchema),
  createClient,
);

/**
 * @swagger
 * /api/v1/client/myclients:
 *   get:
 *     summary: Get logged-in sales employee clients
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *         required: false
 *         example: 1
 *         description: Page number (default 1)
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         required: false
 *         example: 10
 *         description: Records per page (default 10)
 *     responses:
 *       200:
 *         description: Clients fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Only Sales Employee)
 */

router.get(
  "/myclients",
  checkAuth,
  role("EMPLOYEE", "SALES"),
  validate(getClientsSchema),
  getMyClients,
);

/**
 * @swagger
 * /api/v1/client/clients/{id}:
 *   get:
 *     summary: Get single client details
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 69933bfffc76326459083af5
 *         description: Client ID
 *     responses:
 *       200:
 *         description: Client fetched successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Invalid permission)
 *       404:
 *         description: Client not found
 */

router.get(
  "/clients/:id",
  checkAuth,
  role("EMPLOYEE", "SALES"),
  validate(SingleClientSchema),
  getSingleClient,
);

/**
 * @swagger
 * /api/v1/client/update-clients/{id}:
 *   put:
 *     summary: Update client details
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 69933bfffc76326459083af5
 *         description: Client ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:
 *                 type: string
 *                 example: Ali
 *               lastName:
 *                 type: string
 *                 example: Khan
 *               email:
 *                 type: string
 *                 format: email
 *                 example: ali.updated@example.com
 *               city:
 *                 type: string
 *                 example: Karachi
 *     responses:
 *       200:
 *         description: Client updated successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Invalid permission)
 *       404:
 *         description: Client not found
 */

router.put(
  "/update-clients/:id",
  checkAuth,
  role("EMPLOYEE", "SALES"),
  validate(updateClientSchema),
  updateClient,
);

/**
 * @swagger
 * /api/v1/client/delete-client/{id}:
 *   delete:
 *     summary: Delete client (Soft delete - set status INACTIVE)
 *     tags: [Client]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         example: 69933bfffc76326459083af5
 *         description: Client ID
 *     responses:
 *       200:
 *         description: Client deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden (Invalid permission)
 *       404:
 *         description: Client not found or not allowed
 */

router.delete(
  "/delete-client/:id",
  checkAuth,
  role("EMPLOYEE", "SALES"),
  validate(deleteClientSchema),
  deleteClient,
);

export default router;
