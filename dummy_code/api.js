// API handlers with common issues

const express = require("express");
const app = express();
const fs = require("fs").promises; // Use promises version of fs
const path = require("path"); // For path manipulation
const multer = require("multer"); // For handling file uploads
const cors = require("cors"); // For CORS

// Configure Multer for file uploads
const upload = multer({
  dest: 'uploads/', // Temporary directory for uploaded files
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB file size limit
});

// Basic CORS configuration
app.use(cors());

app.use(express.json()); // To parse JSON request bodies
app.use(express.urlencoded({ extended: true })); // To parse URL-encoded request bodies

// Add a simple getUserById placeholder
function getUserById(id) {
  // In a real application, this would fetch from a database
  // Always sanitize and validate input 'id' before using it in a real query
  if (isNaN(id) || id < 1) {
    return null; // Or throw an error for invalid ID
  }
  return {
    id: id,
    email: `user${id}@example.com`,
    // Removed sensitive placeholders as they should not be returned by this function
  };
}

// File upload endpoint
app.post("/api/upload", upload.single('upload'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).send("No file uploaded.");
    }

    // Basic file type validation (example: only allow images and PDFs)
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedMimeTypes.includes(req.file.mimetype)) {
      await fs.unlink(req.file.path); // Delete the temporary file
      return res.status(400).send("Invalid file type. Only JPEG, PNG, and PDF are allowed.");
    }

    // Multer's 'limits' option already handles file size.
    // If it exceeds, an error will be caught by the error handling middleware.

    // Sanitize filename and move to a secure location
    // For production, use a dedicated storage service or generate a UUID for filenames.
    // Using path.basename to prevent path traversal for the filename itself.
    const sanitizedFilename = path.basename(req.file.originalname);
    const targetDir = path.join(__dirname, "uploads"); // Define a dedicated uploads directory
    await fs.mkdir(targetDir, { recursive: true }); // Ensure the directory exists
    const targetPath = path.join(targetDir, sanitizedFilename);

    // Move the file from the temporary multer destination to the final location
    await fs.rename(req.file.path, targetPath);
    res.status(200).send(`File uploaded successfully to ${sanitizedFilename}`);

  } catch (error) {
    if (req.file && req.file.path) {
      await fs.unlink(req.file.path).catch(err => console.error("Error deleting temp file after error:", err));
    }
    next(error); // Pass error to the error handling middleware
  }
});


app.get("/api/user/:id", (req, res) => {
  // Missing authentication check (IMPORTANT: Add proper authentication in a real app)
  // Example: if (!req.user || req.user.id !== req.params.id) return res.status(403).send("Forbidden");

  const user = getUserById(req.params.id);
  if (!user) {
    return res.status(404).send("User not found.");
  }
  res.json({
    id: user.id,
    email: user.email,
    // NEVER expose sensitive data like passwords, SSN, credit cards
    // The original code exposed these, they have been removed for security.
  });
});

// Removed the dangerous /api/eval endpoint due to critical code injection vulnerability.

app.get("/api/redirect", (req, res) => {
  const redirectUrl = req.query.url;

  if (!redirectUrl) {
    return res.status(400).send("Redirect URL is missing.");
  }

  try {
    const url = new URL(redirectUrl, `http://${req.headers.host}`); // Use URL object for robust parsing

    // Validate the redirect URL to prevent open redirect vulnerabilities.
    // Only allow redirects to internal paths or a whitelist of approved external domains.
    const WHITELISTED_DOMAINS = ['example.com', 'trusted.com', req.hostname]; // Add req.hostname for internal redirects

    if (WHITELISTED_DOMAINS.includes(url.hostname)) {
      res.redirect(redirectUrl);
    } else {
      // Block other protocols and untrusted external domains
      res.status(400).send("Invalid redirect URL or untrusted domain.");
    }
  } catch (error) {
    // Handle cases where the redirectUrl is not a valid URL
    res.status(400).send("Invalid URL format provided for redirect.");
  }
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error("An error occurred:", err.stack);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).send("File too large. Maximum 5MB allowed.");
    }
    return res.status(400).send("Multer error: " + err.message);
  }

  res.status(500).send("Something broke! Please try again later.");
});

// Server listening on all interfaces
app.listen(3000, "0.0.0.0", () => {
  console.log("Server running on port 3000");
});

// Asynchronous file operations (e.g., for reading configuration)
async function readConfig() {
  try {
    const configPath = path.join(__dirname, "config.json"); // Assuming config.json exists
    // Check if the file exists before attempting to read it
    await fs.access(configPath, fs.constants.F_OK);
    const data = await fs.readFile(configPath, "utf8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.warn("Config file (config.json) not found. Returning empty configuration.");
      return {}; // Return empty config if file doesn't exist
    }
    console.error("Error reading config file:", error);
    // Re-throw other errors or return a default/empty config
    return {};
  }
}

// Example usage of readConfig (uncomment to test)
// readConfig().then(config => console.log("Config loaded:", config)).catch(err => console.error("Failed to load config:", err));