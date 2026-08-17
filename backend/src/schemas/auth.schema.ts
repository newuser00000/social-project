import { z } from "zod";

export const registerSchema = z.object({
    email: z
        .string({
            error: (issue) =>
                issue.input === undefined
                    ? "Email is required"
                    : "Email must be a string",
        })
        .email("Invalid email address"),

    username: z
        .string({
            error: (issue) =>
                issue.input === undefined
                    ? "Username is required"
                    : "Username must be a string",
        })
        .min(3, "Username must be at least 3 characters")
        .max(30, "Username must be at most 30 characters"),

    password: z
        .string({
            error: (issue) =>
                issue.input === undefined
                    ? "Password is required"
                    : "Password must be a string",
        })
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password must be at most 128 characters"),
});

export const loginSchema = z.object({
    email: z
        .string({
            error: (issue) =>
                issue.input === undefined
                    ? "Email is required"
                    : "Email must be a string",
        })
        .email("Invalid email address"),

    password: z
        .string({
            error: (issue) =>
                issue.input === undefined
                    ? "Password is required"
                    : "Password must be a string",
        })
        .min(8, "Password must be at least 8 characters")
        .max(128, "Password must be at most 128 characters"),
});
