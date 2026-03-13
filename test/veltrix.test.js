const { expect } = require("chai");
const { ethers, network } = require("hardhat");

// Hardcoded Wallet from Veltrix.sol
const liquidity_wallet   = "0x56Dc76356Df23faF940d70fCAe9Cb0e9fA0DA9C4";
const treasury_wallet    = "0x08EcAF0a9D4FE0B5AA0771ce6b290b17D5259366";
const marketing_wallet   = "0x5E7F1CF4c832B754e06510680caB12bD0e922A8D";
const team_wallet        = "0x39FC6A84499A3CBd81A8230031bBbE7317B0Fed8";
const development_wallet = "0x5E16515222cC3ACd044205508d14110AA2c24010";
const exchange_wallet    = "0x22914550EE4b973f892ED0f344bCa7495987747e";

const toUnits = (value) => ethers.parseUnits(value.toString(), 18);

async function impersonate(address) {
  await network.provider.send("hardhat_impersonateAccount", [address]);
  await network.provider.send("hardhat_setBalance", [address, "0x3635C9ADC5DEA00000"]);
  return ethers.getSigner(address);
}

describe("Veltrix", function() {
  const INITIAL_SUPPLY = ethers.parseUnits("1000000000", 18);

  let owner;
  let addr1;
  let addr2;
  let token;
  let liquiditySigner;

  beforeEach(async function () {
    [owner, addr1, addr2] = await ethers.getSigners();
    const Veltrix = await ethers.getContractFactory("Veltrix");
    token = await Veltrix.deploy();
    await token.waitForDeployment();

    liquiditySigner = await impersonate(liquidity_wallet);
  });


  describe("Deployment, metadata & ownership", function() {
    it("Initializes supply, allocations, metadata & owner", async function() {
      expect(await token.getAddress()).to.be.properAddress;
      expect(await token.owner()).to.equal(owner.address);

      expect(await token.name()).to.equal("Veltrix");
      expect(await token.symbol()).to.equal("VLX-ETH");
      expect(await token.decimals()).to.equal(18);

      const totalSupply = await token.totalSupply();
      expect(totalSupply).to.equal(INITIAL_SUPPLY);

      const liquidity   = await token.liquidityReserve();
      const treasury    = await token.treasuryReserve();
      const marketing   = await token.marketingReserve();
      const team        = await token.teamReserve();
      const development = await token.developmentReserve();
      const exchange    = await token.exchangeReserve();
      
      const sum = liquidity + treasury + marketing + team + development + exchange;
      expect(sum).to.equal(INITIAL_SUPPLY);

      expect(await token.balanceOf(liquidity_wallet)).to.equal(liquidity);
      expect(await token.balanceOf(treasury_wallet)).to.equal(treasury);
      expect(await token.balanceOf(marketing_wallet)).to.equal(marketing);
      expect(await token.balanceOf(team_wallet)).to.equal(team);
      expect(await token.balanceOf(development_wallet)).to.equal(development);
      expect(await token.balanceOf(exchange_wallet)).to.equal(exchange);
    });

    it("Enforces owner-only admin and allow ownership transfer", async function() {
      await expect(token.connect(addr1).transferOwnership(addr1.address)).to.be.reverted;

      await token.connect(owner).transferOwnership(addr1.address);
      expect(await token.owner()).to.be.equal(addr1.address);

      await expect(token.connect(owner).pause()).to.be.reverted;
      await token.connect(addr1).pause();
      await token.connect(addr1).unpause();
    });
  });

  describe("Transfer & allowance", function() {
    it("Handles transfer, approve and transferFrom correctly", async function() {
      const amount = toUnits(1000);

      await expect(token.connect(liquiditySigner).transfer(addr1.address, amount)
      ).to.emit(token, "Transfer").withArgs(liquidity_wallet, addr1.address, amount);

      expect(await token.balanceOf(addr1.address)).to.equal(amount);
      await token.connect(liquiditySigner).approve(addr1.address, amount);

      await expect(token.connect(addr1).transferFrom(liquidity_wallet, addr1.address, amount)).to.emit(token, "Transfer").withArgs(liquidity_wallet, addr1.address, amount);

      expect(await token.allowance(liquidity_wallet, addr1.address)).to.equal(0n);
    });

    it("Revert when spending without enough balance or approval", async function() {
      const balance = await token.balanceOf(liquidity_wallet);
      const tooMuch = balance + 1n;

      await expect(token.connect(liquiditySigner).transfer(addr1.address, tooMuch)).to.be.reverted;

      const amount = toUnits(100);
      await expect(token.connect(addr1).transferFrom(liquidity_wallet, addr2.address, amount)).to.be.reverted;
    });

    it("Increase/decrease allowance helpers work and enforce 0", async function() {
      await token.connect(liquiditySigner).increaseAllowance(addr1.address, toUnits(200));
      expect(await token.allowance(liquidity_wallet, addr1.address)).to.equal(toUnits(200));

      await token.connect(liquiditySigner).decreaseAllowance(addr1.address, toUnits(50));
      expect (await token.allowance(liquidity_wallet, addr1.address)).to.equal(toUnits(150));

      await expect(token.connect(liquiditySigner).decreaseAllowance(addr1.address, toUnits(200))).to.be.revertedWith("ERC20 decreased allowance below zero");
    });
  });

  describe("Pause/Unpause", function() {
    it("Only owner can pause/unpause, and paused blocks transfer", async function() {
      const amount = toUnits(100);
      await expect(token.connect(addr1).pause()).to.be.reverted;

      await token.connect(owner).pause();
      await expect(token.connect(liquiditySigner).transfer(addr1.address, amount)).to.be.reverted;

      await token.connect(owner).unpause();
      await expect(token.connect(liquiditySigner).transfer(addr1.address, amount)).to.emit(token, "Transfer");
    });
  });

  describe("First buy protection", function() {
    it("Enforces pool setup and first-buy must go to owner", async function() {
      await expect(token.connect(addr1).setUniswapPool(liquidity_wallet)).to.be.reverted;
      await expect(token.connect(owner).setUniswapPool(ethers.ZeroAddress)).to.be.revertedWith("Pool Address Can't be Zero");

      await token.connect(owner).setUniswapPool(liquidity_wallet);
      expect(await token.uniswapPool()).to.equal(liquidity_wallet);

      const amount = toUnits(100);
      await expect(token.connect(liquiditySigner).transfer(addr1.address, amount)).to.be.revertedWith("First Buy Pending");

      expect(await token.firstBuyCompleted()).to.equal(false);
    });
  });

  describe("Tax configuration", function() {
    it("Has correct tax rates and no tax on non-pool transfers", async function() {
      expect(await token.buyTaxPercent()).to.equal(3n);
      expect(await token.sellTaxPercent()).to.equal(5n);

      const amount = toUnits(1000);

      const liquidityStart = await token.balanceOf(liquidity_wallet);
      const addr1Start = await token.balanceOf(addr1.address);

      await token.connect(liquiditySigner).transfer(addr1.address, amount);

      const liquidityEnd = await token.balanceOf(liquidity_wallet);
      const addr1End = await token.balanceOf(addr1.address);
      
      expect(liquidityStart - liquidityEnd).to.equal(amount);
      expect(addr1End - addr1Start).to.equal(amount);
    });
  });
});
