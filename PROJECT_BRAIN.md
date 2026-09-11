# PROJECT_BRAIN — veltrix-advanced-multichain-erc20-bsc

## Purpose

Tax + pause + first-buy ERC-20 suitable for DEX launch scenarios on ETH/BSC.

## Architecture

- `Veltrix.sol`: ERC20 + Pausable + Ownable
- Tax applied only when interacting with configured pool and tax wallet is set
- Tests in `test/veltrix.test.js`

## Workflow

Deploy → set tax wallet → set pool → complete first-buy to owner → open trading under pause controls as needed.

## Gotchas

- Reserves baked into bytecode at compile/deploy time.
- Distinguish from DigitX (modes, no tax) and plain MyERC20.
- package name may be `advance-erc20-token`.
