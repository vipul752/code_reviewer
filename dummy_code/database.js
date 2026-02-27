// Database module with issues

const mysql = require("mysql");

// Connection without proper error handling
const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "password123", // Hardcoded credentials
  database: "myapp",
});

async function getUser(userId) {
  // SQL injection vulnerability
  const query = `SELECT * FROM users WHERE id = ${userId}`;
  return connection.query(query);
}

async function deleteUser(userId) {
  // No authorization check
  // No soft delete - permanent deletion
  const query = `DELETE FROM users WHERE id = ${userId}`;
  return connection.query(query);
}

async function updateEmail(userId, email) {
  // No email validation
  // No sanitization
  const query = `UPDATE users SET email = '${email}' WHERE id = ${userId}`;
  return connection.query(query);
}

// Connection never closed - resource leak
function getAllUsers() {
  return new Promise((resolve, reject) => {
    connection.query("SELECT * FROM users", (err, results) => {
      if (err) {
        // Swallowing the error, just logging
        console.log(err);
        resolve([]); // Hiding errors from caller
      }
      resolve(results);
    });
  });
}

// Race condition - no transaction
async function transferMoney(fromId, toId, amount) {
  await connection.query(
    `UPDATE accounts SET balance = balance - ${amount} WHERE id = ${fromId}`,
  );
  await connection.query(
    `UPDATE accounts SET balance = balance + ${amount} WHERE id = ${toId}`,
  );
}

module.exports = { getUser, deleteUser, updateEmail, getAllUsers };
