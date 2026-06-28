# Advance ERC20 — Veltrix

Advance ERC20 is a modern **ERC-20 token smart contract** built with **Hardhat** and **OpenZeppelin v5**.
It includes production-ready features such as **buy/sell taxation, liquidity-pool detection, anti-sniper protection, pause control, and multi-network deployment support**.

The contract is designed for deployment on **Ethereum** and **BNB Smart Chain** networks.

---

## Key Features

* ERC-20 standard implementation using **OpenZeppelin v5**
* Fixed supply with structured **reserve allocation**
* **Buy tax (3%)** and **Sell tax (5%)**
* **Wallet-to-wallet transfers with zero tax**
* **First-buy protection** to prevent launch sniping bots
* **Pause / unpause system** for emergency control
* **Liquidity pool detection** for automated tax logic
* **Hardhat development environment**
* **Multi-network deployment support**

---

## Standard ERC-20 Implementation

The contract is built using OpenZeppelin's audited components:

* ERC20
* Ownable
* Pausable

The token uses the modern OpenZeppelin **`_update()` hook** instead of overriding `_transfer()`, enabling custom logic like taxes and trading restrictions while keeping the ERC-20 standard intact.

Standard IERC20 functions (`transfer`, `approve`, `transferFrom`, `allowance`, etc.) are inherited from OpenZeppelin ERC20.

---

## Token Supply

| Property     | Value              |
| ------------ | ------------------ |
| Total Supply | 1,000,000,000 VLX  |
| Decimals     | 18                 |
| Symbol       | VLX-ETH            |

All tokens are minted **once in the constructor** and distributed into predefined reserves.

---

## Reserve Allocation

The supply is split across multiple operational wallets.

| Reserve             | Amount       | Purpose                      |
| ------------------- | ------------ | ---------------------------- |
| Liquidity Reserve   | 200,000,000  | Liquidity pool creation      |
| Team Reserve        | 200,000,000  | Core team allocation         |
| Treasury Reserve    | 150,000,000  | Project treasury             |
| Marketing Reserve   | 150,000,000  | Marketing & promotion        |
| Development Reserve | 150,000,000  | Future development           |
| Exchange Reserve    | 150,000,000  | Centralized exchange listing |

Each reserve is sent to a **hard-coded wallet address during deployment**.

---

## Buy / Sell Tax System

The contract includes a basic trading tax mechanism.

| Transaction Type    | Tax |
| ------------------- | --- |
| Buy (DEX → Wallet)  | 3%  |
| Sell (Wallet → DEX) | 5%  |
| Wallet → Wallet     | 0%  |

Tax logic:

* Buy detected when `from == uniswapPool`
* Sell detected when `to == uniswapPool`
* Tax is only applied when `taxWallet` has been set via `setTaxWallet()`

Tax is transferred to the dedicated **taxWallet**.

Example formula:

```
taxAmount = (value * taxPercent) / 100
```

> On BNB Smart Chain, use `setUniswapPool()` with the PancakeSwap pool address (same variable, network-dependent naming in comments).

---

## First-Buy Protection (Anti-Sniper)

Before trading begins:

```
firstBuyCompleted = false
```

Once the owner sets the liquidity pool address (`uniswapPool`), the **first buy transaction must be executed by the owner**.

Condition:

```
if from == uniswapPool AND firstBuyCompleted == false
then to must equal owner()
```

If another wallet attempts to buy first, the transaction will revert with:

```
"First Buy Pending"
```

After the owner's first buy:

```
firstBuyCompleted = true
```

Event emitted:

```
FirstBuyDone
```

After this event, **public trading becomes available**.

---

## Pause System

The contract supports emergency pause functionality.

Owner can call:

* `pause()` — blocks all token transfers
* `unpause()` — resumes transfers

---

## Access Control

Owner privileges include:

* setting the tax wallet (`setTaxWallet`)
* setting the main liquidity pool (`setUniswapPool`)
* pausing / unpausing transfers
* administrative contract control

Owner is set automatically during deployment via **Ownable**.

---

## Contract Functions

### Custom functions

| Function | Description |
| -------- | ----------- |
| `setTaxWallet(address)` | Sets the wallet that receives buy/sell tax |
| `setUniswapPool(address)` | Sets the primary liquidity pool used for tax and first-buy detection |
| `pause()` | Pauses all token transfers |
| `unpause()` | Resumes token transfers |

### Inherited ERC-20 functions

| Function | Description |
| -------- | ----------- |
| `transfer(address to, uint256 amount)` | Transfer tokens |
| `approve(address spender, uint256 amount)` | Set spender allowance |
| `transferFrom(address from, address to, uint256 amount)` | Transfer using allowance |
| `allowance(address owner, address spender)` | View current allowance |

> OpenZeppelin v5 does not include `increaseAllowance` / `decreaseAllowance`. Use `approve` to update allowances.

---

## Tech Stack

* Node.js
* Hardhat
* NPM
* OpenZeppelin Contracts v5
* Hardhat Toolbox
* Hardhat Gas Reporter
* dotenv

---

## Supported Networks

| Network          | Hardhat flag  |
| ---------------- | ------------- |
| Sepolia Testnet  | `sepolia`     |
| Ethereum Mainnet | `mainnet`     |
| BSC Testnet      | `bscTestnet`  |
| BSC Mainnet      | `bsc`         |

Network configuration is defined in `hardhat.config.js`.

---

## Project Structure

```
Advance-ERC20-Token-tax-first-buy-pause-unpause/
├── contracts/
│   └── Veltrix.sol
├── scripts/
│   └── deploy.js
├── test/
│   └── veltrix.test.js
├── hardhat.config.js
├── .env.example
└── package.json
```

---

## Installation

Clone the repository:

```bash
git clone <YOUR_REPO_URL>
cd Advance-ERC20-Token-tax-first-buy-pause-unpause
```

Install dependencies:

```bash
npm install
```

---

## Environment Variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

| Variable | Description |
| -------- | ----------- |
| `PRIVATE_KEY` | Deployer wallet private key (without `0x` prefix) |
| `ETH_SEPOLIA_RPC_URL` | Ethereum Sepolia RPC URL |
| `ETH_MAINNET_RPC_URL` | Ethereum mainnet RPC URL |
| `BSC_TESTNET_RPC_URL` | BSC testnet RPC URL |
| `BSC_MAINNET_RPC_URL` | BSC mainnet RPC URL |
| `ETHERSCAN_API_KEY` | Etherscan API key (Ethereum verification) |
| `BSCSCAN_API_KEY` | BscScan API key (BSC verification) |

---

## Compile Contract

```bash
npx hardhat compile
```

---

## Run Tests

```bash
npx hardhat test
```

---

## Deployment

Deploy to Sepolia:

```bash
npx hardhat run scripts/deploy.js --network sepolia
```

Deploy to BSC Testnet:

```bash
npx hardhat run scripts/deploy.js --network bscTestnet
```

After a successful deployment, the script prints a ready-to-run **verify command** in the console output.

---

## Contract Verification

The deploy script automatically logs the verification command:

```
Verify Command:
npx hardhat verify --network sepolia 0xYourDeployedContractAddress
```

You can also run verification manually:

```bash
npx hardhat verify --network sepolia DEPLOYED_CONTRACT_ADDRESS
```

`Veltrix` has no constructor arguments, so no extra flags are required.

For BSC networks, set `BSCSCAN_API_KEY` in `.env` and update `etherscan` config in `hardhat.config.js`.

---

## Security Considerations

* First-buy protection prevents launch sniping bots
* Pause system allows emergency shutdown
* Tax routing is deterministic and transparent
* Fixed supply prevents inflation
* Tax only applies after `taxWallet` is configured by the owner

---

## License

MIT License
