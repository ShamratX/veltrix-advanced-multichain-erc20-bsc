//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract Veltrix is ERC20, Pausable, Ownable {

    uint8 private constant _decimals = 18;  // This line declear the decimals.
    uint256 public constant liquidityReserve    = 200_000_000 * (10 ** _decimals);
    uint256 public constant treasuryReserve     = 150_000_000 * (10 ** _decimals);
    uint256 public constant marketingReserve    = 150_000_000 * (10 ** _decimals);
    uint256 public constant teamReserve         = 200_000_000 * (10 ** _decimals);
    uint256 public constant developmentReserve  = 150_000_000 * (10 ** _decimals);
    uint256 public constant exchangeReserve     = 150_000_000 * (10 ** _decimals);

    // First buy Protection
    bool public firstBuyCompleted = false;
    event FirstBuyDone();

    // ETH = Uniswap pool, BNB = PancakeSwap pool. run code below depends on network
    address public uniswapPool;
    address public PancakeSwapPool;

    // Tax settings
    address private taxWallet;
    uint256 public constant buyTaxPercent = 3;
    uint256 public constant sellTaxPercent = 5;

    constructor() ERC20("Veltrix", "VLX-ETH") Ownable(msg.sender) {
        _mint(0x56Dc76356Df23faF940d70fCAe9Cb0e9fA0DA9C4, liquidityReserve);
        _mint(0x08EcAF0a9D4FE0B5AA0771ce6b290b17D5259366, treasuryReserve);
        _mint(0x5E7F1CF4c832B754e06510680caB12bD0e922A8D, marketingReserve);
        _mint(0x39FC6A84499A3CBd81A8230031bBbE7317B0Fed8, teamReserve);
        _mint(0x5E16515222cC3ACd044205508d14110AA2c24010, developmentReserve);
        _mint(0x22914550EE4b973f892ED0f344bCa7495987747e, exchangeReserve);
    }

    function setTaxWallet(address _taxWallet) external onlyOwner{
        require(_taxWallet != address(0), "TaxWallet: can't be zero");
        taxWallet = _taxWallet;
    }

    // Just changes uniswapPool to PancakeSwapPool for BNB (PancakeSwap)
    function setUniswapPool(address _uniswapPool) external onlyOwner {
        require(_uniswapPool != address(0), "Pool address cannot be zero");
        uniswapPool = _uniswapPool;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function increaseAllowance(address spender, uint256 addedValue) public returns (bool) {
        _approve(_msgSender(), spender, allowance(_msgSender(), spender) + addedValue);
        return true;
    }

    function decreaseAllowance(address spender, uint256 subtractedValue) public returns (bool) {
        uint256 currentAllowance = allowance(_msgSender(), spender);
        require(currentAllowance >= subtractedValue, "ERC20: decreased allowance below zero");
        _approve(_msgSender(), spender, currentAllowance - subtractedValue);
        return true;
    }

    function _update(
        address from,
        address to,
        uint256 value
    ) internal override whenNotPaused {
        // Just changes pancakeSwapPool to uniswapPool for ETH (Uniswap)
        // Set pool address to the contract and first buy from the owner address then start trading.
        if (!firstBuyCompleted && from != address(0)) {
            if (from == uniswapPool && uniswapPool != address(0)) {
                require(to == owner(), "First Buy Pending");
                firstBuyCompleted = true;
                emit FirstBuyDone();
            }
        }

        uint256 sendAmount = value;

        // Buy / sell tax (3% buy, 5% sell). No tax on normal transfers.
        if (taxWallet != address(0)) {
            // Just changes uniswapPool to PancakeSwapPool for BNB (PancakeSwap)
            bool isBuy = (from == uniswapPool && uniswapPool != address(0));
            bool isSell = (to == uniswapPool && uniswapPool != address(0));

            if (isBuy || isSell) {
                uint256 taxPercent = isBuy ? buyTaxPercent : sellTaxPercent;
                uint256 taxAmount = (value * taxPercent) / 100;

                if (taxAmount > 0) {
                    sendAmount = value - taxAmount;
                    super._update(from, taxWallet, taxAmount);
                }
            }
        }

        super._update(from, to, sendAmount);
    }
}