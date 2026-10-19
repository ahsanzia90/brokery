import { config } from "dotenv";
config({ path: ".env.local", override: false });
config({ path: ".env", override: false });
// Integration tests run against TEST_DATABASE_URL when present so dev data stays untouched.
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
if (!process.env.AUTH_SECRET) process.env.AUTH_SECRET = "test-secret-test-secret-test-secret-0000";
process.env.OTP_PROVIDER = "console";
