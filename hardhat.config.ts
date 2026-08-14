import "dotenv/config";
import { defineConfig } from "hardhat/config";
import hardhatEthers from "@nomicfoundation/hardhat-ethers";
import hardhatVerify from "@nomicfoundation/hardhat-verify";

export default defineConfig({
  plugins: [hardhatEthers, hardhatVerify],

  solidity: {
    version: "0.8.28",
  },

  networks: {
    arcTestnet: {
      type: "http",
      url: process.env.ARC_TESTNET_RPC_URL!,
      chainId: 5042002,
      accounts: [process.env.PRIVATE_KEY!],
    },
  },
});