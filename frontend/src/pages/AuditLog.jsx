// AuditLog.jsx - Displays transparent blockchain event history from the smart contract
import React, { useState, useEffect } from 'react';
import { ethers } from 'ethers';

const AuditLog = () => {
    const [events, setEvents] = useState([]);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const configRes = await fetch('/api/config');
            const config = await configRes.json();

            // Connect to provider (read-only is fine)
            // Ideally use WebSocketProvider for real-time, but JSON-RPC is fine for poll/load
            const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
            const contract = new ethers.Contract(config.address, config.abi, provider);

            const filterSubmitted = contract.filters.PaperSubmitted();
            const filterReview = contract.filters.ReviewSubmitted();
            const filterEvaluated = contract.filters.ReviewEvaluated();
            const filterPayment = contract.filters.PaymentReleased();

            // Fetch logs
            const [submitted, review, evaluated, payment] = await Promise.all([
                contract.queryFilter(filterSubmitted),
                contract.queryFilter(filterReview),
                contract.queryFilter(filterEvaluated),
                contract.queryFilter(filterPayment)
            ]);

            const allEvents = [
                ...submitted.map(e => ({ name: 'PaperSubmitted', args: e.args, block: e.blockNumber })),
                ...review.map(e => ({ name: 'ReviewSubmitted', args: e.args, block: e.blockNumber })),
                ...evaluated.map(e => ({ name: 'ReviewEvaluated', args: e.args, block: e.blockNumber })),
                ...payment.map(e => ({ name: 'PaymentReleased', args: e.args, block: e.blockNumber }))
            ].sort((a, b) => b.block - a.block);

            setEvents(allEvents);

        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="page-container">
            <h2>Audit Log (Transparent Blockchain Events)</h2>
            <button onClick={fetchEvents}>Refresh Logs</button>
            <div className="log-list">
                {events.map((e, idx) => (
                    <div key={idx} className="log-entry">
                        <span className="log-type">{e.name}</span>
                        <span className="log-block">Block: {e.block}</span>
                        <div className="log-details">
                            {e.name === 'PaperSubmitted' && `Paper #${e.args[0]} | CID: ${e.args[1]} | Author: ${e.args[2].substring(0, 6)}...`}
                            {e.name === 'ReviewSubmitted' && `Paper #${e.args[0]} | Reviewer: ${e.args[1].substring(0, 6)}... | CID: ${e.args[2]}`}
                            {e.name === 'ReviewEvaluated' && `Paper #${e.args[0]} | Reviewer: ${e.args[1].substring(0, 6)}... | Score: ${e.args[2]} | Passed: ${e.args[3]}`}
                            {e.name === 'PaymentReleased' && `Paper #${e.args[0]} | Reviewer: ${e.args[1].substring(0, 6)}... | Amount: ${ethers.formatEther(e.args[2])} ETH`}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default AuditLog;
