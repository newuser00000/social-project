import type { NextFunction, Request, Response } from "express";
import { Prisma } from "../../generated/prisma/client.js";
import jwt from "jsonwebtoken";

export default function errorHandler(
    error: unknown,
    req: Request,
    res: Response,
    next: NextFunction,
) {
    console.error(error);

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code == "P2002") {
            return res.status(409).json({
                message: "Resource already exist",
            });
        }
        if (error.code == "P2025") {
            return res.status(404).json({
                message: "Resource not found",
            });
        }
    }

    if (error instanceof jwt.JsonWebTokenError) {
        return res.status(401).json({
            message: "Invalid token",
        });
    }

    return res.status(500).json({
        message: "Internal server error",
    });
}
