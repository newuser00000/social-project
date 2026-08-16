import type { Request, Response, NextFunction } from "express";
import type { ZodType } from "zod";

export function validate(schema: ZodType) {
    return (req: Request, res: Response, next: NextFunction) => {
        const result = schema.safeParse(req.body);

        if (!result.success) {
            const errors: Record<string, string> = {};

            for (const issue of result.error.issues) {
                const field = issue.path[0];

                if (typeof field === "string") {
                    errors[field] = issue.message;
                }
            }

            return res.status(400).json({
                message: "Validation failed",
                errors,
            });
        }

        req.body = result.data;

        next();
    };
}
