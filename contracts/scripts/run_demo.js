const { ethers } = require("hardhat");
const fs = require('fs');
const path = require('path');

async function main() {
    console.log("Starting End-to-End Demo (Local)...");

    // 0. Setup
    const [owner, author, reviewer1, reviewer2, reviewer3] = await ethers.getSigners();

    console.log("Deploying fresh PaperReview contract...");
    const PaperReview = await ethers.getContractFactory("PaperReview");
    const paperReview = await PaperReview.connect(owner).deploy();
    await paperReview.waitForDeployment();
    const contractAddr = await paperReview.getAddress();
    console.log("Deployed to:", contractAddr);

    // Update backend config manually
    // We are in contracts/scripts/run_demo.js
    // Backend is in ../../backend/
    const configPath = path.join(__dirname, '../../backend/contract-config.json');

    // Ensure directory exists (it should)
    const backendDir = path.dirname(configPath);
    if (!fs.existsSync(backendDir)) {
        fs.mkdirSync(backendDir, { recursive: true });
    }

    const config = { address: contractAddr, abi: JSON.parse(paperReview.interface.formatJson()) };
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    console.log("Updated backend config at:", configPath);

    // Register Reviewers
    console.log("Registering reviewers...");
    await paperReview.connect(reviewer1).registerReviewer();
    await paperReview.connect(reviewer2).registerReviewer();
    await paperReview.connect(reviewer3).registerReviewer();
    console.log("Reviewers registered.");

    // 1. Submit Paper
    console.log("\n--- Step 1: Author Submits Paper ---");
    const escrow = ethers.parseEther("0.03");
    const paperCid = "QmPaperCID_" + Date.now();
    const txSub = await paperReview.connect(author).submitPaper(paperCid, { value: escrow });
    const rcSub = await txSub.wait();

    const logSub = rcSub.logs.find(x => x.fragment && x.fragment.name === 'PaperSubmitted');
    const paperId = logSub.args[0];
    console.log(`Paper #${paperId} submitted.`);

    // 2. Submit Reviews
    console.log("\n--- Step 2: Reviewers Submit Reviews ---");
    const reviewers = [reviewer1, reviewer2, reviewer3];
    const reviewTexts = [
        "This paper is Excellent and detailed.",
        "Good work but some errors. Solid.",
        "Poor quality, missing constructiveness."
    ];

    for (let i = 0; i < 3; i++) {
        const reviewer = reviewers[i];
        const reviewCid = "QmReviewCID_" + i;
        await paperReview.connect(reviewer).submitReview(paperId, reviewCid);
        console.log(`Reviewer ${reviewer.address.slice(0, 6)} submitted review.`);

        // 3. Backend Oracle Evaluation
        console.log(`   -> Triggering Oracle Eval for Reviewer ${i + 1}...`);

        try {
            // Native fetch in Node 18+
            const res = await fetch('http://localhost:3001/api/oracle/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paperId: Number(paperId),
                    reviewerAddress: reviewer.address,
                    reviewContent: reviewTexts[i]
                })
            });
            if (res.ok) {
                const data = await res.json();
                console.log(`   -> Oracle Score: ${data.score}. Tx Hash: ${data.tx}`);
            } else {
                console.log(`   -> Oracle Error: ${res.statusText}`);
            }
        } catch (e) {
            console.log("   -> Oracle trigger failed (backend likely offline):", e.message);
        }
    }

    // 4. Check Payments
    console.log("\n--- Step 3: Checking Payments ---");
    await new Promise(r => setTimeout(r, 2000));

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
