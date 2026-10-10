const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const MONGODB_URI =
    process.env.MONGODB_URI || "mongodb://localhost:27017";

const DATABASE_NAME =
    process.env.MONGODB_DATABASE || "genshin_build_planner";

const client = new MongoClient(MONGODB_URI);

let database;
let inventoryCollection;
let farmingScheduleCollection;

const WEEK_DAYS = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday"
];

function normalizeMaterialName(name) {
    return String(name || "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}

async function connectDatabase() {
    try {
        await client.connect();

        database = client.db(DATABASE_NAME);

        inventoryCollection = database.collection("inventory");

        farmingScheduleCollection =
            database.collection("farmingSchedules");

        console.log("MongoDB connected successfully.");
        console.log(`Database: ${DATABASE_NAME}`);
        console.log("Collections: inventory, farmingSchedules");
    } catch (error) {
        console.error("MongoDB connection failed:", error);
        process.exit(1);
    }
}

app.get("/api/health", async (req, res) => {
    try {
        await database.command({ ping: 1 });

        res.json({
            success: true,
            message: "Server and MongoDB are working."
        });
    } catch (error) {
        console.error("Health check error:", error);

        res.status(500).json({
            success: false,
            message: "MongoDB connection failed."
        });
    }
});

/* =========================================================
   INVENTORY API
========================================================= */

app.get("/api/inventory", async (req, res) => {
    try {
        const document = await inventoryCollection.findOne({
            userId: "default-user"
        });

        res.json({
            success: true,
            inventory: document?.materials || {}
        });
    } catch (error) {
        console.error("GET inventory error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load inventory."
        });
    }
});

app.put("/api/inventory", async (req, res) => {
    try {
        const materials = req.body.materials;

        if (
            !materials ||
            typeof materials !== "object" ||
            Array.isArray(materials)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid inventory data."
            });
        }

        const normalizedInventory = {};

        Object.entries(materials).forEach(([name, value]) => {
            const key = normalizeMaterialName(name);
            const amount = Number(value);

            if (
                !key ||
                !Number.isFinite(amount) ||
                amount < 0
            ) {
                return;
            }

            normalizedInventory[key] = Math.floor(amount);
        });

        await inventoryCollection.updateOne(
            { userId: "default-user" },
            {
                $set: {
                    materials: normalizedInventory,
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    userId: "default-user"
                }
            },
            { upsert: true }
        );

        res.json({
            success: true,
            inventory: normalizedInventory
        });
    } catch (error) {
        console.error("PUT inventory error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to save inventory."
        });
    }
});

app.put("/api/inventory/:material", async (req, res) => {
    try {
        const material = normalizeMaterialName(req.params.material);
        const amount = Number(req.body.amount);

        if (
            !material ||
            !Number.isFinite(amount) ||
            amount < 0 ||
            material.includes(".") ||
            material.startsWith("$")
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid material or amount."
            });
        }

        const cleanAmount = Math.floor(amount);

        await inventoryCollection.updateOne(
            { userId: "default-user" },
            {
                $set: {
                    [`materials.${material}`]: cleanAmount,
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    userId: "default-user"
                }
            },
            { upsert: true }
        );

        res.json({
            success: true,
            material,
            amount: cleanAmount
        });
    } catch (error) {
        console.error("UPDATE material error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to update material."
        });
    }
});

app.delete("/api/inventory", async (req, res) => {
    try {
        await inventoryCollection.deleteOne({
            userId: "default-user"
        });

        res.json({
            success: true,
            message: "Inventory reset successfully."
        });
    } catch (error) {
        console.error("DELETE inventory error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to reset inventory."
        });
    }
});

/* =========================================================
   FARMING SCHEDULE API
========================================================= */

function validateFarmingTasks(tasks) {
    if (!Array.isArray(tasks)) {
        return {
            valid: false,
            message: "Tasks must be an array."
        };
    }

    if (tasks.length > 200) {
        return {
            valid: false,
            message: "You can save up to 200 tasks."
        };
    }

    const cleanTasks = [];

    for (const task of tasks) {
        if (!task || typeof task !== "object") {
            return {
                valid: false,
                message: "Invalid task data."
            };
        }

        const id = String(task.id || "").trim();
        const day = String(task.day || "").trim();
        const material = String(task.material || "").trim();
        const quantity = Number(task.quantity);
        const notes = String(task.notes || "").trim();

        if (!id || id.length > 100) {
            return {
                valid: false,
                message: "Each task needs a valid ID."
            };
        }

        if (!WEEK_DAYS.includes(day)) {
            return {
                valid: false,
                message: "Select a valid farming day."
            };
        }

        if (!material || material.length > 120) {
            return {
                valid: false,
                message: "Material must be 1–120 characters."
            };
        }

        if (
            !Number.isInteger(quantity) ||
            quantity < 1 ||
            quantity > 1000000
        ) {
            return {
                valid: false,
                message: "Quantity must be a positive whole number."
            };
        }

        if (notes.length > 300) {
            return {
                valid: false,
                message: "Notes cannot exceed 300 characters."
            };
        }

        cleanTasks.push({
            id,
            day,
            material,
            quantity,
            notes,
            completed: task.completed === true,
            updatedAt: new Date()
        });
    }

    const uniqueIds = new Set(cleanTasks.map(task => task.id));

    if (uniqueIds.size !== cleanTasks.length) {
        return {
            valid: false,
            message: "Task IDs must be unique."
        };
    }

    return {
        valid: true,
        tasks: cleanTasks
    };
}

app.get("/api/farming-schedule", async (req, res) => {
    try {
        const document = await farmingScheduleCollection.findOne({
            userId: "default-user"
        });

        res.json({
            success: true,
            tasks: document?.tasks || []
        });
    } catch (error) {
        console.error("GET farming schedule error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to load the farming schedule."
        });
    }
});

app.put("/api/farming-schedule", async (req, res) => {
    try {
        const validation = validateFarmingTasks(req.body.tasks);

        if (!validation.valid) {
            return res.status(400).json({
                success: false,
                message: validation.message
            });
        }

        await farmingScheduleCollection.updateOne(
            { userId: "default-user" },
            {
                $set: {
                    tasks: validation.tasks,
                    updatedAt: new Date()
                },
                $setOnInsert: {
                    userId: "default-user"
                }
            },
            { upsert: true }
        );

        res.json({
            success: true,
            tasks: validation.tasks,
            message: "Farming schedule saved."
        });
    } catch (error) {
        console.error("PUT farming schedule error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to save the farming schedule."
        });
    }
});

app.delete("/api/farming-schedule", async (req, res) => {
    try {
        await farmingScheduleCollection.deleteOne({
            userId: "default-user"
        });

        res.json({
            success: true,
            message: "Farming schedule cleared."
        });
    } catch (error) {
        console.error("DELETE farming schedule error:", error);

        res.status(500).json({
            success: false,
            message: "Unable to clear the farming schedule."
        });
    }
});

/* =========================================================
   START SERVER
========================================================= */

async function startServer() {
    await connectDatabase();

    app.listen(PORT, () => {
        console.log("");
        console.log("==========================================");
        console.log(" Genshin Build Planner Backend");
        console.log("==========================================");
        console.log(`Server running at http://localhost:${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/api/health`);
        console.log("==========================================");
    });
}

startServer();