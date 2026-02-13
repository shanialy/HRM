import { Response } from "express";
import ResponseUtil from "../utils/Response/responseUtils";
import { STATUS_CODES } from "../constants/statusCodes";
import { AttendanceModel } from "../models/attendanceModel";

export const checkInCheckOut = async (req: any, res: Response) => {
  try {
    const { type, dateTime, notes } = req.body;

    const providedDate = new Date(dateTime);

    const startOfDay = new Date(providedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(providedDate);
    endOfDay.setHours(23, 59, 59, 999);

    const todayAttendance: any = await AttendanceModel.findOne({
      user: req.userId,
      date: { $gte: startOfDay, $lte: endOfDay },
    });

    /* ============== CHECK IN ============== */
    if (type === "CHECK_IN") {
      if (todayAttendance) {
        return ResponseUtil.errorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Already checked in for this day",
        );
      }

      const attendance = await AttendanceModel.create({
        user: req.userId,
        year: providedDate.getFullYear(),
        month: providedDate.getMonth() + 1,
        date: providedDate,
        time: {
          checkIn: providedDate,
          checkOut: null,
        },
        notes,
      });

      return ResponseUtil.successResponse(
        res,
        STATUS_CODES.SUCCESS,
        { attendance },
        "Checked in successfully",
      );
    }

    /* ============== CHECK OUT ============== */
    if (type === "CHECK_OUT") {
      if (!todayAttendance) {
        return ResponseUtil.errorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Check-in not found for this day",
        );
      }

      if (todayAttendance?.time?.checkOut) {
        return ResponseUtil.errorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Already checked out for this day",
        );
      }

      todayAttendance.time.checkOut = providedDate;
      if (notes) todayAttendance.notes = notes;

      await todayAttendance.save();

      return ResponseUtil.successResponse(
        res,
        STATUS_CODES.SUCCESS,
        { attendance: todayAttendance },
        "Checked out successfully",
      );
    }
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const getMyAttendance = async (req: any, res: Response) => {
  try {
    const { month, year } = req.query;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {
      user: req.userId,
    };

    if (month !== undefined) {
      filter.month = Number(month);
    }

    if (year !== undefined) {
      filter.year = Number(year);
    }

    const attendance = await AttendanceModel.find(filter)
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalAttendance = await AttendanceModel.countDocuments(filter);

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      {
        attendance,
        pagination: {
          total: totalAttendance,
          page,
          limit,
          totalPages: Math.ceil(totalAttendance / limit),
        },
      },
      "My attendance fetched successfully",
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const adminGetAllAttendance = async (req: any, res: Response) => {
  try {
    // ❌ REMOVED: Role check (handled by role middleware)

    const { employeeId, month, year, from, to } = req.query;

    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const filter: any = {};

    if (employeeId) {
      filter.user = employeeId;
    }

    if (month !== undefined) {
      filter.month = Number(month);
    }

    if (year !== undefined) {
      filter.year = Number(year);
    }

    if (from || to) {
      filter.date = {};

      if (from) {
        filter.date.$gte = new Date(from);
      }

      if (to) {
        filter.date.$lte = new Date(to);
      }
    }

    const attendance = await AttendanceModel.find(filter)
      .populate("user", "firstName lastName email role")
      .sort({ date: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalAttendance = await AttendanceModel.countDocuments(filter);

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      {
        attendance,
        pagination: {
          total: totalAttendance,
          page,
          limit,
          totalPages: Math.ceil(totalAttendance / limit),
        },
      },
      "Attendance fetched successfully",
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const requestLeave = async (req: any, res: Response) => {
  try {
    const { date, notes } = req.body;

    const leaveDate = new Date(date);

    const existing = await AttendanceModel.findOne({
      user: req.userId,
      date: leaveDate,
    });

    if (existing) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Attendance or leave already exists for this date",
      );
    }

    const leave = await AttendanceModel.create({
      user: req.userId,
      year: leaveDate.getFullYear(),
      month: leaveDate.getMonth() + 1,
      date: leaveDate,
      isLeave: true,
      status: "PENDING",
      notes,
      time: {
        checkIn: leaveDate,
        checkOut: null,
      },
    });

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { leave },
      "Leave requested successfully",
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const approveRejectLeave = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const leave = await AttendanceModel.findOne({
      _id: id,
      isLeave: true,
    });

    if (!leave) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        "Leave record not found",
      );
    }

    leave.status = status;
    await leave.save();

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { leave },
      status === "APPROVED"
        ? "Leave approved successfully"
        : "Leave rejected successfully",
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};
