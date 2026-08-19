import jwt from "jsonwebtoken";
import config from "../config/config.js";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/db.js";

export default async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }

        const decoded = jwt.verify(token, config.JWT_SECRET);

        if (
            typeof decoded !== "object" ||
            !decoded.userId ||
            !decoded.sessionId
        ) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }

        const session = await prisma.session.findUnique({
            where: {
                id: decoded.sessionId,
            },
        });

        if (!session || session.userId !== decoded.userId || session.revoked) {
            return res.status(401).json({
                message: "Unauthorized",
            });
        }

        req.user = {
            userId: decoded.userId,
            sessionId: decoded.sessionId,
        };

        next();
    } catch (error) {
        next(error);
    }
}
