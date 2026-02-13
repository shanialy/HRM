import { Request, Response } from "express";
import ResponseUtil from "../utils/Response/responseUtils";
import { STATUS_CODES } from "../constants/statusCodes";
import { hash } from "bcrypt";
import { AUTH_CONSTANTS } from "../constants/messages";
import { compareSync } from "bcrypt";
import { generateToken } from "../utils/Token";
import AuthConfig from "../config/authConfig";
import { sendEmail } from "../utils/SendEmail";
import { emailTemplateGeneric } from "../utils/SendEmail/templates";
import { generateRandomPassword } from "../middleware/passwordGenerator";
import { UserModel } from "../models/userModel";
import { CustomRequest } from "../interfaces/auth";
import mongoose from "mongoose";

export const createClient = async (req: any, res: Response) => {
  try {
    const { firstName, lastName, email, address, phone } = req.body;

    // generate password
    const genPassword = generateRandomPassword();

    const hashedPassword = await hash(genPassword, String(AuthConfig.SALT));

    // create user
    const user = await UserModel.create({
      firstName,
      lastName,
      address,
      phone,
      email,
      password: hashedPassword,
      role: "CLIENT",
      createdBy: req.userId,
      assignedEmployee: req.userId,
      status: "ACTIVE",
    });

    // send email
    const template = emailTemplateGeneric(
      "Welcome to the TSH Services",
      firstName,
      email,
      genPassword,
    );

    await sendEmail(email, "Your account has been created", template);

    const clientResponse: any = user.toObject();
    delete clientResponse.password;

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      clientResponse,
      "Client created successfully",
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const getMyClients = async (req: CustomRequest, res: Response) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {
      role: "CLIENT",
      createdBy: req.userId,
      status: "ACTIVE",
    };

    const [clients, totalClients] = await Promise.all([
      UserModel.find(filter)
        .select("firstName lastName email address phone status createdAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      UserModel.countDocuments(filter),
    ]);

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      {
        clients,
        pagination: {
          total: totalClients,
          page,
          limit,
          totalPages: Math.ceil(totalClients / limit),
        },
      },
      "Clients fetched successfully",
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const getSingleClient = async (req: CustomRequest, res: Response) => {
  try {
    const clientId = req.params.id;

    const client = await UserModel.findOne({
      _id: clientId,
      role: "CLIENT",
      status: "ACTIVE",
    }).select(
      "firstName lastName email address phone status createdBy createdAt",
    );

    if (!client) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        "Client not found",
      );
    }

    if (String(client.createdBy) !== String(req.userId)) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        "You are not allowed to view this client",
      );
    }

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      client,
      "Client fetched successfully",
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const updateClient = async (req: CustomRequest, res: Response) => {
  try {
    const clientId = req.params.id;
    const { firstName, lastName, email, city } = req.body;

    const client = await UserModel.findOne({
      _id: clientId,
      role: "CLIENT",
      status: "ACTIVE",
      createdBy: req.userId, // 🔥 authorization handled in query
    });

    if (!client) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        "Client not found",
      );
    }

    if (firstName !== undefined) client.firstName = firstName;
    if (lastName !== undefined) client.lastName = lastName;
    if (email !== undefined) client.email = email;
    if (city !== undefined) client.address = city;

    await client.save();

    const { password, ...safeClient } = client.toObject();

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      safeClient,
      "Client updated successfully",
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const deleteClient = async (req: CustomRequest, res: Response) => {
  try {
    const clientId = req.params.id;

    const client = await UserModel.findOne({
      _id: clientId,
      role: "CLIENT",
      status: "ACTIVE",
      createdBy: req.userId,
    });

    if (!client) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        "Client not found or you are not allowed to delete this client",
      );
    }

    client.status = "INACTIVE";
    await client.save();

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      {},
      "Client deleted successfully",
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const clientLogin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.findOne({
      email,
      role: "CLIENT",
      status: "ACTIVE",
    });

    if (!user) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        "Invalid credentials",
      );
    }

    const isPasswordValid = compareSync(password, String(user.password));

    if (!isPasswordValid) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        AUTH_CONSTANTS.PASSWORD_MISMATCH,
      );
    }

    const token = generateToken({
      id: String(user._id),
      email: user.email!,
      role: user.role,
    });

    const { password: _, ...safeUser } = user.toObject();

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      { user: safeUser, token },
      "Client logged in successfully",
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};
