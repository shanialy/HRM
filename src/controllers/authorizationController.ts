import { Request, Response } from "express";
import ResponseUtil from "../utils/Response/responseUtils";
import { STATUS_CODES } from "../constants/statusCodes";
import { AUTH_CONSTANTS } from "../constants/messages";
import { compareSync } from "bcrypt";
import { generateToken } from "../utils/Token";
import { CustomRequest } from "../interfaces/auth";
import { hash } from "bcrypt";
import AuthConfig from "../config/authConfig";
import { UserModel } from "../models/userModel";

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

export const createEmployee = async (req: any, res: Response) => {
  try {
    if (req.role !== "ADMIN") {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Access denied",
      );
    }

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

    if (!firstName || !lastName || !email) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Required fields are missing",
      );
    }

    const existing = await UserModel.findOne({ email });
    if (existing) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        AUTH_CONSTANTS.USER_ALREADY_EXISTS,
      );
    }

    const hashedPassword = await hash("Password@12", String(AuthConfig.SALT));

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
      userType,
      salary,
      targetAmount: userType === "SALES" ? targetAmount || 0 : 0,
      createdBy: req.userId,
      status: "ACTIVE",
    });

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { employee },
      "Employee created successfully",
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const getAllEmployees = async (req: any, res: Response) => {
  try {
    if (req.role !== "ADMIN") {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Access denied",
      );
    }
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 5;
    const skip = (page - 1) * limit;

    const employees = await UserModel.find({ role: "EMPLOYEE" })
      .select("-password")
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
      "Employees fetched successfully",
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

// GET /employee/:id
export const getEmployeeById = async (req: any, res: Response) => {
  try {
    if (req.role !== "ADMIN") {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Access denied",
      );
    }

    const { id } = req.params;

    if (!id) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Employee ID is required",
      );
    }

    const employee = await UserModel.findById(id).select("-password");

    if (!employee) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        "Employee not found",
      );
    }

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { employee },
      "Employee fetched successfully",
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const getSingleEmployee = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    if (req.role !== "ADMIN") {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Access denied",
      );
    }

    const employee = await UserModel.findById(id).select("-password");

    if (!employee) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        "Employee not found",
      );
    }

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { employee },
      "Employee fetched successfully",
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const updateEmployee = async (req: any, res: Response) => {
  try {
    const { id } = req.params;

    if (req.role !== "ADMIN") {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Access denied",
      );
    }

    const updatedEmployee = await UserModel.findOneAndUpdate(
      { _id: id, role: "EMPLOYEE" },
      { $set: req.body },
      { new: true },
    ).select("-password");

    if (!updatedEmployee) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        "Employee not found",
      );
    }

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { employee: updatedEmployee },
      "Employee updated successfully",
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const changeEmployeeStatus = async (req: any, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !["ACTIVE", "INACTIVE"].includes(status)) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Status must be ACTIVE or INACTIVE",
      );
    }

    if (req.role !== "ADMIN") {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "Access denied",
      );
    }

    const employee = await UserModel.findOneAndUpdate(
      { _id: id, role: "EMPLOYEE" },
      { status },
      { new: true },
    ).select("-password");

    if (!employee) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        "Employee not found",
      );
    }

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { employee },
      "Employee status updated successfully",
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};
