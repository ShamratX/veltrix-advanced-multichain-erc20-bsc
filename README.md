# Veltrix — Advanced ERC-20

Modern ERC-20 with **buy/sell tax**, liquidity-pool detection, first-buy protection, and pause control. Built with Hardhat + OpenZeppelin; deployable on Ethereum and BNB Smart Chain.

## Features

- Fixed 1B supply with hardcoded reserve allocations at deploy
- Buy tax **3%**, sell tax **5%** (when `taxWallet` is set); wallet↔wallet transfers untaxed
- Pool detection via configured Uniswap-style pool address
- First-buy: first transfer from pool must go to owner
- `pause` / `unpause` (Pausable)
- Hardhat tests for allocation, pause, first-buy, and tax paths

## Requirements

- Node.js 18+
- npm
- Deployer key + RPC URLs in `.env`

## Quick start

```bash
git clone https://github.com/ShamratX/veltrix-advanced-multichain-erc20-bsc.git
cd veltrix-advanced-multichain-erc20-bsc
npm install
cp .env.example .env
npx hardhat compile
npx hardhat test
npx hardhat run scripts/deploy.js --network bscTestnet
```

Networks: `hardhat`, `sepolia`, `eth`, `bscTestnet`, `bsc`.

## Config (env names)

`PRIVATE_KEY`, `ETH_SEPOLIA_RPC_URL`, `ETH_MAINNET_RPC_URL`, `BSC_TESTNET_RPC_URL`, `BSC_MAINNET_RPC_URL`, `ETHERSCAN_API_KEY`, `BSCSCAN_API_KEY`

Reserve addresses are set in the contract constructor (not from env).

## Project structure

```text
contracts/Veltrix.sol
scripts/deploy.js
test/veltrix.test.js
hardhat.config.js
```

On-chain name/symbol in source: `"Veltrix"` / `"VLX-ETH"` (update before production if needed).

## Limitations

- Tax rates are constants in Solidity (3% / 5%).
- A `PancakeSwapPool` state variable may exist unused; pool logic uses the Uniswap pool setter path (reuse for Pancake on BSC as documented in code comments).
- No DigitX-style transfer modes.
- Use `--network eth` for Ethereum mainnet in this config.

## License

See repository / package metadata.
