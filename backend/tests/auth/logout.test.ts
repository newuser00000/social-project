import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import request from "supertest";
import { prisma } from "../../src/config/db.js";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import config from "../../src/config/config.js";

describe("LOGOUT - FAILURE CASES", () => {
    it("should not logout without a refresh token", async () => {
        const response = await request(app).post("/api/auth/logout").send({});

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            message: "Refresh token is required",
        });

        const sessions = await prisma.session.findMany();

        expect(sessions).toHaveLength(0);
    });

    it("should not logout with an invalid refresh token", async () => {
        const response = await request(app)
            .post("/api/auth/logout")
            .set("Cookie", "refreshToken=invalid-token");

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            message: "Invalid token",
        });

        const sessions = await prisma.session.findMany();
        expect(sessions).toHaveLength(0);
    });

    it("should not logout with a token signed with wrong secret", async () => {
        const refreshToken = jwt.sign(
            {
                userId: 5,
                jti: crypto.randomUUID(),
            },
            "wrong-secret",
            {
                expiresIn: "7d",
            },
        );

        const response = await request(app)
            .post("/api/auth/logout")
            .set("Cookie", `refreshToken=${refreshToken}`);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            message: "Invalid token",
        });

        const sessions = await prisma.session.findMany();
        expect(sessions).toHaveLength(0);
    });

    it("should not logout with an expired refresh token", async () => {
        const refreshToken = jwt.sign(
            {
                userId: 5,
                jti: crypto.randomUUID(),
            },
            config.JWT_SECRET,
            {
                expiresIn: -1,
            },
        );

        const response = await request(app)
            .post("/api/auth/logout")
            .set("Cookie", `refreshToken=${refreshToken}`);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            message: "Invalid token",
        });

        const sessions = await prisma.session.findMany();
        expect(sessions).toHaveLength(0);
    });

    it("should not logout if there is no valid session", async () => {
        const refreshToken = jwt.sign(
            {
                userId: 5,
                jti: crypto.randomUUID(),
            },
            config.JWT_SECRET,
            {
                expiresIn: "7d",
            },
        );

        const response = await request(app)
            .post("/api/auth/logout")
            .set("Cookie", `refreshToken=${refreshToken}`);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            message: "Invalid token",
        });
        expect(response.body.accessToken).toBeUndefined();

        const sessions = await prisma.session.findMany();
        expect(sessions).toHaveLength(0);
    });

    it("should not logout if the session is revoked", async () => {
        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                email: "test@test.com",
                username: "testuser",
                password: "test123456",
            });
        expect(registerResponse.status).toBe(201);

        const cookies = registerResponse.headers["set-cookie"];

        expect(cookies).toBeDefined();

        if (!cookies) {
            throw new Error("Expected refreshToken cookie");
        }

        const refreshToken = cookies[0]?.split(";")[0]?.split("=")[1];

        if (!refreshToken) {
            throw new Error("Refresh token not found in cookie");
        }

        const refreshTokenHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        await prisma.session.update({
            where: {
                tokenHash: refreshTokenHash,
            },
            data: {
                revoked: true,
            },
        });

        const response = await request(app)
            .post("/api/auth/logout")
            .set("Cookie", `refreshToken=${refreshToken}`);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            message: "Invalid token",
        });
        expect(response.body.accessToken).toBeUndefined();
    });
});

describe("LOGOUT - SUCCESS CASES", () => {
    it("should successfully logout the user", async () => {
        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                email: "test@test.com",
                username: "testuser",
                password: "test123456",
            });
        expect(registerResponse.status).toBe(201);

        const cookies = registerResponse.headers["set-cookie"];

        expect(cookies).toBeDefined();

        if (!cookies) {
            throw new Error("Expected refreshToken cookie");
        }

        const refreshToken = cookies[0]?.split(";")[0]?.split("=")[1];

        if (!refreshToken) {
            throw new Error("Refresh token not found in cookie");
        }

        const refreshTokenHash = crypto
            .createHash("sha256")
            .update(refreshToken)
            .digest("hex");

        const logoutResponse = await request(app)
            .post("/api/auth/logout")
            .set("Cookie", `refreshToken=${refreshToken}`);

        expect(logoutResponse.status).toBe(200);
        expect(logoutResponse.body).toEqual({
            message: "Logout successful",
        });

        const session = await prisma.session.findUnique({
            where: {
                tokenHash: refreshTokenHash,
            },
        });

        expect(session?.revoked).toBe(true);

        const afterCookies = logoutResponse.headers["set-cookie"];

        expect(afterCookies).toBeDefined();

        if (!afterCookies) {
            throw new Error("Expected refreshToken cookie to be cleared");
        }

        expect(afterCookies).toHaveLength(1);
        expect(afterCookies[0]).toContain("refreshToken=");

        const refreshResponse = await request(app)
            .post("/api/auth/refresh")
            .set("Cookie", `refreshToken=${refreshToken}`);

        expect(refreshResponse.status).toBe(401);
        expect(refreshResponse.body).toEqual({
            message: "Invalid token",
        });
        expect(refreshResponse.body.accessToken).toBeUndefined();

        const sessions = await prisma.session.findMany();

        expect(sessions).toHaveLength(1);
    });
});
