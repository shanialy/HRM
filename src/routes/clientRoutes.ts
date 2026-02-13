import { Router } from "express";
import {
  createClient,
  getMyClients,
  getSingleClient,
  updateClient,
  deleteClient,
  clientLogin,
} from "../controllers/clientController";
import { checkAuth } from "../middleware/checkAuth";
import { validate } from "../middleware/validate";
import {
  createClientSchema,
  getMyClientsSchema,
  getSingleClientSchema,
  updateClientSchema,
  deleteClientSchema,
  clientLoginSchema,
} from "../validators/authValidators";
import role from "../middleware/checkRole";

const router = Router();

router.post(
  "/create-client",
  checkAuth,
  role("EMPLOYEE", "SALES"),
  validate(createClientSchema),
  createClient,
);

router.get(
  "/myclients",
  checkAuth,
  role("EMPLOYEE", "SALES"),
  validate(getMyClientsSchema),
  getMyClients,
);

router.get(
  "/clients/:id",
  checkAuth,
  role("EMPLOYEE", "SALES"),
  validate(getSingleClientSchema),
  getSingleClient,
);

router.put(
  "/update-clients/:id",
  checkAuth,
  role("EMPLOYEE", "SALES"),
  validate(updateClientSchema),
  updateClient,
);

router.delete(
  "/delete-client/:id",
  checkAuth,
  role("EMPLOYEE", "SALES"),
  validate(deleteClientSchema),
  deleteClient,
);

router.post("/client-login", validate(clientLoginSchema), clientLogin);

export default router;
