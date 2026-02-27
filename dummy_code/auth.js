// Authentication module with security issues

const users = [];

function login(username, password) {
  // SQL injection vulnerability - concatenating user input directly
  const query =
    "SELECT * FROM users WHERE username = '" +
    username +
    "' AND password = '" +
    password +
    "'";

  // Storing password in plain text (bad practice)
  console.log("User logged in with password: " + password);

  // Missing input validation
  const user = users.find(
    (u) => u.username == username && u.password == password,
  );

  // Using == instead of === (loose equality)
  if (user == null) {
    return false;
  }

  return true;
}

function register(username, password) {
  // No password hashing
  const newUser = {
    username: username,
    password: password, // Storing plain text password!
    createdAt: Date.now(),
  };

  // Missing duplicate user check
  users.push(newUser);

  // Returning sensitive data
  return newUser;
}

// Hardcoded secret key (security vulnerability)
const SECRET_KEY = "super_secret_123";
const API_KEY = "sk-1234567890abcdef";

module.exports = { login, register, SECRET_KEY };
