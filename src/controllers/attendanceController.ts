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
    const { type, notes, latitude, longitude } = req.body;

    // ================= VALIDATE TYPE =================
    if (!["CHECK_IN", "CHECK_OUT"].includes(type)) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid attendance type",
      );
    }
    // ================= LOCATION VALIDATION =================
    // 🔴 Prevent attendance if location is not provided (GPS off / blocked)
    if (latitude === undefined || longitude === undefined) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Location is required. Please enable GPS to mark attendance.",
      );
    }
    if (typeof latitude !== "number" || typeof longitude !== "number") {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid location coordinates",
      );
    }
    // ================= OFFICE LOCATION CONFIG =================
    // 🟢 Office coordinates (Google Maps se liye gaye)
    const OFFICE_LAT = Number(process.env.OFFICE_LAT);
    const OFFICE_LNG = Number(process.env.OFFICE_LNG);
    const ALLOWED_RADIUS = Number(process.env.OFFICE_RADIUS);

    // ================= DISTANCE FUNCTION =================
    // 🟢 Haversine formula to calculate distance between employee and office
    function getDistance(
      lat1: number,
      lon1: number,
      lat2: number,
      lon2: number,
    ) {
      const R = 6371e3; // Earth radius in meters
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;

      const a =
        Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    }

    // ================= LOCATION VALIDATION =================
    // 🟢 Calculate distance between employee and office
    const distance = Math.round(
      getDistance(latitude, longitude, OFFICE_LAT, OFFICE_LNG),
    );

    // 🔴 Block attendance if employee is outside 500 meters
    if (distance > ALLOWED_RADIUS) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        `You must be within ${ALLOWED_RADIUS} meters of the office`,
      );
    }

    // ================= SERVER TIME =================
    // Always use server time to prevent client manipulation
    const now = getPakistanTime();

    // ================= NORMALIZE DATE =================
    // Attendance date will always be the CHECK-IN date
    const attendanceDate = new Date(now);
    attendanceDate.setHours(0, 0, 0, 0);

    /* =================================================
        CHECK IN
    ================================================= */

    if (type === "CHECK_IN") {
      // 🔴 Rule 1: Only ONE attendance per day
      const todayAttendance = await AttendanceModel.findOne({
        user: req.userId,
        date: attendanceDate,
        isLeave: { $ne: true },
      });

      if (todayAttendance) {
        return ResponseUtil.errorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Attendance already marked for today",
        );
      }

      // 🔴 Rule 2: User cannot check in if previous attendance is still open
      const openAttendance = await AttendanceModel.findOne({
        user: req.userId,
        isLeave: { $ne: true },
        "time.checkOut": null,
      });

      if (openAttendance) {
        return ResponseUtil.errorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Please checkout first before new checkin",
        );
      }

      // 🔴 Create attendance document
      const attendance = await AttendanceModel.create({
        user: req.userId,
        year: attendanceDate.getFullYear(),
        month: attendanceDate.getMonth() + 1,
        date: attendanceDate, // normalized date
        time: {
          checkIn: now,
          checkOut: null,
        },
        notes: notes ? `Check-In: ${notes}` : "Check-In",
        checkInLatitude: latitude,
        checkInLongitude: longitude,
      });

      return ResponseUtil.successResponse(
        res,
        STATUS_CODES.SUCCESS,
        { attendance },
        ATTENDANCE_CONSTANT.CHECKIN_SUCCESS,
      );
    }

    /* =================================================
        CHECK OUT
    ================================================= */

    if (type === "CHECK_OUT") {
      // 🔴 Find the open attendance (where checkout is still null)
      const attendance: any = await AttendanceModel.findOne({
        user: req.userId,
        isLeave: { $ne: true },
        "time.checkOut": null,
      }).sort({ createdAt: -1 });

      if (!attendance) {
        return ResponseUtil.errorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          ATTENDANCE_CONSTANT.CHECKIN_NOT_FOUND,
        );
      }

      // 🔴 Prevent checkout after 20 hours
      const checkInTime = new Date(attendance.time.checkIn);
      const diffHours =
        (now.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      if (diffHours > 20) {
        return ResponseUtil.errorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Checkout window expired. Please request admin.",
        );
      }

      // 🔴 Close attendance
      attendance.time.checkOut = now;

      // 🟢 Save employee location at checkout
      attendance.checkOutLatitude = latitude;
      attendance.checkOutLongitude = longitude;
      attendance.notes = attendance.notes
        ? `${attendance.notes} | Check-Out: ${notes || ""}`
        : `Check-Out: ${notes || ""}`;

      await attendance.save(); // save updated attendance with checkout time and location

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
    }).sort({ createdAt: -1 });

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
