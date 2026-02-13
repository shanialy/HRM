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
import { EMPLOYEE_CONSTANT } from "../constants/employee";

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
      EMPLOYEE_CONSTANT.FETCHED,
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
        EMPLOYEE_CONSTANT.DENIED,
      );
    }

    const { id } = req.params;

    if (!id) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        EMPLOYEE_CONSTANT.ID_REQUIRED,
      );
    }

    const employee = await UserModel.findById(id).select("-password");

    if (!employee) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        EMPLOYEE_CONSTANT.NOT_FOUND,
      );
    }

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { employee },
      EMPLOYEE_CONSTANT.FETCHED,
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
      EMPLOYEE_CONSTANT.UPDATED,
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};
