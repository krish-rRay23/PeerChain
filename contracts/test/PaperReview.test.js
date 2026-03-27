const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PaperReview", function () {
    let PaperReview;
    let paperReview;
    let owner;
    let author;
    let reviewer1;
    let reviewer2;
    let reviewer3;
    let otherAccount;

    beforeEach(async function () {
        [owner, author, reviewer1, reviewer2, reviewer3, otherAccount] = await ethers.getSigners();
        PaperReview = await ethers.getContractFactory("PaperReview");
        paperReview = await PaperReview.deploy();

        // Register reviewers
        await paperReview.connect(reviewer1).registerReviewer();
        await paperReview.connect(reviewer2).registerReviewer();
        await paperReview.connect(reviewer3).registerReviewer();
    });

    describe("Paper Submission", function () {
        it("Should accept paper submission with correct escrow", async function () {
            const escrowAmount = ethers.parseEther("0.03"); // 0.01 * 3
            await expect(paperReview.connect(author).submitPaper("QmTestCID", { value: escrowAmount }))
                .to.emit(paperReview, "PaperSubmitted")
                .withArgs(1, "QmTestCID", author.address);

            const paper = await paperReview.papers(1);
            expect(paper.author).to.equal(author.address);
            expect(paper.cid).to.equal("QmTestCID");
        });

        it("Should fail if escrow is insufficient", async function () {
            const tooLittle = ethers.parseEther("0.01");
            await expect(paperReview.connect(author).submitPaper("QmTestCID", { value: tooLittle }))
                .to.be.revertedWith("Insufficient escrow");
        });
    });

    describe("Review and Evaluation", function () {
        beforeEach(async function () {
            const escrowAmount = ethers.parseEther("0.03");
            await paperReview.connect(author).submitPaper("QmTestCID", { value: escrowAmount });
            // Note: Reviewers are assigned pseudo-randomly. In this test env with fresh deployment, 
            // and low block count, it might be deterministic.
            // For unit testing strict assignment, we might need to mock or check who was assigned.
        });

        it("Should allow assigned reviewer to submit review", async function () {
            // We cheat a bit and check who was assigned
            const paper = await paperReview.getPaper(1);
            const assigned = paper.reviewers;

            // Find which signer corresponds to assigned[0]
            let activeReviewer;
            if (assigned[0] === reviewer1.address) activeReviewer = reviewer1;
            else if (assigned[0] === reviewer2.address) activeReviewer = reviewer2;
            else if (assigned[0] === reviewer3.address) activeReviewer = reviewer3;
            else activeReviewer = reviewer1; // Fallback? Should be one of them.

            await expect(paperReview.connect(activeReviewer).submitReview(1, "QmReviewCID"))
                .to.emit(paperReview, "ReviewSubmitted")
                .withArgs(1, activeReviewer.address, "QmReviewCID");
        });

        it("Should release payment on passing score", async function () {
            const paper = await paperReview.getPaper(1);
            const reviewerAddr = paper.reviewers[0];
            let activeReviewer;
            if (reviewerAddr === reviewer1.address) activeReviewer = reviewer1;
            else if (reviewerAddr === reviewer2.address) activeReviewer = reviewer2;
            else activeReviewer = reviewer3;

            await paperReview.connect(activeReviewer).submitReview(1, "QmReviewCID");

            // Evaluate
            await expect(paperReview.connect(owner).evaluateReview(1, reviewerAddr, 70))
                .to.emit(paperReview, "ReviewEvaluated")
                .withArgs(1, reviewerAddr, 70, true)
                .to.emit(paperReview, "PaymentReleased")
                .withArgs(1, reviewerAddr, ethers.parseEther("0.01"));

            // Check balance change could be done here but events are good proof for MVP
        });
    });
});
