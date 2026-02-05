import { Router } from "express";
import { createClinet,getMyClients,getSingleClient,updateClient,deleteClient,clientLogin} from "../controllers/clientController"
import { checkAuth } from "../middleware/checkAuth";

const router = Router();

router.post("/create-client", checkAuth, createClinet);
router.get("/myclients", checkAuth, getMyClients);
router.get("/clients/:id", checkAuth, getSingleClient);
router.put("/update-clients/:id", checkAuth, updateClient);
router.delete("/delete-client/:id", checkAuth, deleteClient);
router.post("/client-login", clientLogin);




export default router;


