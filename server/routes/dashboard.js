
const express = require("express");
const db = require("../db");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// GET DASHBOARD STATISTICS
router.get("/stats", async (req, res) => {
    try {
        const [results] = await db.promise().execute(
            `SELECT
                COUNT(*) AS totalProducts,
                COALESCE(SUM(quantity), 0) AS totalQuantity,
                COALESCE(
                    SUM(
                        CASE
                            WHEN quantity <= COALESCE(low_stock_threshold, 5)
                            THEN 1
                            ELSE 0
                        END
                    ), 0
                ) AS lowStockItems
             FROM products
             WHERE organization_id = ?`,
            [req.user.organizationId]
        );

        res.json(results[0]);

    } catch (error) {
        console.error("Dashboard error:", error);

        res.status(500).json({
            message: "Failed to fetch dashboard statistics"
        });
    }
});

module.exports = router;
