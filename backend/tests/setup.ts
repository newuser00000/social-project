import { beforeAll, afterAll, beforeEach } from "vitest";
import { prisma } from "../src/config/db.js";

beforeAll(async () => {
    await prisma.$connect();
    await prisma.session.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();
});

beforeEach(async () => {
    await prisma.session.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();
});

afterAll(async () => {
    await prisma.session.deleteMany();
    await prisma.profile.deleteMany();
    await prisma.user.deleteMany();
    await prisma.$disconnect();
});
