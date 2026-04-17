import { Router } from "express";
import { checkAuth } from "../middleware/checkAuth";
import { validate } from "../middleware/validate";

import {
  createAnnouncement,
  getAnnouncements,
  updateAnnouncement,
  deleteAnnouncement,
} from "../controllers/announcementsController";

import {
  createAnnouncementSchema,
  getAnnouncementsSchema,
  updateAnnouncementSchema,
  deleteAnnouncementSchema,
} from "../validators/announcementValidators";

const router = Router();

/**
 * @swagger
 * /api/v1/announcements/createAnnouncement:
 *   post:
 *     summary: Create announcement (Admin only)
 *     tags: [Announcement]
 */
router.post(
  "/createAnnouncement",
  checkAuth,
  validate(createAnnouncementSchema),
  createAnnouncement,
);

/**
 * @swagger
 * /api/v1/announcements/getAnnouncements:
 *   get:
 *     summary: Get all announcements (Employee only)
 *     tags: [Announcement]
 */
router.get(
  "/getAnnouncements",
  checkAuth,
  validate(getAnnouncementsSchema),
  getAnnouncements,
);

/**
 * @swagger
 * /api/v1/announcements/updateAnnouncement/{id}:
 *   put:
 *     summary: Update announcement (Admin only)
 *     tags: [Announcement]
 */
router.put(
  "/updateAnnouncement/:id",
  checkAuth,
  validate(updateAnnouncementSchema),
  updateAnnouncement,
);

/**
 * @swagger
 * /api/v1/announcements/deleteAnnouncement/{id}:
 *   delete:
 *     summary: Delete announcement (Admin only)
 *     tags: [Announcement]
 */
router.delete(
  "/deleteAnnouncement/:id",
  checkAuth,
  validate(deleteAnnouncementSchema),
  deleteAnnouncement,
);

export default router;
