
const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

// Protect all product routes
router.use(authMiddleware);

// GET ALL PRODUCTS + SEARCH
router.get("/", async (req, res) => {
    try {
        const { q } = req.query;

        let sql = `
            SELECT * FROM products
            WHERE organization_id = ?
        `;
        const params = [req.user.organizationId];

        if (q) {
            sql += " AND (name LIKE ? OR sku LIKE ?)";
            params.push(`%${q}%`, `%${q}%`);
        }

        sql += " ORDER BY created_at DESC";

        const [products] = await db.promise().execute(sql, params);

        res.json(products);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to fetch products" });
    }
});

// CREATE PRODUCT
router.post("/", async (req, res) => {
    try {
        const {
            name, sku, description,
            quantity, cost_price,
            selling_price, low_stock_threshold
        } = req.body;

        if (!name || !sku) {
            return res.status(400).json({
                message: "Product name and SKU are required"
            });
        }

        if (
            (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 0)) ||
            (low_stock_threshold != null && (!Number.isInteger(low_stock_threshold) || low_stock_threshold < 0))
        ) {
            return res.status(400).json({
                message: "Quantity and threshold must be non-negative integers"
            });
        }

        const [result] = await db.promise().execute(
            `INSERT INTO products
            (organization_id, name, sku, description, quantity,
             cost_price, selling_price, low_stock_threshold)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                req.user.organizationId,
                name, sku, description || null,
                quantity ?? 0,
                cost_price ?? null,
                selling_price ?? null,
                low_stock_threshold ?? null
            ]
        );

        res.status(201).json({
            message: "Product created successfully",
            productId: result.insertId
        });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "SKU already exists in your organization"
            });
        }

        console.error(error);
        res.status(500).json({ message: "Failed to create product" });
    }
});

// UPDATE PRODUCT
router.put("/:id", async (req, res) => {
    try {
        const {
            name, sku, description,
            quantity, cost_price,
            selling_price, low_stock_threshold
        } = req.body;

        if (!name || !sku) {
            return res.status(400).json({
                message: "Product name and SKU are required"
            });
        }

        if (
            (quantity !== undefined && (!Number.isInteger(quantity) || quantity < 0)) ||
            (low_stock_threshold != null && (!Number.isInteger(low_stock_threshold) || low_stock_threshold < 0))
        ) {
            return res.status(400).json({
                message: "Quantity and threshold must be non-negative integers"
            });
        }

        const [result] = await db.promise().execute(
            `UPDATE products SET
            name = ?, sku = ?, description = ?, quantity = ?,
            cost_price = ?, selling_price = ?, low_stock_threshold = ?
            WHERE id = ? AND organization_id = ?`,
            [
                name, sku, description || null,
                quantity ?? 0,
                cost_price ?? null,
                selling_price ?? null,
                low_stock_threshold ?? null,
                req.params.id,
                req.user.organizationId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.json({ message: "Product updated successfully" });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                message: "SKU already exists in your organization"
            });
        }

        console.error(error);
        res.status(500).json({ message: "Failed to update product" });
    }
});

// DELETE PRODUCT
router.delete("/:id", async (req, res) => {
    try {
        const [result] = await db.promise().execute(
            `DELETE FROM products
             WHERE id = ? AND organization_id = ?`,
            [req.params.id, req.user.organizationId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.json({ message: "Product deleted successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to delete product" });
    }
});

module.exports = router;
