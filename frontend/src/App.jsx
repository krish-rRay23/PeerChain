// App.jsx - Main application component with routing and wallet connection
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { ethers } from 'ethers';
import SubmitPaper from './pages/SubmitPaper';
import ReviewDashboard from './pages/ReviewDashboard';
import AuditLog from './pages/AuditLog';


// Contract Config (Read from backend generated file if we were doing full build, 
// for MVP we can hardcode or import from a shared location if served)
// For local dev, we might need to manually update this or fetch from backend API.
// We'll fetch from backend for convenience.

function App() {
    const [account, setAccount] = useState(null);

    const connectWallet = async () => {
        console.log("Checking for window.ethereum...");
        if (typeof window.ethereum !== 'undefined') {
            try {
                const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                setAccount(accounts[0]);
                console.log("Connected:", accounts[0]);
            } catch (error) {
                console.error("Error connecting wallet", error);
                if (error.code === -32002) {
                    alert("A MetaMask request is already pending. Please open the MetaMask extension in your browser toolbar to approve it!");
                } else {
                    alert("Failed to connect wallet: " + error.message);
                }
            }
        } else {
            console.error("window.ethereum is undefined");
            alert("MetaMask not detected! If you just installed it, please REFRESH the page.");
        }
    };

    return (
        <Router>
            <div className="app-container">
                <header>
                    <h1>Decentralized Science Review</h1>
                    <nav>
                        <Link to="/">Submit Paper</Link>
                        <Link to="/review">Review Dashboard</Link>
                        <Link to="/audit">Audit Log</Link>
                    </nav>
                    <div className="wallet-connect">
                        {account ? <span>{account.slice(0, 6)}...{account.slice(-4)}</span> : <button onClick={connectWallet}>Connect Wallet</button>}
                    </div>
                </header>

                <main>
                    <Routes>
                        <Route path="/" element={<SubmitPaper account={account} />} />
                        <Route path="/review" element={<ReviewDashboard account={account} />} />
                        <Route path="/audit" element={<AuditLog />} />
                    </Routes>
                </main>
            </div>
        </Router>
    );
}

export default App;
