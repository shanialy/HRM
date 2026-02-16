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
  next: NextFunction,
) => {
  console.log("Incoming:", req.method, req.originalUrl);
  console.log("Auth Header:", req.headers.authorization);
  const authHeader = req.headers.authorization;
  console.log("HEADERS:", req.headers);

  if (!authHeader) {
    return res.status(401).json({ message: "UnAuthorized Request" });
  }
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.split(" ")[1]
    : authHeader;

  console.log("AUTH HEADER:", authHeader);

  jwt.verify(String(token), String(AuthConfig.JWT_SECRET), (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Token Expired" });
    }

    const decodedPayload = decoded as JwtPayload;
    console.log("JWT DECODED:", decodedPayload);
    req.userId = decodedPayload.id;
    req.email = decodedPayload.email;
    req.role = decodedPayload.role ? decodedPayload.role : "";
    req.department = decodedPayload.department ? decodedPayload.department : "";
    next();
  });
};
