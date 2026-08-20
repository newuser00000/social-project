import { z } from "zod";

export const patchMeSchema = z
    .object({
        displayName: z.string().max(100).nullable().optional(),
        bio: z.string().max(500).nullable().optional(),
        avatarUrl: z.string().url().nullable().optional(),
        course: z.string().max(100).nullable().optional(),
        department: z.string().max(100).nullable().optional(),
        year: z.number().int().nullable().optional(),
        graduationYear: z.number().int().nullable().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
        message: "At least one field is required",
    });
