import { network } from "hardhat";

async function main() {
  const { ethers } = await network.connect();

  const chainWallV2 = await ethers.deployContract("ChainWallV2");

  await chainWallV2.waitForDeployment();

  const address = await chainWallV2.getAddress();

  console.log("ChainWallV2 deployed to:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});