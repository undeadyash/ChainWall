const hre = require("hardhat");

async function main() {
  const ChainWall = await hre.ethers.getContractFactory("ChainWall");
  const chainWall = await ChainWall.deploy();

  await chainWall.waitForDeployment();

  console.log("ChainWall deployed to:", await chainWall.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});