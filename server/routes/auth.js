
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

// USER REGISTRATION
router.post("/register", async (req, res) => {
    const { name, email, password, organizationName } = req.body;

    if (!name || !email || !password || !organizationName) {
        return res.status(400).json({
            message: "All fields are required"
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            message: "Password must be at least 8 characters"
        });
    }

    let connection;

    try {
        connection = await db.promise().getConnection();
        await connection.beginTransaction();

        const [existingUsers] = await connection.execute(
            "SELECT id FROM users WHERE email = ?",
            [email]
        );

        if (existingUsers.length > 0) {
            await connection.rollback();
            return res.status(409).json({
                message: "Email already registered"
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const [orgResult] = await connection.execute(
            "INSERT INTO organizations (name) VALUES (?)",
            [organizationName]
        );

        await connection.execute(
            `INSERT INTO users
            (organization_id, name, email, password)
            VALUES (?, ?, ?, ?)`,
            [orgResult.insertId, name, email, hashedPassword]
        );

        await connection.commit();

        res.status(201).json({
            message: "Registration successful"
        });

    } catch (error) {
        if (connection) await connection.rollback();

        console.error("Registration error:", error.message);

        res.status(500).json({
            message: "Registration failed"
        });
    } finally {
        if (connection) connection.release();
    }
});

// USER LOGIN
router.post("/login", async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({
            message: "Email and password are required"
        });
    }

    try {
        const [users] = await db.promise().execute(
            `SELECT id, organization_id, name, email, password
             FROM users WHERE email = ?`,
            [email]
        );

        if (users.length === 0) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const user = users[0];

        const isMatch = await bcrypt.compare(
            password,
            user.password
        );

        if (!isMatch) {
            return res.status(401).json({
                message: "Invalid email or password"
            });
        }

        const token = jwt.sign(
            {
                userId: user.id,
                organizationId: user.organization_id
            },
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        res.json({
            message: "Login successful",
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                organizationId: user.organization_id
            }
        });

    } catch (error) {
        console.error("Login error:", error.message);

        res.status(500).json({
            message: "Login failed"
        });
    }
});

module.exports = router;
