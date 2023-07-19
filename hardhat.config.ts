import { HardhatUserConfig } from 'hardhat/config';
import * as dotenv from "dotenv";
dotenv.config();
import '@nomicfoundation/hardhat-chai-matchers';
import '@nomiclabs/hardhat-ethers';
import '@nomiclabs/hardhat-etherscan';
import '@typechain/hardhat';
import 'hardhat-contract-sizer';
import 'hardhat-gas-reporter';
import 'solidity-coverage';
import 'hardhat-local-networks-config-plugin';

import './tasks';

import mocharc from './.mocharc.json';

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  networks: {
    mumbai: {
      url: process.env.POLYGON_MUMBAI_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
    goerli: {
      url: process.env.GOERLI_URL,
      accounts: [process.env.PRIVATE_KEY],
    },
  },
  solidity: {
    compilers: [
      {
        version: '0.8.17',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
          // Enable in future if contract size is an issue
          // Not enabling now because hardhat stack traces and
          // coverage reporting don't yet support it
          // viaIR: true,
          outputSelection: {
            '*': {
              '*': ['storageLayout'],
            },
          },
        },
      },
    ],
    overrides: {
      // Enable this to turn of viaIR for proxy contract
      // 'contracts/proxy/Proxy.sol': {
      //   version: '0.8.17',
      //   settings: {
      //     viaIR: false,
      //   },
      // },
    },
  },
  mocha: mocharc,
  gasReporter: {
    enabled: true,
    currency: 'USD',
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};

export default config;
