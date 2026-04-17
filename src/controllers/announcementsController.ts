import { Response } from "express";
import ResponseUtil from "../utils/Response/responseUtils";
import { STATUS_CODES } from "../constants/statusCodes";
import Announcement from "../models/announcementModel";

export const createAnnouncement = async (req: any, res: Response) => {
  try {
    console.log("USER ROLE:", req.userRole);
    const { title, description } = req.body;

    if (req.role !== "ADMIN") {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Only admin can create announcement",
      );
    }

    const announcement = await Announcement.create({
      title,
      description,
      createdBy: req.userId,
    });

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { announcement },
      "Announcement created successfully",
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const getAnnouncements = async (req: any, res: Response) => {
  try {
    if (req.role !== "EMPLOYEE" && req.role !== "ADMIN") {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Only employees can view announcements",
      );
    }

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const search = (req.query.search as string) || "";

    const filter: any = {};

    if (search) {
      filter.title = { $regex: search, $options: "i" };
    }

    const announcements = await Announcement.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Announcement.countDocuments(filter);

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      {
        announcements,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      },
      "Announcements fetched successfully",
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const updateAnnouncement = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    if (req.role !== "ADMIN") {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Only admin can update announcement",
      );
    }

    const updatedAnnouncement = await Announcement.findByIdAndUpdate(
      id,
      { $set: req.body },
      { new: true },
    );

    if (!updatedAnnouncement) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        "Announcement not found",
      );
    }

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { announcement: updatedAnnouncement },
      "Announcement updated successfully",
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const deleteAnnouncement = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    if (req.role !== "ADMIN") {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Only admin can delete announcement",
      );
    }

    const deletedAnnouncement = await Announcement.findByIdAndDelete(id);

    if (!deletedAnnouncement) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        "Announcement not found",
      );
    }

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      {},
      "Announcement deleted successfully",
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};
