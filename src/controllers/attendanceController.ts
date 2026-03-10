import { Response } from "express";
import ResponseUtil from "../utils/Response/responseUtils";
import { STATUS_CODES } from "../constants/statusCodes";
import { AttendanceModel } from "../models/attendanceModel";
import { ATTENDANCE_CONSTANT } from "../constants/attendance";
import { AttendanceRequestModel } from "../models/attendanceRequestModel";

// Pakistan Time Helper
// Pakistan time string generator
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

    // ================= VALIDATE TYPE =================
    if (!["CHECK_IN", "CHECK_OUT"].includes(type)) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid attendance type",
      );
    }
    // // ================= LOCATION VALIDATION =================
    // // 🔴 Prevent attendance if location is not provided (GPS off / blocked)
    // if (latitude === undefined || longitude === undefined) {
    //   return ResponseUtil.errorResponse(
    //     res,
    //     STATUS_CODES.BAD_REQUEST,
    //     "Location is required. Please enable GPS to mark attendance.",
    //   );
    // }
    // if (typeof latitude !== "number" || typeof longitude !== "number") {
    //   return ResponseUtil.errorResponse(
    //     res,
    //     STATUS_CODES.BAD_REQUEST,
    //     "Invalid location coordinates",
    //   );
    // }
    // // ================= OFFICE LOCATION CONFIG =================
    // // 🟢 Office coordinates (Google Maps se liye gaye)
    // const OFFICE_LAT = Number(process.env.OFFICE_LAT);
    // const OFFICE_LNG = Number(process.env.OFFICE_LNG);
    // const ALLOWED_RADIUS = Number(process.env.OFFICE_RADIUS);

    // // ================= DISTANCE FUNCTION =================
    // // 🟢 Haversine formula to calculate distance between employee and office
    // function getDistance(
    //   lat1: number,
    //   lon1: number,
    //   lat2: number,
    //   lon2: number,
    // ) {
    //   const R = 6371e3; // Earth radius in meters
    //   const φ1 = (lat1 * Math.PI) / 180;
    //   const φ2 = (lat2 * Math.PI) / 180;
    //   const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    //   const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    //   const a =
    //     Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    //     Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    //   const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    //   return R * c;
    // }

    // // ================= LOCATION VALIDATION =================
    // // 🟢 Calculate distance between employee and office
    // const distance = Math.round(
    //   getDistance(latitude, longitude, OFFICE_LAT, OFFICE_LNG),
    // );

    // // 🔴 Block attendance if employee is outside 500 meters
    // if (distance > ALLOWED_RADIUS) {
    //   return ResponseUtil.errorResponse(
    //     res,
    //     STATUS_CODES.BAD_REQUEST,
    //     `You must be within ${ALLOWED_RADIUS} meters of the office`,
    //   );
    // }

    // ================= SERVER TIME =================
    // Always use server time to prevent client manipulation
    const now = getPakistanTime();

    const attendanceDate = now.date; // PKT date string
    /* =================================================
        CHECK IN
    ================================================= */

    /* =================================================
   CHECK IN
================================================= */

    if (type === "CHECK_IN") {
      // 🔹 STEP 1
      // attendanceDate already PKT date string hona chahiye
      // example: "2026-03-11"

      const todayAttendance = await AttendanceModel.findOne({
        user: req.userId,
        date: attendanceDate, // PKT date se compare hoga
        isLeave: { $ne: true },
      });

      // 🔴 Agar aaj ka attendance already hai to block
      if (todayAttendance) {
        return ResponseUtil.errorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Attendance already marked for today",
        );
      }

      // 🔹 STEP 2
      // Check karo koi previous attendance open to nahi
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

      // 🔹 STEP 3
      // PKT date string se year aur month nikaalna
      // attendanceDate example: "2026-03-11"

      const year = Number(attendanceDate.split("-")[0]);
      const month = Number(attendanceDate.split("-")[1]);

      // 🔹 STEP 4
      // attendance create karna
      // checkIn me PKT datetime store hoga (now.full)

      const attendance = await AttendanceModel.create({
        user: req.userId,

        year: year,
        month: month,

        // 🔹 PKT date string DB me store hogi
        date: attendanceDate,

        time: {
          // 🔹 PKT full datetime store hoga
          checkIn: now.full,
          checkOut: null,
        },

        notes: notes ? `Check-In: ${notes}` : "Check-In",

        // checkInLatitude: latitude,
        // checkInLongitude: longitude,
      });

      // 🔹 STEP 5
      // success response return
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
      // 🔴 STEP 1
      // Find the open attendance (jisme checkout null ho)

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

      // 🔴 STEP 2
      // checkIn PKT string hai (example: "2026-03-11 10:15:22")
      // usko Date object me convert karna padega calculation ke liye

      const checkInTime = new Date(attendance.time.checkIn);

      // 🔴 CHANGE HERE
      // now object hai {date,time,full}
      // isliye new Date(now.full) use karna hoga

      const currentTime = new Date(now.full);

      const diffHours =
        (currentTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);

      // 🔴 STEP 3
      // Prevent checkout after 20 hours

      if (diffHours > 20) {
        return ResponseUtil.errorResponse(
          res,
          STATUS_CODES.BAD_REQUEST,
          "Checkout window expired. Please request admin.",
        );
      }

      // 🔴 STEP 4
      // checkout time PKT string me store karo

      attendance.time.checkOut = now.full;

      // 🟢 Save employee location at checkout
      // attendance.checkOutLatitude = latitude;
      // attendance.checkOutLongitude = longitude;

      attendance.notes = attendance.notes
        ? `${attendance.notes} | Check-Out: ${notes || ""}`
        : `Check-Out: ${notes || ""}`;

      // 🔴 STEP 5
      // save updated record

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
