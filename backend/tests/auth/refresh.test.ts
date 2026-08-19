import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import request from "supertest";
import { prisma } from "../../src/config/db.js";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import config from "../../src/config/config.js";

describe("REFRESH - FAILURE CASES", () => {
    it("should not refresh without a refresh token", async () => {
        const response = await request(app).post("/api/auth/refresh").send({});

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            message: "Refresh token is required",
        });
        expect(response.body.accessToken).toBeUndefined();

        const sessions = await prisma.session.findMany();

        expect(sessions).toHaveLength(0);
    });

    it("should not refresh with an invalid refresh token", async () => {
        const response = await request(app)
            .post("/api/auth/refresh")
            .set("Cookie", "refreshToken=invalid-token");

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            message: "Invalid token",
        });
        expect(response.body.accessToken).toBeUndefined();

        const sessions = await prisma.session.findMany();
        expect(sessions).toHaveLength(0);
    });

    it("should not refresh with a token signed with wrong secret", async () => {
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
            .post("/api/auth/refresh")
            .set("Cookie", `refreshToken=${refreshToken}`);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            message: "Invalid token",
        });
        expect(response.body.accessToken).toBeUndefined();

        const sessions = await prisma.session.findMany();
        expect(sessions).toHaveLength(0);
    });

    it("should not refresh with an expired refresh token", async () => {
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
            .post("/api/auth/refresh")
            .set("Cookie", `refreshToken=${refreshToken}`);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            message: "Invalid token",
        });
        expect(response.body.accessToken).toBeUndefined();

        const sessions = await prisma.session.findMany();
        expect(sessions).toHaveLength(0);
    });

    it("should not refresh if there is no valid session", async () => {
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
            .post("/api/auth/refresh")
            .set("Cookie", `refreshToken=${refreshToken}`);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            message: "Invalid token",
        });
        expect(response.body.accessToken).toBeUndefined();

        const sessions = await prisma.session.findMany();
        expect(sessions).toHaveLength(0);
    });

    it("should not refresh if the session is revoked", async () => {
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
            .post("/api/auth/refresh")
            .set("Cookie", `refreshToken=${refreshToken}`);

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            message: "Invalid token",
        });
        expect(response.body.accessToken).toBeUndefined();
    });
});

describe("REFRESH - SUCCESS CASES", () => {
    it("should successfully refresh the tokens", async () => {
        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                email: "test@test.com",
                username: "testuser",
                password: "test123456",
            });
        expect(registerResponse.status).toBe(201);

        const firstSession = await prisma.session.findMany();
        expect(firstSession).toHaveLength(1);
        const firstSessionId = firstSession[0]!.id;

        const registerCookies = registerResponse.headers["set-cookie"];

        expect(registerCookies).toBeDefined();

        if (!registerCookies) {
            throw new Error("Expected refreshToken cookie");
        }

        const registerRefreshToken = registerCookies[0]
            ?.split(";")[0]
            ?.split("=")[1];

        if (!registerRefreshToken) {
            throw new Error("Refresh token not found in cookie");
        }

        const refreshResponse = await request(app)
            .post("/api/auth/refresh")
            .set("Cookie", `refreshToken=${registerRefreshToken}`);

        const secondSession = await prisma.session.findMany();
        expect(secondSession).toHaveLength(1);
        const secondSessionId = secondSession[0]!.id;

        expect(firstSessionId).toBe(secondSessionId);

        expect(refreshResponse.status).toBe(200);
        expect(refreshResponse.body.message).toBe(
            "Access token refreshed successfully",
        );
        expect(refreshResponse.body.accessToken).toBeDefined();

        const cookies = refreshResponse.headers["set-cookie"];

        expect(cookies).toBeDefined();

        if (!cookies) {
            throw new Error("Expected refreshToken cookie");
        }

        const refreshRefreshToken = cookies[0]?.split(";")[0]?.split("=")[1];

        if (!refreshRefreshToken) {
            throw new Error("Refresh token not found in cookie");
        }

        const refreshTokenHash = crypto
            .createHash("sha256")
            .update(refreshRefreshToken)
            .digest("hex");

        const sessions = await prisma.session.findMany();

        expect(sessions).toHaveLength(1);

        const session = sessions[0];

        expect(session?.tokenHash).toBe(refreshTokenHash);

        const oldTokenResponse = await request(app)
            .post("/api/auth/refresh")
            .set("Cookie", `refreshToken=${registerRefreshToken}`);

        expect(oldTokenResponse.status).toBe(401);
        expect(oldTokenResponse.body).toEqual({
            message: "Invalid token",
        });
        expect(oldTokenResponse.body.accessToken).toBeUndefined();

        const secondRefreshResponse = await request(app)
            .post("/api/auth/refresh")
            .set("Cookie", `refreshToken=${refreshRefreshToken}`);

        expect(secondRefreshResponse.status).toBe(200);
        expect(secondRefreshResponse.body.message).toBe(
            "Access token refreshed successfully",
        );
        expect(secondRefreshResponse.body.accessToken).toBeDefined();
    });
});
