# 🧠 Decentralized Scientific Paper Review  
**No Bias. No Delays. Full Transparency.**

---

## 📌 Problem Statement

### The Brutal Reality of Academic Publishing
- ⏳ Paper reviews take **6–12 months**
- 👻 Reviewers ghost without consequences
- 🧑‍⚖️ Editor bias (rival labs, gatekeeping, favoritism)
- 🔒 Zero transparency, zero accountability

Academic peer review is **centralized, opaque, and broken**.

---

## 🚀 Solution Overview

**Decentralized Scientific Paper Review** is a blockchain + AI-powered platform that:
- Eliminates editor bias
- Enforces reviewer accountability
- Ensures review quality
- Creates a permanent, auditable trail

All without human editors.

---

## 🧩 How It Works (End-to-End Flow)

```text
Author Uploads Paper
        ↓
Paper Stored on IPFS (CID)
        ↓
Smart Contract Assigns 3 Reviewers
        ↓
Encrypted Reviews Submitted
        ↓
Reviews Stored on IPFS (CID)
        ↓
LLM Scores Review Quality
        ↓
Valid Reviews (Score ≥ 65)
        ↓
Automatic Escrow Payment Release
        ↓
Permanent Blockchain Audit Log
```
---

## 🔥 Why This Is Different

| Problem | Traditional Review | This Platform |
|------|------------------|---------------|
Editor bias | Human-controlled | ❌ Eliminated (smart contracts)
Reviewer delays | No penalties | ⏱ Enforced deadlines
Lazy reviews | Accepted | 🤖 LLM quality gate
Transparency | None | ⛓ On-chain audit trail
Payments | None | 💰 Automatic incentives

This **directly disrupts academic publishing**.

---

## 🧪 Demo Scenario (MVP)

1. Submit a mock paper
2. Smart contract assigns 3 reviewers
3. Same user simulates 3 reviewer roles
4. Reviewers submit reviews
5. LLM scores reviews
6. Smart contract releases payments
7. Blockchain displays full audit log

---

## 🏗️ Tech Stack (Strict)

### Blockchain
- Solidity `^0.8`
- Hardhat
- OpenZeppelin
- Ethereum L2 (Polygon / Arbitrum local)

### Backend
- Node.js
- Express.js

### Frontend
- React (minimal UI)

### Storage
- IPFS (mock CID acceptable)

### AI
- LLM API (review-quality scoring)

### Data
- Vector DB (in-memory / simulated)
- RAG (citation assistance)

---

## ⚙️ Functional Requirements

1. Author uploads paper → IPFS → CID stored on-chain  
2. Smart contract assigns **exactly 3 reviewers**  
3. Reviewers submit encrypted reviews → IPFS → CID on-chain  
4. Backend calls LLM → score (0–100)  
5. Score ≥ 65 → review passes  
6. After 3 passing reviews → escrow released  
7. Late / failed reviews → payment forfeited  
8. Blockchain emits full audit trail  
9. RAG suggests 5 similar accepted papers  

---

## 📜 Smart Contract Responsibilities

### Core Logic
- Paper submission
- Reviewer assignment
- Review submission
- Escrow management
- Payment release / forfeit

### Events
- `PaperSubmitted`
- `ReviewAssigned`
- `ReviewSubmitted`
- `ReviewEvaluated`
- `PaymentReleased`
- `Forfeit`

---

## 🖥 Backend Responsibilities

- IPFS mock uploader
- Reviewer matching (vector similarity + randomness)
- LLM review scoring endpoint (JSON)
- Oracle-style smart contract interaction
- RAG citation suggestion service

---

## 🌐 Frontend Pages

- Submit Paper
- Reviewer Dashboard
- Author Dashboard
  - Reviews
  - Citation suggestions
- Audit Log Viewer

---

## 📂 Project Structure

```text
.
├── contracts/              # Solidity smart contracts
├── scripts/                # Deploy & interaction scripts
├── test/                   # Contract tests
├── backend/
│   ├── routes/
│   ├── services/
│   ├── llm/
│   ├── vector-db/
│   └── server.js
├── frontend/
│   ├── src/
│   ├── pages/
│   └── components/
├── README.md
├── package.json
└── hardhat.config.js
