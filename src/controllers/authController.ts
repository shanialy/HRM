import { Request, Response } from "express";
import { AccountModel } from "../models/accountModel";
import ResponseUtil from "../utils/Response/responseUtils";
import { STATUS_CODES } from "../constants/statusCodes";
import { AUTH_CONSTANTS } from "../constants/messages";
import { compareSync } from "bcrypt";
import { generateToken } from "../utils/Token";
import { CustomRequest } from "../interfaces/auth";
import { hash } from "crypto";
import AuthConfig from "../config/authConfig";

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    let user: any = await AccountModel.findOne({ email });
    if (!user) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        AUTH_CONSTANTS.USER_NOT_FOUND
      );
    }
    const hashpass = compareSync(password, String(user.password));

    if (!hashpass) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        AUTH_CONSTANTS.PASSWORD_MISMATCH
      );
    }

    const token = generateToken({
      email: email,
      id: String(user._id),
      role: String(user.role),
    });

    user = user.toObject();
    delete user.password;

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { user, token },
      AUTH_CONSTANTS.LOGGED_IN
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const createEmployee = async (req: CustomRequest, res: Response) => {
  try {
    const { name, email, password, isSales, targetAmount } = req.body;

    const existing = await AccountModel.findOne({ email });
    if (existing) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        AUTH_CONSTANTS.USER_ALREADY_EXISTS
      );
    }

    const hashedPassword = await hash(password, String(AuthConfig.SALT));

    await AccountModel.create({
      name,
      email,
      password: hashedPassword,
      role: "EMPLOYEE",
      isSales: isSales || false,
      targetAmount: isSales ? targetAmount : 0,
      createdBy: req.userId,
      permissions: {
        createUser: true,
        chatAccess: true,
      },
      status: "ACTIVE",
    });

    //send email to employee with login details

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      {},
      AUTH_CONSTANTS.CREATED
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const createUser = async (req: CustomRequest, res: Response) => {
  try {
    const { name, password, email } = req.body;
    const hashedPassword = await hash(password, String(AuthConfig.SALT));

    const user = await AccountModel.create({
      name,
      email,
      password: hashedPassword,
      role: "USER",
      createdBy: req.userId,
      assignedEmployee: req.userId,
      status: "ACTIVE",
    });

    //Send Email or SMS with login details to the user

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      user,
      AUTH_CONSTANTS.CREATED
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};
