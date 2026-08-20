import type { NextFunction, Request, Response } from "express";
import { prisma } from "../config/db.js";

export async function getMe(req: Request, res: Response, next: NextFunction) {
    try {
        const userId = req.user!.userId;

        const user = await prisma.user.findUnique({
            where: {
                id: userId,
            },
            select: {
                id: true,
                username: true,
                email: true,
                profile: {
                    select: {
                        displayName: true,
                        bio: true,
                        avatarUrl: true,
                        course: true,
                        department: true,
                        year: true,
                        graduationYear: true,
                    },
                },
            },
        });

        if (!user) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        return res.status(200).json({ user });
    } catch (error) {
        next(error);
    }
}

export async function patchMe(req: Request, res: Response, next: NextFunction) {
    try {
        const {
            displayName,
            bio,
            avatarUrl,
            course,
            department,
            year,
            graduationYear,
        } = req.body;

        const data = {
            ...(displayName !== undefined && { displayName }),
            ...(bio !== undefined && { bio }),
            ...(avatarUrl !== undefined && { avatarUrl }),
            ...(course !== undefined && { course }),
            ...(department !== undefined && { department }),
            ...(year !== undefined && { year }),
            ...(graduationYear !== undefined && { graduationYear }),
        };

        await prisma.profile.update({
            where: {
                userId: req.user!.userId,
            },
            data,
        });

        return res.status(200).json({
            message: "Profile updated successfully",
        });
    } catch (error) {
        next(error);
    }
}
