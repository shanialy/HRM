import { PutObjectCommand } from "@aws-sdk/client-s3";
// import { s3 } from ";
import { Request, Response } from "express";
import { s3 } from "../config/s3Config";

export const uploadFile = async (req: Request, res: Response) => {
  try {
    const file = req.file;

    if (!file) {
      return res.status(400).json({
        success: false,
        message: "No file uploaded",
      });
    }

    const fileKey = `${Date.now()}-${file.originalname}`;

    const command = new PutObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: fileKey,
      Body: file.buffer,
      ContentType: file.mimetype,
    });

    await s3.send(command);

    const fileUrl = `https://tsh-hrm-assets.s3.us-east-1.amazonaws.com/${fileKey}`;

    return res.status(200).json({
      success: true,
      data: {
        url: fileUrl,
        mimeType: file.mimetype,
      },
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      success: false,
      message: "File upload failed",
    });
  }
};
