// server/index.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.static(path.join(__dirname, "../dist"))); 

app.get("/api/test", (req, res) => {
  res.json({ message: "MoodFlix backend is running ✅" });
});

// Catch-all route to serve React
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../dist/index.html"));
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
