import { Request, Response } from "express";
import ResponseUtil from "../utils/Response/responseUtils";
import { STATUS_CODES } from "../constants/statusCodes";
import { AUTH_CONSTANTS } from "../constants/messages";
import { compareSync, hashSync } from "bcrypt";
import { generateToken } from "../utils/Token";
import { CustomRequest } from "../interfaces/auth";
import { hash } from "bcrypt";
import AuthConfig from "../config/authConfig";
import { UserModel } from "../models/userModel";
import { EMPLOYEE_CONSTANT } from "../constants/employee";
import mongoose from "mongoose";
import { any } from "zod";
import { sendEmail } from "../utils/SendEmail";
import { otpTemplate } from "../utils/SendEmail/templates";

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    let user: any = await UserModel.findOne({ email });
    if (!user) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        AUTH_CONSTANTS.USER_NOT_FOUND,
      );
    }
    const hashpass = compareSync(password, String(user.password));

    if (!hashpass) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        AUTH_CONSTANTS.PASSWORD_MISMATCH,
      );
    }

    if (user.status !== "ACTIVE") {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Your account is inactive. Please contact admin.",
      );
    }

    const token = generateToken({
      email: email,
      id: String(user._id),
      role: String(user.role),
      department: String(user.department),
    });

    user = user.toObject();
    delete user.password;

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { user, token },
      AUTH_CONSTANTS.LOGGED_IN,
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};
export const getProfile = async (req: CustomRequest, res: Response) => {
  try {
    let user: any = await UserModel.findById(req.userId);
    if (!user) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        AUTH_CONSTANTS.USER_NOT_FOUND,
      );
    }

    user = user.toObject();
    delete user.password;

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { user },
      AUTH_CONSTANTS.USER_FETCHED,
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const createEmployee = async (req: CustomRequest, res: Response) => {
  try {
    const {
      firstName,
      lastName,
      email,
      salary,
      userType,
      targetAmount,
      designation,
      department,
      phone,
      address,
    } = req.body;

    // 🔎 Check existing user
    const existing = await UserModel.findOne({ email });
    if (existing) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        AUTH_CONSTANTS.USER_ALREADY_EXISTS,
      );
    }

    // 🔐 Default password
    const defaultPassword = "Password@12";
    const hashedPassword = await hash(defaultPassword, Number(AuthConfig.SALT));

    const employee = await UserModel.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      role: "EMPLOYEE",
      designation,
      department,
      phone,
      address,
      userType, // jo bhi value aaye save ho
      salary,
      targetAmount, // direct save, no condition
      createdBy: req.userId,
      status: "ACTIVE",
    });

    const employeeObj = employee.toObject();
    const { password, ...employeeWithoutPassword } = employeeObj;

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { employee: employeeWithoutPassword },
      EMPLOYEE_CONSTANT.CREATED,
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};
export const getAllEmployees = async (req: CustomRequest, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const employees = await UserModel.find({ role: "EMPLOYEE" })
      .select("-password -assignedEmployee") // 🔥 hide both
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalEmployees = await UserModel.countDocuments({
      role: "EMPLOYEE",
    });

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      {
        employees,
        pagination: {
          total: totalEmployees,
          page,
          limit,
          totalPages: Math.ceil(totalEmployees / limit),
        },
      },
      EMPLOYEE_CONSTANT.FETCHED_ALL,
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const getEmployeeById = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        EMPLOYEE_CONSTANT.ID_REQUIRED,
      );
    }

    const employee = await UserModel.findOne({
      _id: id,
      role: "EMPLOYEE",
    }).select("-password -assignedEmployee");

    if (!employee) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        EMPLOYEE_CONSTANT.NOT_FOUND,
      );
    }

    // 🔥 Only SALES department gets clients
    if (employee.department?.toUpperCase() === "SALES") {
      const clients = await UserModel.find({
        role: "CLIENT",
        // ✅ FIXED: changed from assignedEmployee to createdBy
        // because client documents store employee reference in createdBy field
        createdBy: employee._id,
      }).select(
        "_id firstName lastName email address phone role status createdBy createdAt updatedAt",
      );

      return ResponseUtil.successResponse(
        res,
        STATUS_CODES.SUCCESS,
        {
          employee,
          clients,
        },
        EMPLOYEE_CONSTANT.FETCHED_ONE,
      );
    }

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { employee },
      EMPLOYEE_CONSTANT.FETCHED_ONE,
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};
export const updateEmployee = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const updatedEmployee = await UserModel.findOneAndUpdate(
      { _id: id, role: "EMPLOYEE" },
      { $set: req.body },
      { new: true },
    ).select("-password");

    if (!updatedEmployee) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        EMPLOYEE_CONSTANT.NOT_FOUND,
      );
    }

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { employee: updatedEmployee },
      EMPLOYEE_CONSTANT.UPDATED,
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const changeEmployeeStatus = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    const updatedEmployee = await UserModel.findOneAndUpdate(
      { _id: id, role: "EMPLOYEE" },
      { $set: req.body },
      { new: true },
    ).select("-password");

    if (!updatedEmployee) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        EMPLOYEE_CONSTANT.NOT_FOUND,
      );
    }

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { employee: updatedEmployee },
      EMPLOYEE_CONSTANT.UPDATED_STATUS,
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const changePassword = async (req: any, res: Response) => {
  try {
    const { oldPassword, newPassword } = req.body;

    let user: any = await UserModel.findById(req.userId);

    if (!user) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        AUTH_CONSTANTS.USER_NOT_FOUND,
      );
    }

    const hashpass = compareSync(oldPassword, String(user.password));

    if (!hashpass) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        AUTH_CONSTANTS.PASSWORD_MISMATCH,
      );
    }

    if (user.status !== "ACTIVE") {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Your account is inactive. Please contact admin.",
      );
    }

    const hashedPassword = hashSync(newPassword, 10);

    user.password = hashedPassword;
    await user.save();

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      {},
      AUTH_CONSTANTS.PASSWORD_CHANGED,
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    const user: any = await UserModel.findOne({ email });

    if (!user) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        AUTH_CONSTANTS.USER_NOT_FOUND,
      );
    }

    const otp = generateOtp();

    user.resetOtp = otp;
    user.resetOtpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    await user.save();

    const template = otpTemplate("Password Reset OTP", user.role, otp);

    await sendEmail(email, "Password Reset OTP", template);
    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      {},
      "OTP sent to your email",
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const resetPassword = async (req: Request, res: Response) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user: any = await UserModel.findOne({ email });

    if (!user) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        AUTH_CONSTANTS.USER_NOT_FOUND,
      );
    }

    if (!user.resetOtp || !user.resetOtpExpiry) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "OTP not requested",
      );
    }

    if (user.resetOtp !== otp) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid OTP",
      );
    }

    if (user.resetOtpExpiry < new Date()) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "OTP expired",
      );
    }

    const hashedPassword = hashSync(newPassword, 10);

    user.password = hashedPassword;
    user.resetOtp = undefined;
    user.resetOtpExpiry = undefined;

    await user.save();

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      {},
      "Password reset successfully",
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};
