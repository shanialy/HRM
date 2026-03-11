import { Response } from "express";
import ResponseUtil from "../utils/Response/responseUtils";
import { STATUS_CODES } from "../constants/statusCodes";
import { AttendanceModel } from "../models/attendanceModel";
import { ATTENDANCE_CONSTANT } from "../constants/attendance";
import { AttendanceRequestModel } from "../models/attendanceRequestModel";

const getPakistanTime = () => {
  const now = new Date();

  const date = now.toLocaleDateString("en-CA", {
    timeZone: "Asia/Karachi",
  });

  const time = now.toLocaleTimeString("en-GB", {
    timeZone: "Asia/Karachi",
    hour12: false,
  });

  return {
    date, // YYYY-MM-DD
    time, // HH:mm:ss
    full: `${date} ${time}`, // complete PKT timestamp
  };
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

    const now = getPakistanTime();
    const attendanceDate = now.date;

    const year = Number(attendanceDate.split("-")[0]);
    const month = Number(attendanceDate.split("-")[1]);

    const lastRecord: any = await AttendanceModel.findOne({
      user: req.userId,
      isLeave: { $ne: true },
    }).sort({ createdAt: -1 });

    if (type === "CHECK_IN") {
      const todayAttendance = await AttendanceModel.findOne({
        user: req.userId,
        date: attendanceDate,
        isLeave: { $ne: true },
      });

      if (todayAttendance) {
        return ResponseUtil.errorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "You have already checked in today",
        );
      }

      if (lastRecord && !lastRecord.time.checkOut) {
        return ResponseUtil.errorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Please request admin with chckout request.",
        );
      }

      const attendance = await AttendanceModel.create({
        user: req.userId,
        year,
        month,
        date: attendanceDate,
        time: {
          checkIn: now.full,
          checkOut: null,
        },
        notes: notes ? `Check-In: ${notes}` : "Check-In",
      });

      return ResponseUtil.successResponse(
        res,
        STATUS_CODES.SUCCESS,
        { attendance },
        ATTENDANCE_CONSTANT.CHECKIN_SUCCESS,
      );
    }

    if (type === "CHECK_OUT") {
      if (!lastRecord) {
        return ResponseUtil.errorResponse(
          res,
          STATUS_CODES.NOT_FOUND,
          "Attendance not found.",
        );
      }

      if (lastRecord.time.checkOut) {
        return ResponseUtil.errorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "No active check-in found",
        );
      }

      lastRecord.time.checkOut = now.full;

      lastRecord.notes = lastRecord.notes
        ? `${lastRecord.notes} | Check-Out: ${notes || ""}`
        : `Check-Out: ${notes || ""}`;

      await lastRecord.save();

      return ResponseUtil.successResponse(
        res,
        STATUS_CODES.SUCCESS,
        { attendance: lastRecord },
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

    (attendance as any[]).forEach((a) => {
      console.log("DATE:", a.date, "ISLEAVE:", a.isLeave);
    });

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
    // 🔹 STEP 1
    // Pakistan date lo
    const now = getPakistanTime();
    const todayDate = now.date; // example: "2026-03-11"

    // =====================================================
    // 🔹 NEW STEP (IMPORTANT)
    // Pehle check karo koi open attendance to nahi
    // yani checkIn hai lekin checkOut abhi tak nahi hua
    // =====================================================

    const openAttendance = await AttendanceModel.findOne({
      user: req.userId,
      isLeave: { $ne: true },
      "time.checkOut": null,
    }).sort({ createdAt: -1 });

    // Agar open attendance mil jaye
    // to wahi frontend ko return kar do
    if (openAttendance) {
      return ResponseUtil.successResponse(
        res,
        STATUS_CODES.SUCCESS,
        { attendance: openAttendance },
        "Open attendance found",
      );
    }

    // 🔹 STEP 2
    // PKT date se record find karo
    const attendance = await AttendanceModel.findOne({
      user: req.userId,
      date: todayDate,
      isLeave: { $ne: true },
    });

    // 🔹 STEP 3
    if (!attendance) {
      return ResponseUtil.successResponse(
        res,
        STATUS_CODES.SUCCESS,
        { attendance: null },
        "No attendance found for today",
      );
    }

    // 🔹 STEP 4
    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { attendance },
      "Today attendance fetched successfully",
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const createAttendanceRequest = async (req: any, res: Response) => {
  try {
    const { type, date, time, notes } = req.body;

    // ✅ Required fields check
    if (!type || !date || !time || !notes) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "All fields are required",
      );
    }

    if (!["CHECK_IN", "CHECK_OUT"].includes(type)) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid attendance type",
      );
    }

    // ✅ Convert to PKT date
    const requestDate = new Date(date);
    requestDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (requestDate > today) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Future date request not allowed",
      );
    }

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

    // ✅ Duplicate pending request
    const existingRequest = await AttendanceRequestModel.findOne({
      user: req.userId,
      date: requestDate,
      type,
      status: "PENDING",
    });

    if (existingRequest) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Request already pending for this date",
      );
    }

    // ✅ Create request
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

    if (id) {
      // ✅ Fetch single request
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

    // ✅ Pagination for all pending requests
    const pageNumber = Number(page);
    const limitNumber = Number(limit);
    const skip = (pageNumber - 1) * limitNumber;

    const totalRequests = await AttendanceRequestModel.countDocuments({
      status: "PENDING",
    });
    const totalPages = Math.ceil(totalRequests / limitNumber);

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

    // ✅ Validate status
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

    // ================= APPROVE =================
    if (status === "APPROVED") {
      // Ensure request.date is string in YYYY-MM-DD
      let requestDateStr: string;
      if (typeof request.date === "string") requestDateStr = request.date;
      else if (request.date instanceof Date)
        requestDateStr = request.date.toLocaleDateString("en-CA", {
          timeZone: "Asia/Karachi",
        });
      else
        return ResponseUtil.errorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Invalid request date",
        );

      const year = Number(requestDateStr.split("-")[0]);
      const month = Number(requestDateStr.split("-")[1]);

      if (isNaN(year) || isNaN(month)) {
        return ResponseUtil.errorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Invalid year/month in request date",
        );
      }

      if (!request.time) {
        return ResponseUtil.errorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Request time is required",
        );
      }

      // Find existing attendance
      let attendance: any = await AttendanceModel.findOne({
        user: request.user,
        date: requestDateStr,
      });

      if (!attendance) {
        // Create new attendance
        attendance = await AttendanceModel.create({
          user: request.user,
          year,
          month,
          date: requestDateStr,
          time: {
            checkIn: request.type === "CHECK_IN" ? request.time : null,
            checkOut: request.type === "CHECK_OUT" ? request.time : null,
          },
          notes: request.notes || "",
        });
      } else {
        // Update existing attendance
        if (request.type === "CHECK_IN") attendance.time.checkIn = request.time;
        if (request.type === "CHECK_OUT")
          attendance.time.checkOut = request.time;

        attendance.notes = attendance.notes
          ? `${attendance.notes} | ${request.notes || request.type}`
          : request.notes || request.type;

        await attendance.save();
      }
    }

    // ================= UPDATE REQUEST =================
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
