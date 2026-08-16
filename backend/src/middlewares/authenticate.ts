import jwt from "jsonwebtoken";
import config from "../config/config.js";
import type { NextFunction, Request, Response } from "express";

export default async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }

    const accessToken = authHeader.split(" ")[1];

    if (!accessToken) {
        return res.status(401).json({
            message: "Unauthorized",
        });
    }

    try {
        const decoded = jwt.verify(accessToken, config.JWT_SECRET);

        req.user = decoded;
        next();
    } catch {
        return res.status(401).json({
            message: "Invalid or expired access token",
        });
    }
}
