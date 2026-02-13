const hre = require("hardhat");

async function main() {
    const [deployer] = await hre.ethers.getSigners();

    console.log("Deploying contracts with the account:", deployer.address);

    const PaperReview = await hre.ethers.getContractFactory("PaperReview");
    const paperReview = await PaperReview.deploy();

    await paperReview.waitForDeployment();

    console.log("PaperReview deployed to:", await paperReview.getAddress());

    // Save address to a file for frontend/backend to read
    const fs = require("fs");
    const path = require("path");
    const addressDir = path.join(__dirname, "../../backend");
    if (!fs.existsSync(addressDir)) {
        fs.mkdirSync(addressDir, { recursive: true });
    }
    const config = {
        address: await paperReview.getAddress(),
        abi: JSON.parse(paperReview.interface.formatJson())
    };
    fs.writeFileSync(
        path.join(addressDir, "contract-config.json"),
        JSON.stringify(config, null, 2)
    );
    console.log("Contract config saved to backend/contract-config.json");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
