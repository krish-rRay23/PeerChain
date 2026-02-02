// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";

contract PaperReview is Ownable {
    struct Paper {
        uint256 id;
        string cid;
        address author;
        address[3] reviewers;
        uint256 reviewCount;
        bool isCompleted;
        bool isFunded;
    }

    struct Review {
        address reviewer;
        string reviewCid;
        uint8 score;
        bool isScored;
        bool isPaid;
    }

    uint256 public paperCounter;
    uint256 public constant REVIEWER_PAYMENT = 0.01 ether; // Approx ₹2000 mock
    uint256 public constant TOTAL_ESCROW = REVIEWER_PAYMENT * 3;
    uint8 public constant PASS_SCORE = 65;

    mapping(uint256 => Paper) public papers;
    mapping(uint256 => mapping(address => Review)) public reviews;
    address[] public reviewerPool;
    mapping(address => bool) public isReviewer;

    event PaperSubmitted(uint256 indexed paperId, string cid, address author);
    event ReviewersAssigned(uint256 indexed paperId, address[3] reviewers);
    event ReviewSubmitted(uint256 indexed paperId, address reviewer,  string reviewCid);
    event ReviewEvaluated(uint256 indexed paperId, address reviewer, uint8 score, bool passed);
    event PaymentReleased(uint256 indexed paperId, address reviewer, uint256 amount);

    constructor() Ownable(msg.sender) {} // Ownable 5.x requires initialOwner

    // 1. Reviewer Registration
    function registerReviewer() external {
        require(!isReviewer[msg.sender], "Already registered");
        reviewerPool.push(msg.sender);
        isReviewer[msg.sender] = true;
    }

    // 2. Paper Submission
    function submitPaper(string memory _cid) external payable {
        // Author funds the review process
        require(msg.value >= TOTAL_ESCROW, "Insufficient escrow");

        paperCounter++;
        uint256 newPaperId = paperCounter;

        Paper storage p = papers[newPaperId];
        p.id = newPaperId;
        p.cid = _cid;
        p.author = msg.sender;
        p.isFunded = true;

        emit PaperSubmitted(newPaperId, _cid, msg.sender);

        assignReviewers(newPaperId);
    }

    // Internal: Assign 3 random reviewers
    function assignReviewers(uint256 _paperId) internal {
        require(reviewerPool.length >= 3, "Not enough reviewers");
        
        // Simple pseudo-random assignment for MVP
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
        
        address[3] memory assigned;
        // This is a naive shuffle/selection for MVP
        for(uint i=0; i<3; i++) {
            uint256 index = (seed + i) % reviewerPool.length;
            assigned[i] = reviewerPool[index];
            papers[_paperId].reviewers[i] = assigned[i];
            
            // Initialize review struct
            reviews[_paperId][assigned[i]].reviewer = assigned[i];
        }

        emit ReviewersAssigned(_paperId, assigned);
    }

    // 3. Review Submission
    function submitReview(uint256 _paperId, string memory _reviewCid) external {
        Paper storage p = papers[_paperId];
        bool validReviewer = false;
        for(uint i=0; i<3; i++) {
            if(p.reviewers[i] == msg.sender) {
                validReviewer = true;
                break;
            }
        }
        require(validReviewer, "Not an assigned reviewer");
        
        Review storage r = reviews[_paperId][msg.sender];
        require(bytes(r.reviewCid).length == 0, "Already submitted");

        r.reviewCid = _reviewCid;
        p.reviewCount++;

        emit ReviewSubmitted(_paperId, msg.sender, _reviewCid);
    }

    // 4. Oracle Evaluation
    function evaluateReview(uint256 _paperId, address _reviewer, uint8 _score) external onlyOwner {
        Review storage r = reviews[_paperId][_reviewer];
        require(bytes(r.reviewCid).length > 0, "No review to evaluate");
        require(!r.isScored, "Already scored");

        r.score = _score;
        r.isScored = true;
        
        bool passed = _score >= PASS_SCORE;
        emit ReviewEvaluated(_paperId, _reviewer, _score, passed);

        if (passed) {
            _releasePayment(_paperId, _reviewer);
        }
        
        // Check paper completion logic could be here, but keeping it per-review for payment
    }

    function _releasePayment(uint256 _paperId, address _reviewer) internal {
        Review storage r = reviews[_paperId][_reviewer];
        require(!r.isPaid, "Already paid");
        
        r.isPaid = true;
        payable(_reviewer).transfer(REVIEWER_PAYMENT);
        
        emit PaymentReleased(_paperId, _reviewer, REVIEWER_PAYMENT);
    }

    // View functions
    function getPaper(uint256 _paperId) external view returns (Paper memory) {
        return papers[_paperId];
    }
}
