// API handlers with common issues

const express = require("express");
const app = express();

// Missing CORS configuration
// Missing rate limiting
// Missing input validation middleware

app.post("/api/upload", (req, res) => {
  // No file type validation
  // No file size limit
  const file = req.files.upload;
  file.mv("/uploads/" + file.name); // Path traversal vulnerability
  res.send("Uploaded");
});

app.get("/api/user/:id", (req, res) => {
  // Missing authentication check
  // Exposing sensitive data
  const user = getUserById(req.params.id);
  res.json({
    id: user.id,
    email: user.email,
    password: user.password, // Never expose passwords!
    ssn: user.ssn,
    creditCard: user.creditCard,
  });
});

app.post("/api/eval", (req, res) => {
  // CRITICAL: Code injection vulnerability
  const result = eval(req.body.code);
  res.json({ result });
});

app.get("/api/redirect", (req, res) => {
  // Open redirect vulnerability
  res.redirect(req.query.url);
});

// No error handling middleware
// app.use((err, req, res, next) => { ... });

// Server listening on all interfaces
app.listen(3000, "0.0.0.0", () => {
  console.log("Server running");
});

// Synchronous file operations blocking event loop
const fs = require("fs");
function readConfig() {
  return fs.readFileSync("/etc/config.json");
}
