// ReviewDashboard.jsx - Displays assigned papers and allows reviewers to submit reviews
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const ReviewDashboard = ({ account }) => {
    const [papers, setPapers] = useState([]);
    const [myReviews, setMyReviews] = useState([]);
    const [loading, setLoading] = useState(false);
    const [reviewContent, setReviewContent] = useState("");
    const [activePaper, setActivePaper] = useState(null);

    useEffect(() => {
        if (account) fetchAssignedParticles();
    }, [account]);

    const fetchAssignedParticles = async () => {
        try {
            const configRes = await fetch('http://localhost:3001/api/config');
            const config = await configRes.json();
            const provider = new ethers.BrowserProvider(window.ethereum);
            const contract = new ethers.Contract(config.address, config.abi, provider);

            // In a real app we'd index this off-chain (The Graph) or iterate.
            // MVP: Iterate first 10 papers to see if assigned.
            const pCount = await contract.paperCounter();
            const found = [];

            for (let i = 1; i <= Number(pCount); i++) {
                const paper = await contract.getPaper(i);
                // Check if I am a reviewer
                // paper.reviewers is an array [addr, addr, addr]
                // Note: ethers returns a Result object that acts like an array
                const reviewers = paper.reviewers.map(r => r.toLowerCase());
                if (reviewers.includes(account.toLowerCase())) {
                    // Check if I already reviewed
                    // We can call reviews(paperId, myAddr) but for MVP let's just list papers
                    found.push({
                        id: Number(paper.id),
                        cid: paper.cid,
                        author: paper.author
                    });
                }
            }
            setPapers(found);
        } catch (err) {
            console.error(err);
        }
    };

    const submitReview = async (paperId) => {
        if (!reviewContent) return;
        setLoading(true);
        try {
            // 1. Upload review text to IPFS Mock
            const blob = new Blob([reviewContent], { type: 'text/plain' });
            const formData = new FormData();
            formData.append('file', blob, 'review.txt');

            const uploadRes = await fetch('http://localhost:3001/api/upload', { method: 'POST', body: formData });
            const { cid } = await uploadRes.json();

            // 2. Submit to Chain
            const configRes = await fetch('http://localhost:3001/api/config');
            const config = await configRes.json();
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const contract = new ethers.Contract(config.address, config.abi, signer);

            const tx = await contract.submitReview(paperId, cid);
            await tx.wait();

            // 3. Trigger Oracle Evaluation (Backend)
            // In real world, backend watches event. Here we manually trigger for MVP instant feedback.
            await fetch('http://localhost:3001/api/oracle/evaluate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    paperId: paperId,
                    reviewerAddress: account,
                    reviewContent: reviewContent
                })
            });

            alert("Review Submitted & Evaluated!");
            setReviewContent("");
            setActivePaper(null);
            fetchAssignedParticles(); // Refresh
        } catch (err) {
            console.error(err);
            alert("Error: " + err.message);
        }
        setLoading(false);
    };

    return (
        <div className="page-container">
            <h2>Reviewer Dashboard</h2>
            {papers.length === 0 ? <p>No papers assigned (or connect wallet/register as reviewer first on-chain using hardhat task).</p> : (
                <div className="paper-list">
                    {papers.map(p => (
                        <div key={p.id} className="paper-card">
                            <h3>Paper #{p.id}</h3>
                            <p>CID: {p.cid}</p>
                            <button onClick={() => setActivePaper(p.id)}>Write Review</button>
                        </div>
                    ))}
                </div>
            )}

            {activePaper && (
                <div className="review-modal">
                    <h3>Reviewing Paper #{activePaper}</h3>
                    <textarea
                        value={reviewContent}
                        onChange={e => setReviewContent(e.target.value)}
                        placeholder="Write your review here... Be specific and constructive!"
                    />
                    <button disabled={loading} onClick={() => submitReview(activePaper)}>
                        {loading ? "Submitting..." : "Submit Review"}
                    </button>
                    <button onClick={() => setActivePaper(null)}>Cancel</button>
                </div>
            )}
        </div>
    );
};

export default ReviewDashboard;
