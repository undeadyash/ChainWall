import { ethers } from "ethers";

const RPC_URL = "http://127.0.0.1:8545";

const WALLET_ADDRESS =
  "0x2b5f8758e221c7e36f4aebb62c6aaab9e6bfd295";

async function main() {
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  const balance = ethers.parseEther("100");

  await provider.send("hardhat_setBalance", [
    WALLET_ADDRESS,
    ethers.toBeHex(balance),
  ]);

  const newBalance = await provider.getBalance(WALLET_ADDRESS);

  console.log("Wallet:", WALLET_ADDRESS);
  console.log(
    "Balance:",
    ethers.formatEther(newBalance),
    "GO"
  );
  console.log("SUCCESS: OKX wallet funded with 100 GO.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});