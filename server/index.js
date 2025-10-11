// server/index.js
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

// Path setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize app
const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());

// Serve static React build
app.use(express.static(path.join(__dirname, "../dist")));

// Example API route
app.get("/api/ping", (req, res) => {
  res.json({ message: "MoodFlix backend is live 🚀" });
});

// Catch-all route for React router
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

// Listen on 0.0.0.0 (REQUIRED for Render)
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://0.0.0.0:${PORT}`);
});
