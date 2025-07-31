import express from "express";
import { createServer } from "http";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import cors from "cors";
import dotenv from "dotenv";
import { setupRoutes } from "./routes.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);

// Middleware
app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// API routes
setupRoutes(app);

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  const clientPath = join(__dirname, "../dist/client");
  app.use(express.static(clientPath));
  
  // Handle client-side routing
  app.get("*", (req, res) => {
    res.sendFile(join(clientPath, "index.html"));
  });
} else {
  // Development mode - Vite will handle the frontend
  app.get("/", (req, res) => {
    res.send("BuscarPerú Public API is running. Frontend is served by Vite on port 5173.");
  });
}

const PORT = process.env.PORT || 5000;

httpServer.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 BuscarPerú Public API running on port ${PORT}`);
  console.log(`📊 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});