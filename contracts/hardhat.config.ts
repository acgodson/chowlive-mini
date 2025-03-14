import type { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox-viem";
import * as dotenv from "dotenv";
dotenv.config();

import { NetworkUserConfig } from "hardhat/types";

function getTestnetChainConfig(): NetworkUserConfig {
  const config: NetworkUserConfig = {
    url: "https://rpc.testnet.lukso.network",
    chainId: 4201,
  };

  if (process.env.PRIVATE_KEY !== undefined) {
    config["accounts"] = [process.env.PRIVATE_KEY];
  }

  return config;
}

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.28",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    luksoTestnet: getTestnetChainConfig(),
    hardhat: {
      accounts: process.env.PRIVATE_KEY !== undefined 
        ? [{ privateKey: process.env.PRIVATE_KEY, balance: "10000000000000000000000" }]
        : []
    },
  },
};

export default config;
