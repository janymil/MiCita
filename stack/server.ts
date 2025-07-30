import { StackServerApp } from "@stackframe/js";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

export const stackServerApp = new StackServerApp({
  tokenStore: "memory",
  projectId: process.env.VITE_STACK_PROJECT_ID,
  publishableClientKey: process.env.VITE_STACK_PUBLISHABLE_CLIENT_KEY,
  secretServerKey: process.env.STACK_SECRET_SERVER_KEY,
});
