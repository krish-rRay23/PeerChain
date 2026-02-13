const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { ethers } = require('ethers');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// --- Mock IPFS Storage ---
const upload = multer({ dest: 'uploads/' });

// Create uploads dir if not exists
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Helper to compute a mock CID (SHA256 hash)
const getMockCID = (filePath) => {
    const fileBuffer = fs.readFileSync(filePath);
    const hashSum = crypto.createHash('sha256');
    hashSum.update(fileBuffer);
    return "Qm" + hashSum.digest('hex').substring(0, 44); // Mock CID format
};

app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }
    const cid = getMockCID(req.file.path);
    // Rename file to CID for persistence if needed, or just keep temp
    console.log(`File uploaded: ${req.file.originalname}, CID: ${cid}`);
    res.json({ cid });
});

app.get('/api/ipfs/:cid', (req, res) => {
    // Mock retrieval: In MVP we don't actually store by CID in a structured way 
    // unless we rename above. For now, just return a dummy text or 404.
    res.send(`Content for CID: ${req.params.cid}`);
});

// --- Blockchain Integration ---
// Load contract config
const configPath = path.join(__dirname, 'contract-config.json');
let contractAddress, contractABI;
let provider, wallet, contract;

// Endpoint to provide contract config to frontend
app.get('/api/config', (req, res) => {
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath));
        res.json(config);
    } else {
        res.status(404).json({ error: "Config not found" });
    }
});

const initBlockchain = async () => {
    if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath));
        contractAddress = config.address;
        contractABI = config.abi;

        // Connect to local Hardhat node
        provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

        // Use the first account (owner/deployer) for Oracle actions
        // In reality, Oracle should be a separate secure account.
        const signer = await provider.getSigner(0);
        // We need a wallet with private key for automated backend transactions usually, 
        // but getting signer from provider works for local node if unlocked.
        // Actually, JsonRpcProvider.getSigner returns a JsonRpcSigner which is fine.

        contract = new ethers.Contract(contractAddress, contractABI, signer);
        console.log("Connected to Smart Contract at:", contractAddress);
    } else {
        console.log("Contract config not found. Please deploy contracts first.");
    }
};

// --- LLM Evaluation Oracle ---
// Mock LLM Scoring
const evaluateReviewContent = (reviewContent) => {
    // Simple rubric mock:
    // If text contains "excellent", "detailed" -> high score
    // If text contains "poor", "missing" -> low score
    // Default -> Random 60-80
    const lower = reviewContent.toLowerCase();
    if (lower.includes("excellent") || lower.includes("thorough")) return 90;
    if (lower.includes("good") || lower.includes("solid")) return 75;
    if (lower.includes("bad") || lower.includes("poor")) return 40;

    return Math.floor(Math.random() * (80 - 60 + 1)) + 60;
};

// Endpoint to trigger evaluation (Oracle)
app.post('/api/oracle/evaluate', async (req, res) => {
    const { paperId, reviewerAddress, reviewContent } = req.body;

    if (!contract) {
        await initBlockchain();
        if (!contract) return res.status(503).json({ error: "Blockchain not connected" });
    }

    console.log(`Evaluating review for Paper ${paperId} by ${reviewerAddress}`);

    const score = evaluateReviewContent(reviewContent || "");
    console.log(`Assigned Score: ${score}`);

    try {
        // Call recordEvaluation on contract
        // Note: In production, the backend holds the private key of the "Oracle" role.
        // Here we assume the signer[0] is the owner and has permission.
        const tx = await contract.evaluateReview(paperId, reviewerAddress, score);
        await tx.wait();

        res.json({ success: true, score, tx: tx.hash });
    } catch (error) {
        console.error("Evaluation failed:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- Reviewer Matching (Mock) ---
app.post('/api/match-reviewers', (req, res) => {
    // In a real app, this would query a Vector DB.
    // Here we just return 3 random addresses from a hardcoded list or allow the contract to handle it.
    // Since our contract logic handles assignment using on-chain pool, 
    // this endpoint might just be for the frontend to "recommend" reviewers if we changed the design.
    // For this MVP, Contract handles assignment.
    res.json({ message: "Reviewer assignment is handled on-chain." });
});

// --- Start Server ---
const PORT = 3001;
app.listen(PORT, async () => {
    console.log(`Backend server running on port ${PORT}`);
    await initBlockchain();
});
