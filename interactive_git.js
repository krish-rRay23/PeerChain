// interactive_git.js - Utility script for creating structured git commit history
const { execSync } = require('child_process');
const readline = require('readline');
const path = require('path');
const fs = require('fs');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const commits = [
    { id: 1, message: "Initial commit: Project root setup", files: ["README.md", ".gitignore"] },
    { id: 2, message: "Config: Add root package configuration", files: ["package.json"] },
    { id: 3, message: "Config: Commit root lockfile", files: ["package-lock.json"] },
    { id: 4, message: "Contracts: Initialize Hardhat environment", files: ["contracts/package.json", "contracts/hardhat.config.cjs", "contracts/hardhat.config.js", "contracts/package-lock.json"] },
    { id: 5, message: "Contracts: Implement PaperReview.sol", files: ["contracts/contracts/PaperReview.sol"] },
    { id: 6, message: "Contracts: Add deploy scripts", files: ["contracts/scripts/deploy.js"] },
    { id: 7, message: "Backend: Server setup", files: ["backend/package.json", "backend/package-lock.json"] },
    { id: 8, message: "Backend: Core server implementation", files: ["backend/server.js"] },
    { id: 9, message: "Backend: Contract connection config", files: ["backend/contract-config.json"] },
    { id: 10, message: "Scripts: Add demo flow automation", files: ["scripts/demo_flow.js"] },
    { id: 11, message: "Frontend: Vite Project initialization", files: ["frontend/package.json", "frontend/vite.config.js", "frontend/package-lock.json"] },
    { id: 12, message: "Frontend: Entry points", files: ["frontend/index.html", "frontend/src/main.jsx"] },
    { id: 13, message: "Frontend: Global Styling", files: ["frontend/src/index.css"] },
    { id: 14, message: "Frontend: App Routing and Layout", files: ["frontend/src/App.jsx"] },
    { id: 15, message: "Frontend: Submit Paper Page", files: ["frontend/src/pages/SubmitPaper.jsx"] },
    { id: 16, message: "Frontend: Review Dashboard Page", files: ["frontend/src/pages/ReviewDashboard.jsx"] },
    { id: 17, message: "Frontend: Audit Log Page", files: ["frontend/src/pages/AuditLog.jsx"] },
    { id: 18, message: "Project: Add Git History Script", files: ["interactive_git.js"] },
    { id: 19, message: "Docs: Update README with deployment info", files: ["README.md"] },
    { id: 20, message: "Release: v1.0.0", files: [] }
];

// Helper to filter valid files
function getValidFiles(fileList) {
    return fileList.filter(f => {
        if (fs.existsSync(f)) return true;
        // console.log(`Skipping missing file: ${f}`);
        return false;
    });
}

function runCommand(command) {
    try {
        console.log(`> ${command}`);
        execSync(command, { stdio: 'inherit' });
    } catch (error) {
        console.error(`Error executing command: ${command}`);
        // Don't exit, just warn?
    }
}

async function main() {
    console.log("\n=== Interactive Git History Generator ===\n");
    console.log("Available Commits:");
    commits.forEach(c => {
        console.log(`[${c.id}] ${c.message} (${c.files.length} files)`);
    });

    while (true) {
        const answer = await new Promise(resolve => {
            rl.question("\nEnter commit IDs to apply (space separated, e.g. '1 2 3' or '1-5') or 'q' to quit: ", resolve);
        });

        if (answer.toLowerCase() === 'q') break;

        // Parse input
        const ids = new Set();
        const parts = answer.split(' ');
        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                for (let i = start; i <= end; i++) ids.add(i);
            } else {
                const num = Number(part);
                if (!isNaN(num)) ids.add(num);
            }
        }

        const sortedIds = Array.from(ids).sort((a, b) => a - b);

        for (const id of sortedIds) {
            const commit = commits.find(c => c.id === id);
            if (!commit) {
                console.log(`Skipping unknown ID: ${id}`);
                continue;
            }

            console.log(`\nProcessing Commit [${id}]: ${commit.message}`);

            const validFiles = getValidFiles(commit.files);
            if (validFiles.length > 0) {
                const fileArgs = validFiles.map(f => `"${f}"`).join(' ');
                runCommand(`git add ${fileArgs}`);
            } else if (commit.files.length > 0) {
                console.log("No valid files to add for this commit (already added?).");
            }

            // Allow empty commits if explicitly requested or if files were empty (e.g. Release)
            // But git commit fails if nothing to commit.
            // Check status first
            try {
                // We use --allow-empty to support steps that might just be messages or tags
                runCommand(`git commit -m "${commit.message}" --allow-empty`);
            } catch (e) {
                console.log("Commit failed (nothing to commit?)");
            }
        }

        const pushAns = await new Promise(resolve => {
            rl.question("\nDo you want to push these changes now? (y/n): ", resolve);
        });

        if (pushAns.toLowerCase() === 'y') {
            runCommand('git push');
        }
    }

    rl.close();
}

main();
