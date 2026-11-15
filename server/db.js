
const mysql = require("mysql2");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const db = mysql.createPool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: {
    ca: fs.readFileSync(
        process.env.DB_CA_PATH || path.join(__dirname, "tidb-ca.pem")
    )
},
    waitForConnections: true,
    connectionLimit: 10
});

db.getConnection((err, connection) => {
    if (err) {
        console.error("Database connection failed:", err.message);
        return;
    }

    console.log("TiDB Cloud Database Connected Successfully!");
    connection.release();
});

module.exports = db;
