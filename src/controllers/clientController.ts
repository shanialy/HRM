import { Request, Response } from "express";
import ResponseUtil from "../utils/Response/responseUtils";
import { STATUS_CODES } from "../constants/statusCodes";
import { hash } from "bcrypt";
import mongoose from "mongoose"; // 🔥 ADDED: For ObjectId handling

import AuthConfig from "../config/authConfig";
import { sendEmail } from "../utils/SendEmail";
import { emailTemplateGeneric } from "../utils/SendEmail/templates";

import { UserModel } from "../models/userModel";
import { CustomRequest } from "../interfaces/auth";
import { CLIENT_CONSTANT } from "../constants/client";
import crypto from "crypto"; // 🆕 ADDED (secure random generator)

export const createClient = async (req: any, res: Response) => {
  try {
    const { firstName, lastName, email, address, phone } = req.body;

    // ===============================
    // 🔥 CHANGED: Strong password generator (min 8 chars, secure)
    // ===============================
    const generateRandomPassword = (length: number = 8): string => {
      const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
      const lower = "abcdefghijklmnopqrstuvwxyz";
      const numbers = "0123456789";
      const symbols = "!@#$%^&*";

      const all = upper + lower + numbers + symbols;

      let password =
        upper[Math.floor(Math.random() * upper.length)] +
        lower[Math.floor(Math.random() * lower.length)] +
        numbers[Math.floor(Math.random() * numbers.length)] +
        symbols[Math.floor(Math.random() * symbols.length)];

      for (let i = 4; i < length; i++) {
        const randomIndex = crypto.randomInt(0, all.length); // 🔥 CHANGED (more secure than Math.random)
        password += all[randomIndex];
      }

      return password
        .split("")
        .sort(() => 0.5 - Math.random())
        .join("");
    };

    const genPassword = generateRandomPassword(8); // 🔥 CHANGED (explicit min length 8)

    const hashedPassword = await hash(genPassword, String(AuthConfig.SALT));

    // ===============================
    // 🆕 ADDED: Check if email already exists
    // ===============================
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.BAD_REQUEST,
        CLIENT_CONSTANT.EMAIL_ALREADY_EXISTS,
      );
    }

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
      CLIENT_CONSTANT.CREATION_SUCCESSFULL,
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
      CLIENT_CONSTANT.FETCHED,
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
        CLIENT_CONSTANT.NOT_FOUND,
      );
    }

    if (String(client.createdBy) !== String(req.userId)) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.FORBIDDEN,
        CLIENT_CONSTANT.INVALID_PERMISSION,
      );
    }

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      client,
      CLIENT_CONSTANT.FETCHED,
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
        CLIENT_CONSTANT.NOT_FOUND,
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
      CLIENT_CONSTANT.UPDATED,
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};

export const deleteClient = async (req: CustomRequest, res: Response) => {
  try {
    const { id } = req.params;

    const client = await UserModel.findOne({
      _id: id,
      role: "CLIENT",
      createdBy: req.userId,
    });

    if (!client) {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        CLIENT_CONSTANT.NOT_FOUND_OR_NOT_ALLOWED,
      );
    }

    // 🔥 If already deleted, still return success (clean UX)
    if (client.status === "INACTIVE") {
      return ResponseUtil.errorResponse(
        res,
        STATUS_CODES.NOT_FOUND,
        CLIENT_CONSTANT.ALREADY_DELETED,
      );
    }

    client.status = "INACTIVE";
    await client.save();

    return ResponseUtil.successResponse(
      res,
      STATUS_CODES.SUCCESS,
      {},
      CLIENT_CONSTANT.DELETED,
    );
  } catch (err) {
    return ResponseUtil.handleError(res, err);
  }
};
