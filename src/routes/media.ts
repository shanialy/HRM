import express from "express";
import { upload } from "../config/multer";
import { uploadFile } from "../controllers/mediaController";

const router = express.Router();

router.post("/upload", upload.single("file"), uploadFile);

export default router;
