import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import argon2 from "argon2";
import { prisma } from "../config/db.js";
import type { Request, Response } from "express";
import config from "../config/config.js";

export async function register(req: Request, res: Response) {
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
        console.error("REGISTER ERROR:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}

export async function login(req: Request, res: Response) {
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
        console.error("LOGIN ERROR:", error);

        return res.status(500).json({
            message: "Internal server error",
        });
    }
}
