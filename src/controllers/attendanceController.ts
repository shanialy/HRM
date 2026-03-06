import { Response } from "express";
import ResponseUtil from "../utils/Response/responseUtils";
import { STATUS_CODES } from "../constants/statusCodes";
import { AttendanceModel } from "../models/attendanceModel";
import { ATTENDANCE_CONSTANT } from "../constants/attendance";
import { AttendanceRequestModel } from "../models/attendanceRequestModel";

// Pakistan Time Helper
const getPakistanTime = () => {
  return new Date(
    new Date().toLocaleString("en-US", { timeZone: "Asia/Karachi" }),
  );
};

export const checkInCheckOut = async (req: any, res: Response) => {
  try {
    const { type, notes } = req.body;
    if (!["CHECK_IN", "CHECK_OUT"].includes(type)) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid attendance type",
      );
    }

    // Always use Pakistan server time
    const providedDate = getPakistanTime();

    /* ================= TODAY RANGE ================= */

    const startOfDay = new Date(providedDate);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(providedDate);
    endOfDay.setHours(23, 59, 59, 999);

    /* ============== CHECK IN ============== */
    if (type === "CHECK_IN") {
      const existingAttendance = await AttendanceModel.findOne({
        user: req.userId,
        isLeave: { $ne: true },
        "time.checkOut": null,
      }).sort({ date: -1 });

      if (existingAttendance) {
        return ResponseUtil.errorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Please checkout first before new checkin",
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
      // Find open attendance (ignore leave)
      const attendance: any = await AttendanceModel.findOne({
        user: req.userId,
        isLeave: { $ne: true },
        "time.checkOut": null,
      }).sort({ date: -1 });

      if (!attendance) {
        return ResponseUtil.errorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          ATTENDANCE_CONSTANT.CHECKIN_NOT_FOUND,
        );
      }

      const checkInTime = new Date(attendance.time.checkIn);
      const now = providedDate;

      const diffHours =
        (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      if (diffHours > 20) {
        return ResponseUtil.errorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Checkout window expired. Please request admin.",
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

    console.log("MONTH FROM FRONTEND:", month);

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

    console.log("ATTENDANCE FILTER:", filter);

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
    const userId = req.userId;

    const now = new Date();

    const pakistanOffset = 5 * 60 * 60 * 1000;
    const pakistanNow = new Date(now.getTime() + pakistanOffset);

    const start = new Date(pakistanNow);
    start.setHours(0, 0, 0, 0);

    const end = new Date(pakistanNow);
    end.setHours(23, 59, 59, 999);

    const attendance = await AttendanceModel.findOne({
      user: userId,
      date: { $gte: start, $lte: end },
    });

    return res.status(200).json({
      success: true,
      data: attendance || null,
    });
  } catch (error) {
    console.log("TODAY ATTENDANCE ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch today attendance",
    });
  }
};

export const createAttendanceRequest = async (req: any, res: Response) => {
  try {
    const { type, date, time, notes } = req.body;

    /* ========= REQUIRED FIELDS VALIDATION ========= */

    if (!type || !date || !time || !notes) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "All fields are required",
      );
    }

    const requestDate = new Date(date);
    requestDate.setHours(0, 0, 0, 0);

    /* ========= FUTURE DATE VALIDATION ========= */

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requestDate > today) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Future date request not allowed",
      );
    }

    /* ========= 7 DAYS LIMIT VALIDATION ========= */

    const limitDate = new Date();
    limitDate.setHours(0, 0, 0, 0);
    limitDate.setDate(limitDate.getDate() - 7);

    if (requestDate < limitDate) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "You can only request attendance for the last 7 days",
      );
    }

    /* ========= DUPLICATE PENDING REQUEST CHECK ========= */

    const existingRequest = await AttendanceRequestModel.findOne({
      user: req.userId,
      date: requestDate,
      type: type,
      status: "PENDING",
    });

    if (existingRequest) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Request already pending for this date",
      );
    }

    /* ========= CREATE REQUEST ========= */

    const request = await AttendanceRequestModel.create({
      user: req.userId,
      type,
      date: requestDate,
      time,
      notes,
      status: "PENDING",
    });

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { request },
      "Attendance request submitted successfully",
    );
  } catch (error) {
    return ResponseUtil.handleError(res, error);
  }
};

export const getAttendanceRequests = async (req: any, res: Response) => {
  try {
    const { id, page = 1, limit = 20 } = req.query;

    /* ===== SINGLE REQUEST ===== */

    if (id) {
      const request = await AttendanceRequestModel.findById(id).populate(
        "user",
        "firstName lastName email",
      );

      if (!request) {
        return ResponseUtil.errorResponse(
          res,
          STATUS_CODES.NOT_FOUND,
          "Request not found",
        );
      }

      return ResponseUtil.successResponse(
        res,
        STATUS_CODES.SUCCESS,
        { request },
        "Attendance request fetched successfully",
      );
    }

    /* ===== PAGINATION SETUP ===== */

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    const skip = (pageNumber - 1) * limitNumber;

    const totalRequests = await AttendanceRequestModel.countDocuments({
      status: "PENDING",
    });

    const totalPages = Math.ceil(totalRequests / limitNumber);

    /* ===== ALL PENDING REQUESTS ===== */

    const requests = await AttendanceRequestModel.find({ status: "PENDING" })
      .populate("user", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber);

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      {
        requests,
        pagination: {
          totalRequests,
          totalPages,
          page: pageNumber,
          limit: limitNumber,
        },
      },
      "Attendance requests fetched successfully",
    );
  } catch (error) {
    return ResponseUtil.handleError(res, error);
  }
};

export const reviewAttendanceRequest = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid status",
      );
    }

    const request: any = await AttendanceRequestModel.findById(id);

    if (!request) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        "Request not found",
      );
    }

    if (request.status !== "PENDING") {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Request already reviewed",
      );
    }

    /* ================= APPROVE ================= */

    if (status === "APPROVED") {
      const startOfDay = new Date(request.date);
      startOfDay.setHours(0, 0, 0, 0);

      const endOfDay = new Date(request.date);
      endOfDay.setHours(23, 59, 59, 999);

      let attendance: any = await AttendanceModel.findOne({
        user: request.user,
        date: { $gte: startOfDay, $lte: endOfDay },
      });

      /* ===== IF ATTENDANCE NOT EXIST ===== */

      if (!attendance) {
        const newAttendance: any = {
          user: request.user,
          year: request.date.getFullYear(),
          month: request.date.getMonth() + 1,
          date: request.date,
          time: {
            checkIn: null,
            checkOut: null,
          },
        };

        if (request.type === "CHECK_IN") {
          newAttendance.time.checkIn = request.time;
        }

        if (request.type === "CHECK_OUT") {
          newAttendance.time.checkOut = request.time;
        }

        attendance = await AttendanceModel.create(newAttendance);
      } else {
        /* ===== UPDATE EXISTING ATTENDANCE ===== */

        if (request.type === "CHECK_IN") {
          attendance.time.checkIn = request.time;
        }

        if (request.type === "CHECK_OUT") {
          attendance.time.checkOut = request.time;
        }

        await attendance.save();
      }
    }

    /* ================= UPDATE REQUEST ================= */

    request.status = status;
    request.reviewedBy = req.userId;
    request.reviewedAt = new Date();

    await request.save();

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { request },
      "Request reviewed successfully",
    );
  } catch (error) {
    return ResponseUtil.handleError(res, error);
  }
};
