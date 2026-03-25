/**
 * PeerChain Demo Flow Script
 * Simulates the full end-to-end peer review lifecycle on chain.
 */
const { ethers } = require("hardhat");
// Node 18+ has native fetch. If on older node, install node-fetch.
// const axios = require('axios'); // Unused
// Actually, this script runs in Hardhat env, so we can access contracts directly.
// But we want to simulate Backend interactions too? 
// For "Demo Script", usually it's a Hardhat script that simulates user actions + manually triggering backend logic or calling backend API.
// Let's make it a standalone script that uses ethers to talk to the local node and fetch to talk to backend.

// Run this with `npx hardhat run scripts/demo_flow.js --network localhost`
// PREREQUISITES: 
// 1. `npx hardhat node` running
// 2. `node backend/server.js` running
// 3. Contracts deployed

async function main() {
    console.log("Starting End-to-End Demo...");

    // 0. Setup
    const [owner, author, reviewer1, reviewer2, reviewer3] = await ethers.getSigners();

    // Connect to contract
    // We can assume it's deployed at the address from config or just grab attached one if we redeployed?
    // Better to grab likely deployed one if we want persistent state, 
    // OR we can redeploy fresh for the demo.
    // For a clean demo, let's redeploy fresh!

    console.log("Deploying fresh PaperReview contract...");
    const PaperReview = await ethers.getContractFactory("PaperReview");
    const paperReview = await PaperReview.connect(owner).deploy();
    await paperReview.waitForDeployment();
    const contractAddr = await paperReview.getAddress();
    console.log("Deployed to:", contractAddr);

    // Update backend config manually? 
    // The backend watches 'contract-config.json'. We should overwrite it.
    const fs = require('fs');
    const path = require('path');
    const configPath = path.join(__dirname, '../backend/contract-config.json');
    const config = { address: contractAddr, abi: JSON.parse(paperReview.interface.formatJson()) };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log("Updated backend config.");

    // Register Reviewers
    console.log("Registering reviewers...");
    await paperReview.connect(reviewer1).registerReviewer();
    await paperReview.connect(reviewer2).registerReviewer();
    await paperReview.connect(reviewer3).registerReviewer();
    console.log("Reviewers registered.");

    // 1. Submit Paper
    console.log("\n--- Step 1: Author Submits Paper ---");
    const escrow = ethers.parseEther("0.03");
    // Upload Mock Paper to Backend to get CID
    // We can skip actual upload and just fake CID for script speed, or use fetch if available.
    // Hardhat defines `fetch` in newer node versions (18+).
    // Let's assume Fake CID.
    const paperCid = "QmPaperCID_" + Date.now();
    const txSub = await paperReview.connect(author).submitPaper(paperCid, { value: escrow });
    const rcSub = await txSub.wait();

    // Parse event
    const logSub = rcSub.logs.find(x => x.fragment && x.fragment.name === 'PaperSubmitted');
    const paperId = logSub.args[0];
    console.log(`Paper #${paperId} submitted. Reviewers assigned automatically.`);

    const paperState = await paperReview.getPaper(paperId);
    console.log("Assigned Reviewers:", paperState.reviewers);

    // 2. Submit Reviews
    console.log("\n--- Step 2: Reviewers Submit Reviews ---");
    const reviewers = [reviewer1, reviewer2, reviewer3];
    const reviewTexts = [
        "This paper is Excellent and detailed.", // Should score high
        "Good work but some errors. Solid.",    // Should score medium
        "Poor quality, missing constructiveness." // Should score low (maybe fail?)
    ];

    for (let i = 0; i < 3; i++) {
        // Check if assigned?
        // Our smart contract assigns randomly 3 out of pool. 
        // Since pool size is 3, all 3 are assigned.
        const reviewer = reviewers[i];

        // Check if this reviewer is actually assigned (in case logic changes)
        // With size 3 pool and 3 required, all must be assigned.

        const reviewCid = "QmReviewCID_" + i;
        await paperReview.connect(reviewer).submitReview(paperId, reviewCid);
        console.log(`Reviewer ${reviewer.address.slice(0, 6)} submitted review.`);

        // 3. Backend Oracle Evaluation
        console.log(`   -> Triggering Oracle Eval for Reviewer ${i + 1}...`);

        // Call backend API
        try {
            const res = await fetch('http://localhost:3001/api/oracle/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paperId: Number(paperId),
                    reviewerAddress: reviewer.address,
                    reviewContent: reviewTexts[i]
                })
            });
            const data = await res.json();
            console.log(`   -> Oracle Score: ${data.score}. Tx Hash: ${data.tx}`);
        } catch (e) {
            console.log("   -> Oracle trigger failed (Is backend running?):", e.message);
            // Fallback: manually evaluate if backend off
            // await paperReview.connect(owner).evaluateReview(paperId, reviewer.address, 75);
        }
    }

    // 4. Check Payments
    console.log("\n--- Step 3: Checking Payments ---");
    // Wait a bit for async backend txs if any
    await new Promise(r => setTimeout(r, 2000));

    // Access mapping: reviews(paperId, reviewerAddr)
    for (let r of reviewers) {
        const review = await paperReview.reviews(paperId, r.address);
        console.log(`Reviewer ${r.address.slice(0, 6)}: Score ${review.score} | Paid? ${review.isPaid}`);
    }

    console.log("\nDemo Complete!");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
