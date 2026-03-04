import { Response } from "express";
import ResponseUtil from "../utils/Response/responseUtils";
import { STATUS_CODES } from "../constants/statusCodes";
import { AttendanceModel } from "../models/attendanceModel";
import { ATTENDANCE_CONSTANT } from "../constants/attendance";

// Pakistan Time Helper
const getPakistanTime = () => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" }),
  );
};

export const checkInCheckOut = async (req: any, res: Response) => {
  try {
    const { type, notes } = req.body;

    // Always use Pakistan server time
    const providedDate = getPakistanTime();

    /* ================= TODAY RANGE ================= */

    const startOfDay = new Date(providedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(providedDate);
    endOfDay.setHours(23, 59, 59, 999);

    /* ============== CHECK IN ============== */
    if (type === "CHECK_IN") {
      // 1️⃣ Check if open attendance already exists
      const openAttendance = await AttendanceModel.findOne({
        user: req.userId,
        "time.checkOut": null,
      });

      if (openAttendance) {
        return ResponseUtil.errorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          ATTENDANCE_CONSTANT.ALREADY_CHECKEDIN,
        );
      }

      // 2️⃣ Check if user already checked in today
      const todayAttendance = await AttendanceModel.findOne({
        user: req.userId,
        date: { $gte: startOfDay, $lte: endOfDay },
      });

      if (todayAttendance) {
        return ResponseUtil.errorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          ATTENDANCE_CONSTANT.ALREADY_CHECKEDIN,
        );
      }

      // 3️⃣ Create new attendance
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
        ATTENDANCE_CONSTANT.CHECKIN_SUCCESS,
      );
    }

    /* ============== CHECK OUT ============== */
    if (type === "CHECK_OUT") {
      // Find open attendance (night shift safe)
      const attendance: any = await AttendanceModel.findOne({
        user: req.userId,
        "time.checkOut": null,
      });

      if (!attendance) {
        return ResponseUtil.errorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          ATTENDANCE_CONSTANT.CHECKIN_NOT_FOUND,
        );
      }

      if (attendance?.time?.checkOut) {
        return ResponseUtil.errorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          ATTENDANCE_CONSTANT.ALREADY_CHECKEDOUT,
        );
      }

      // Close attendance
      attendance.time.checkOut = providedDate;

      if (notes) attendance.notes = notes;

      await attendance.save();

      return ResponseUtil.successResponse(
        res,
        STATUS_CODES.SUCCESS,
        { attendance },
        ATTENDANCE_CONSTANT.CHECKOUT_SUCCESS,
      );
    }

    return ResponseUtil.errorResponse(
      res,
      STATUS_CODES.BAD_REQUEST,
      "Invalid attendance type",
    );
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

      .sort({ year: -1, month: -1, date: -1 })
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
      ATTENDANCE_CONSTANT.FETCHED,
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
      ATTENDANCE_CONSTANT.ADMIN_FETCHED,
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
        ATTENDANCE_CONSTANT.ALREADY_EXISTS,
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
      ATTENDANCE_CONSTANT.SUCCESSFULL,
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
        ATTENDANCE_CONSTANT.RECORD_NOTFOUND,
      );
    }

    leave.status = status;
    await leave.save();

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { leave },
      status === "APPROVED"
        ? ATTENDANCE_CONSTANT.APPROVED
        : ATTENDANCE_CONSTANT.REJECT,
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};
export const getTodayAttendance = async (req: any, res: any) => {
  try {
    const userId = req.user.id;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await AttendanceModel.findOne({
      user: userId,
      date: today,
    });

    return res.status(200).json({
      success: true,
      data: attendance || null,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to fetch today attendance",
    });
  }
};
