import express from "express";
import { identify, IdentifyRequest } from "./identify";

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());

// Health check
app.get("/", (_req, res) => {
    res.json({
        status: "ok",
        message: "Bitespeed Identity Reconciliation Service",
        endpoint: "POST /identify",
    });
});

// Main endpoint
app.post("/identify", (req, res) => {
    try {
        const { email, phoneNumber } = req.body as IdentifyRequest;

        // Validate: at least one must be provided
        if (
            (email === undefined || email === null || email === "") &&
            (phoneNumber === undefined || phoneNumber === null || phoneNumber === "")
        ) {
            res.status(400).json({
                error: "At least one of email or phoneNumber must be provided",
            });
            return;
        }

        const result = identify({ email, phoneNumber });
        res.status(200).json(result);
    } catch (error) {
        console.error("Error in /identify:", error);
        res.status(500).json({
            error: "Internal server error",
        });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Bitespeed Identity Service running on port ${PORT}`);
    console.log(`   POST /identify - Identity reconciliation endpoint`);
});

export default app;
