import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import argon2 from "argon2";
import { prisma } from "../config/db.js";
import type { NextFunction, Request, Response } from "express";
import config from "../config/config.js";

export async function register(
    req: Request,
    res: Response,
    next: NextFunction,
) {
    try {
        const { email, username, password } = req.body;

        const isAlreayExistingEmail = await prisma.user.findUnique({
            where: { email },
        });

        if (isAlreayExistingEmail) {
            return res.status(409).json({
                message: "Email already exists",
            });
        }

        const isAlreayExistingUsername = await prisma.user.findUnique({
            where: { username },
        });

        if (isAlreayExistingUsername) {
            return res.status(409).json({
                message: "Username already exists",
            });
        }

        const passwordHash = await argon2.hash(password);

        const user = await prisma.user.create({
            data: {
                email,
                username,
                passwordHash,
                profile: {
                    create: {
                        displayName: username,
                    },
                },
            },
        });

        const refreshToken = jwt.sign(
            {
                userId: user.id,
                jti: crypto.randomUUID(),
            },
            config.JWT_SECRET,
            {
                expiresIn: "7d",
            },
        );

        const refreshTokenHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        const session = await prisma.session.create({
            data: {
                tokenHash: refreshTokenHash,
                userId: user.id,
                ...(req.ip && {
                    ipAddress: req.ip,
                }),

                ...(req.headers["user-agent"] && {
                    userAgent: req.headers["user-agent"],
                }),
            },
        });

        const accessToken = jwt.sign(
            {
                userId: user.id,
                sessionId: session.id,
            },
            config.JWT_SECRET,
            {
                expiresIn: "15m",
            },
        );

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            // secure: true,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(201).json({
            message: "User registered successfully",
            user: {
                username: user.username,
                email: user.email,
            },
            accessToken,
        });
    } catch (error) {
        next(error);
    }
}

export async function login(req: Request, res: Response, next: NextFunction) {
    try {
        const { email, password } = req.body;

        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }

        const isPasswordValid = await argon2.verify(
            user.passwordHash,
            password,
        );

        if (!isPasswordValid) {
            return res.status(401).json({
                message: "Invalid email or password",
            });
        }

        const refreshToken = jwt.sign(
            {
                userId: user.id,
                jti: crypto.randomUUID(),
            },
            config.JWT_SECRET,
            {
                expiresIn: "7d",
            },
        );

        const refreshTokenHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        const session = await prisma.session.create({
            data: {
                tokenHash: refreshTokenHash,
                userId: user.id,
                ...(req.ip && {
                    ipAddress: req.ip,
                }),

                ...(req.headers["user-agent"] && {
                    userAgent: req.headers["user-agent"],
                }),
            },
        });

        const accessToken = jwt.sign(
            {
                userId: user.id,
                sessionId: session.id,
            },
            config.JWT_SECRET,
            {
                expiresIn: "15m",
            },
        );

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            // secure: true,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
            message: "User Logged in successfully",
            user: {
                username: user.username,
                email: user.email,
            },
            accessToken,
        });
    } catch (error) {
        next(error);
    }
}

export async function refresh(req: Request, res: Response, next: NextFunction) {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                message: "Refresh token is required",
            });
        }

        const payload = jwt.verify(refreshToken, config.JWT_SECRET);

        if (typeof payload !== "object" || !payload.userId || !payload.jti) {
            return res.status(401).json({
                message: "Invalid token",
            });
        }

        const refreshTokenHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        const session = await prisma.session.findUnique({
            where: {
                tokenHash: refreshTokenHash,
                revoked: false,
            },
        });

        if (!session) {
            return res.status(401).json({
                message: "Invalid token",
            });
        }

        if (session.userId !== payload.userId) {
            return res.status(401).json({
                message: "Invalid token",
            });
        }

        const accessToken = jwt.sign(
            {
                userId: session.userId,
                sessionId: session.id,
            },
            config.JWT_SECRET,
            {
                expiresIn: "15m",
            },
        );

        const newRefreshToken = jwt.sign(
            {
                userId: session.userId,
                jti: crypto.randomUUID(),
            },
            config.JWT_SECRET,
            {
                expiresIn: "7d",
            },
        );

        const newRefreshTokenHash = crypto
            .createHash("sha256")
            .update(newRefreshToken)
            .digest("hex");

        await prisma.session.update({
            where: {
                id: session.id,
            },
            data: {
                tokenHash: newRefreshTokenHash,
            },
        });

        res.cookie("refreshToken", newRefreshToken, {
            httpOnly: true,
            // secure: true,
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        return res.status(200).json({
            message: "Access token refreshed successfully",
            accessToken,
        });
    } catch (error) {
        next(error);
    }
}

export async function logout(req: Request, res: Response, next: NextFunction) {
    try {
        const refreshToken = req.cookies.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({
                message: "Refresh token is required",
            });
        }

        const payload = jwt.verify(refreshToken, config.JWT_SECRET);

        if (typeof payload !== "object" || !payload.userId || !payload.jti) {
            return res.status(401).json({
                message: "Invalid token",
            });
        }

        const refreshTokenHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        const result = await prisma.session.updateMany({
            where: {
                tokenHash: refreshTokenHash,
                revoked: false,
            },
            data: {
                revoked: true,
            },
        });

        if (result.count === 0) {
            return res.status(401).json({
                message: "Invalid token",
            });
        }

        res.clearCookie("refreshToken", {
            httpOnly: true,
            sameSite: "strict",
        });

        return res.status(200).json({
            message: "Logout successful",
        });
    } catch (error) {
        next(error);
    }
}
