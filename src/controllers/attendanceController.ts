import { Response } from "express";
import ResponseUtil from "../utils/Response/responseUtils";
import { STATUS_CODES } from "../constants/statusCodes";
import { AttendanceModel } from "../models/attendanceModel";
import { ATTENDANCE_CONSTANT } from "../constants/attendance";
import { AttendanceRequestModel } from "../models/attendanceRequestModel";
// import { calculateDistance } from "../constants/attendance";

// const OFFICE_LAT = Number(process.env.OFFICE_LAT);
// const OFFICE_LNG = Number(process.env.OFFICE_LNG);
// const OFFICE_RADIUS = Number(process.env.OFFICE_RADIUS);

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
    date,
    time,
    full: `${date} ${time}`,
  };
};

export const checkInCheckOut = async (req: any, res: Response) => {
  try {
    const { type, notes } = req.body;

    // if (!latitude || !longitude) {
    //   return ResponseUtil.errorResponse(
    //     res,
    //     STATUS_CODES.BAD_REQUEST,
    //     "Location is required",
    //   );
    // }
    // const distance = calculateDistance(
    //   Number(latitude),
    //   Number(longitude),
    //   OFFICE_LAT,
    //   OFFICE_LNG,
    // );
    // const distanceInMeters = Math.round(distance);
    // console.log("User location:", latitude, longitude);
    // console.log("Office location:", OFFICE_LAT, OFFICE_LNG);
    // console.log("Distance:", distanceInMeters);

    // if (distance > OFFICE_RADIUS) {
    //   return ResponseUtil.errorResponse(
    //     res,
    //     STATUS_CODES.BAD_REQUEST,
    //     `You are ${distanceInMeters}m away. Allowed range is ${OFFICE_RADIUS}m`,
    //   );
    // }

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

    if (!date) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Date is required",
      );
    }

    const leaveDateStr = new Date(date).toLocaleDateString("en-CA", {
      timeZone: "Asia/Karachi",
    });

    const year = Number(leaveDateStr.split("-")[0]);
    const month = Number(leaveDateStr.split("-")[1]);

    const leaveCount = await AttendanceModel.countDocuments({
      user: req.userId,
      year,
      month,
      isLeave: true,
    });

    if (leaveCount >= 2) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Leave balance exceeded",
      );
    }

    const existing = await AttendanceModel.findOne({
      user: req.userId,
      date: leaveDateStr,
    });

    if (existing) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        ATTENDANCE_CONSTANT.ALREADY_EXISTS,
      );
    }

    const now = getPakistanTime();

    const leave = await AttendanceModel.create({
      user: req.userId,
      year,
      month,
      date: leaveDateStr,
      isLeave: true,
      status: "PENDING",
      notes,
      time: {
        checkIn: now.full,
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

    if (!["APPROVED", "REJECTED"].includes(status)) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid status",
      );
    }

    const leave: any = await AttendanceModel.findOne({
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

    if (leave.status !== "PENDING") {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Leave already processed",
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
    const now = getPakistanTime();
    const todayDate = now.date;

    const openAttendance = await AttendanceModel.findOne({
      user: req.userId,
      isLeave: { $ne: true },
      "time.checkOut": null,
    }).sort({ createdAt: -1 });

    if (openAttendance) {
      return ResponseUtil.successResponse(
        res,
        STATUS_CODES.SUCCESS,
        { attendance: openAttendance },
        "Open attendance found",
      );
    }

    const attendance = await AttendanceModel.findOne({
      user: req.userId,
      date: todayDate,
      isLeave: { $ne: true },
    });

    if (!attendance) {
      return ResponseUtil.successResponse(
        res,
        STATUS_CODES.SUCCESS,
        { attendance: null },
        "No attendance found for today",
      );
    }

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
  const formatToPKT = (inputTime: any) => {
    const dateObj = new Date(inputTime);

    const date = dateObj.toLocaleDateString("en-CA", {
      timeZone: "Asia/Karachi",
    });

    const time = dateObj.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Karachi",
      hour12: false,
    });

    return `${date} ${time}`;
  };

  const fixCheckoutIfNeeded = (checkIn: string, checkOut: string) => {
    const inDate = new Date(checkIn);
    let outDate = new Date(checkOut);

    if (outDate <= inDate) {
      outDate.setDate(outDate.getDate() + 1);
    }

    const date = outDate.toLocaleDateString("en-CA", {
      timeZone: "Asia/Karachi",
    });

    const time = outDate.toLocaleTimeString("en-GB", {
      timeZone: "Asia/Karachi",
      hour12: false,
    });

    return `${date} ${time}`;
  };
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

    if (status === "APPROVED") {
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

      let attendance: any = await AttendanceModel.findOne({
        user: request.user,
        date: requestDateStr,
      });

      if (!attendance) {
        attendance = await AttendanceModel.create({
          user: request.user,
          year,
          month,
          date: requestDateStr,
          time: {
            checkIn:
              request.type === "CHECK_IN" ? formatToPKT(request.time) : null,

            checkOut:
              request.type === "CHECK_OUT" ? formatToPKT(request.time) : null,
          },
          notes: request.notes || "",
        });
      } else {
        if (request.type === "CHECK_IN")
          attendance.time.checkIn = formatToPKT(request.time);
        if (request.type === "CHECK_OUT")
          attendance.time.checkOut = fixCheckoutIfNeeded(
            attendance.time.checkIn,
            formatToPKT(request.time),
          );

        if (request.type === "CHECK_IN") {
          attendance.notes = "Check-In";
        }

        if (request.type === "CHECK_OUT") {
          attendance.notes = `Check-In | Check-Out: ${request.notes || "Checked out from system"}`;
        }

        await attendance.save();
      }
    }

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
