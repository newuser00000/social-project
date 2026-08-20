import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../../src/app.js";
import jwt from "jsonwebtoken";
import config from "../../src/config/config.js";
import { prisma } from "../../src/config/db.js";
import crypto from "node:crypto";

describe.skip("AUTHENTICATION - FAILURE CASES", () => {
    it("should not authneticate without an access token", async () => {
        const response = await request(app).get("/");

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            message: "Unauthorized",
        });
    });

    it("should not authenticate with an invalid format token", async () => {
        const response = await request(app)
            .get("/")
            .set("Authorization", "Basic abc123");

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            message: "Unauthorized",
        });
    });

    it("should not authenticate without an actual token", async () => {
        const response = await request(app)
            .get("/")
            .set("Authorization", "Bearer ");

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            message: "Unauthorized",
        });
    });

    it("should not authenticate with a token signed with wrong secret", async () => {
        const accesshToken = jwt.sign(
            {
                userId: 5,
                sessionId: 1,
            },
            "wrong-secret",
            {
                expiresIn: "15m",
            },
        );

        const respone = await request(app)
            .get("/")
            .set("Authorization", `Bearer ${accesshToken}`);

        expect(respone.status).toBe(401);
        expect(respone.body).toEqual({
            message: "Invalid token",
        });
    });

    it("should not authenticate with an invalide access token", async () => {
        const response = await request(app)
            .get("/")
            .set("Authorization", "Bearer invalidtoken");

        expect(response.status).toBe(401);
        expect(response.body).toEqual({
            message: "Invalid token",
        });
    });

    it("should not authenticate if the session does not exist", async () => {
        const accesshToken = jwt.sign(
            {
                userId: 5,
                sessionId: 1,
            },
            config.JWT_SECRET,
            {
                expiresIn: "15m",
            },
        );

        const respone = await request(app)
            .get("/")
            .set("Authorization", `Bearer ${accesshToken}`);

        expect(respone.status).toBe(401);
        expect(respone.body).toEqual({
            message: "Unauthorized",
        });
    });

    it("should not authenticate if the session is revoked", async () => {
        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                email: "test@test.com",
                username: "testuser",
                password: "test123456",
            });
        expect(registerResponse.status).toBe(201);

        const accessToken = registerResponse.body.accessToken;

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

        const respone = await request(app)
            .get("/")
            .set("Authorization", `Bearer ${accessToken}`);

        expect(respone.status).toBe(401);
        expect(respone.body).toEqual({
            message: "Unauthorized",
        });
    });
});

describe.skip("AUTHNETICATION - SUCCESS CASES", () => {
    it("should authenticate", async () => {
        const registerResponse = await request(app)
            .post("/api/auth/register")
            .send({
                email: "test@test.com",
                username: "testuser",
                password: "test123456",
            });
        expect(registerResponse.status).toBe(201);

        const accessToken = registerResponse.body.accessToken;

        const response = await request(app)
            .get("/")
            .set("Authorization", `Bearer ${accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({
            message: "Authenticated",
        });
    });
});
