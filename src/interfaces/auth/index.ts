import { Request } from "express";

export interface CustomRequest extends Request {
  userId?: string;
  email?: string;
  role?: string;
}
export interface CustomOptionalRequest extends Request {
  userId?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface JwtPayload {
  id: string;
  email: string;
  role: string;
}
