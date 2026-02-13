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
  validate(getClientsSchema),
  getMyClients,
);

router.get(
  "/clients/:id",
  checkAuth,
  role("EMPLOYEE", "SALES"),
  validate(SingleClientSchema),
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

export default router;
