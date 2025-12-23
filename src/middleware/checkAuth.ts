import jwt from "jsonwebtoken";
import { Response, NextFunction } from "express";
import AuthConfig from "../config/authConfig";
import {
  CustomOptionalRequest,
  CustomRequest,
  JwtPayload,
} from "../interfaces/auth/index";

export const checkAuth = (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  const token = req.headers["authorization"];

  if (!token) {
    return res.status(410).json({ message: "UnAuthorized Request" });
  }

  jwt.verify(String(token), String(AuthConfig.JWT_SECRET), (err, decoded) => {
    if (err) {
      return res.status(440).json({ message: "Token Expired" });
    }

    const decodedPayload = decoded as JwtPayload;
    req.userId = decodedPayload.id;
    req.email = decodedPayload.email;
    req.role = decodedPayload.role ? decodedPayload.role : "";
    next();
  });
};
