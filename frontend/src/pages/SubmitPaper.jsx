import React, { useState } from 'react';
import { ethers } from 'ethers';

// Helper to interact with Backend
const uploadToBackend = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch('http://localhost:3001/api/upload', {
        method: 'POST',
        body: formData
    });
    const data = await res.json();
    return data.cid;
};

// ABI Mock (Should be imported) - minimal for submit
const PAPER_REVIEW_ABI = [
    "function submitPaper(string memory _cid) external payable",
    "event PaperSubmitted(uint256 indexed paperId, string cid, address author)"
];
// We need to fetch the real address/ABI eventually, but for now assuming we pass it or fetch it.
// Ideally we fetch from http://localhost:3001/contract-config.json if we exposed it, 
// OR we just rely on `src/contract-config.json` if we copied it.
// Let's assume we can fetch it from backend if we implemented that endpoint? 
// No, backend writes to disk. Frontend can't read backend disk directly unless served.
// I'll add an endpoint to backend to serve config.

const SubmitPaper = ({ account }) => {
    const [file, setFile] = useState(null);
    const [status, setStatus] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file || !account) return;
        setStatus("Uploading to IPFS (Mock)...");

        try {
            const cid = await uploadToBackend(file);
            setStatus(`Uploaded! CID: ${cid}. Confirming transaction...`);

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            // Fetch address from backend (Need to implement endpoint or hardcode for MVP)
            // For MVP, I'll hardcode or fetch. Let's fetch.
            const configRes = await fetch('http://localhost:3001/api/config');
            const config = await configRes.json();

            const contract = new ethers.Contract(config.address, config.abi, signer);

            // 0.03 ETH (mock 2000 INR x 3 approx, actually 0.01 * 3)
            const escrow = ethers.parseEther("0.03");

            const tx = await contract.submitPaper(cid, { value: escrow });
            setStatus("Transaction sent. Waiting for confirmation...");
            await tx.wait();
            setStatus("Paper Submitted Successfully!");

        } catch (err) {
            console.error(err);
            setStatus("Error: " + (err.reason || err.message));
        }
    };

    return (
        <div className="page-container">
            <h2>Submit Scientific Paper</h2>
            <form onSubmit={handleSubmit}>
                <input type="file" onChange={e => setFile(e.target.files[0])} accept=".pdf,.txt" />
                <button type="submit" disabled={!file || !account}>Submit Paper (Uses 0.03 ETH Escrow)</button>
            </form>
            <p>{status}</p>
        </div>
    );
};

export default SubmitPaper;
