const { expect } = require("chai");
const { ethers, network } = require("hardhat");

// Hardcoded wallets from Veltrix.sol
const LP_WALLET = "0x56Dc76356Df23faF940d70fCAe9Cb0e9fA0DA9C4";
const EXCHANGE_WALLET = "0x22914550EE4b973f892ED0f344bCa7495987747e";
const TREASURY_WALLET = "0x08EcAF0a9D4FE0B5AA0771ce6b290b17D5259366";
const MARKETING_WALLET = "0x5E7F1CF4c832B754e06510680caB12bD0e922A8D";
const TEAM_WALLET = "0x39FC6A84499A3CBd81A8230031bBbE7317B0Fed8";
const DEV_WALLET = "0x5E16515222cC3ACd044205508d14110AA2c24010";

const toUnits = (value) => ethers.parseUnits(value.toString(), 18);

async function impersonate(address) {
    await network.provider.send("hardhat_impersonateAccount", [address]);
    await network.provider.send("hardhat_setBalance", [
        address,
        "0x3635C9ADC5DEA00000", // 100 ETH
    ]);
    return ethers.getSigner(address);
}

describe("Veltrix", function () {
    const INITIAL_SUPPLY = ethers.parseUnits("1000000000", 18);

    let owner;
    let addr1;
    let addr2;
    let token;
    let lpSigner;

    beforeEach(async function () {
        [owner, addr1, addr2] = await ethers.getSigners();
        const Veltrix = await ethers.getContractFactory("Veltrix");
        token = await Veltrix.deploy();
        await token.waitForDeployment();

        lpSigner = await impersonate(LP_WALLET);
    });

    describe("Deployment, metadata & ownership", function () {
        it("initializes supply, allocations, metadata and owner", async function () {
            expect(await token.getAddress()).to.be.properAddress;
            expect(await token.owner()).to.equal(owner.address);

            expect(await token.name()).to.equal("Veltrix");
            expect(await token.symbol()).to.equal("VLX-ETH");
            expect(await token.decimals()).to.equal(18);

            const totalSupply = await token.totalSupply();
            expect(totalSupply).to.equal(INITIAL_SUPPLY);

            const lp = await token.lpReserve();
            const exchange = await token.exchangeReserve();
            const treasury = await token.treasuryReserve();
            const marketing = await token.marketingReserve();
            const team = await token.teamReserve();
            const dev = await token.developmentReserve();

            const sum = lp + exchange + treasury + marketing + team + dev;
            expect(sum).to.equal(INITIAL_SUPPLY);

            expect(await token.balanceOf(LP_WALLET)).to.equal(lp);
            expect(await token.balanceOf(EXCHANGE_WALLET)).to.equal(exchange);
            expect(await token.balanceOf(TREASURY_WALLET)).to.equal(treasury);
            expect(await token.balanceOf(MARKETING_WALLET)).to.equal(marketing);
            expect(await token.balanceOf(TEAM_WALLET)).to.equal(team);
            expect(await token.balanceOf(DEV_WALLET)).to.equal(dev);
        });

        it("enforces owner-only admin and allows ownership transfer", async function () {
            await expect(
                token.connect(addr1).transferOwnership(addr1.address)
            ).to.be.reverted;

            await token.connect(owner).transferOwnership(addr1.address);
            expect(await token.owner()).to.equal(addr1.address);

            await expect(token.connect(owner).pause()).to.be.reverted;
            await token.connect(addr1).pause();
            await token.connect(addr1).unpause();
        });
    });

    describe("Transfers & allowances", function () {
        it("handles transfer, approve and transferFrom correctly", async function () {
            const amount = toUnits(1000);

            await expect(
                token.connect(lpSigner).transfer(addr1.address, amount)
            )
                .to.emit(token, "Transfer")
                .withArgs(LP_WALLET, addr1.address, amount);

            expect(await token.balanceOf(addr1.address)).to.equal(amount);

            await token.connect(lpSigner).approve(addr1.address, amount);
            await expect(
                token.connect(addr1).transferFrom(LP_WALLET, addr2.address, amount)).to.emit(token, "Transfer")
                .withArgs(LP_WALLET, addr2.address, amount);

            expect(
                await token.allowance(LP_WALLET, addr1.address)
            ).to.equal(0n);
        });

        it("reverts when spending without enough balance or approval", async function () {
            const balance = await token.balanceOf(LP_WALLET);
            const tooMuch = balance + 1n;

            await expect(
                token.connect(lpSigner).transfer(addr1.address, tooMuch)
            ).to.be.reverted;

            const amount = toUnits(100);
            await expect(
                token
                    .connect(addr1)
                    .transferFrom(LP_WALLET, addr2.address, amount)
            ).to.be.reverted;
        });
    });

    describe("Pause / Unpause", function () {
        it("only owner can pause/unpause, and paused blocks transfers", async function () {
            const amount = toUnits(100);

            await expect(token.connect(addr1).pause()).to.be.reverted;

            await token.connect(owner).pause();
            await expect(
                token.connect(lpSigner).transfer(addr1.address, amount)
            ).to.be.reverted;

            await token.connect(owner).unpause();
            await expect(
                token.connect(lpSigner).transfer(addr1.address, amount)
            ).to.emit(token, "Transfer");
        });
    });

    describe("First-buy protection", function () {
        it("enforces pool setup and first-buy must go to owner", async function () {
            await expect(
                token.connect(addr1).setUniswapPool(LP_WALLET)
            ).to.be.reverted;

            await expect(
                token.connect(owner).setUniswapPool(ethers.ZeroAddress)
            ).to.be.revertedWith("Pool address cannot be zero");

            await token.connect(owner).setUniswapPool(LP_WALLET);
            expect(await token.uniswapPool()).to.equal(LP_WALLET);

            const amount = toUnits(100);
            await expect(
                token.connect(lpSigner).transfer(addr1.address, amount)
            ).to.be.revertedWith("First Buy Pending");

            expect(await token.firstBuyCompleted()).to.equal(false);
        });
    });

    describe("Tax configuration", function () {
        it("has correct tax rates and no tax on non-pool transfers", async function () {
            expect(await token.buyTaxPercent()).to.equal(3n);
            expect(await token.sellTaxPercent()).to.equal(5n);

            const amount = toUnits(1000);

            const lpStart = await token.balanceOf(LP_WALLET);
            const addr1Start = await token.balanceOf(addr1.address);

            await token.connect(lpSigner).transfer(addr1.address, amount);

            const lpEnd = await token.balanceOf(LP_WALLET);
            const addr1End = await token.balanceOf(addr1.address);

            expect(lpStart - lpEnd).to.equal(amount);
            expect(addr1End - addr1Start).to.equal(amount);
        });

        it("applies buy tax correctly when buying from pool", async function () {
            await token.connect(owner).setUniswapPool(LP_WALLET);
            await token.connect(owner).setTaxWallet(addr2.address);

            const buyAmount = toUnits(1000);

            const ownerStart = await token.balanceOf(owner.address);
            const taxStart = await token.balanceOf(addr2.address);
            const lpStart = await token.balanceOf(LP_WALLET);

            // First buy must go to owner and is treated as a buy from pool
            await token.connect(lpSigner).transfer(owner.address, buyAmount);

            const ownerEnd = await token.balanceOf(owner.address);
            const taxEnd = await token.balanceOf(addr2.address);
            const lpEnd = await token.balanceOf(LP_WALLET);

            const taxPercent = await token.buyTaxPercent();
            const expectedTax = (buyAmount * taxPercent) / 100n;
            const expectedReceived = buyAmount - expectedTax;

            expect(lpStart - lpEnd).to.equal(buyAmount);
            expect(ownerEnd - ownerStart).to.equal(expectedReceived);
            expect(taxEnd - taxStart).to.equal(expectedTax);
        });

        it("applies sell tax correctly when selling to pool after first buy", async function () {
            await token.connect(owner).setUniswapPool(LP_WALLET);
            await token.connect(owner).setTaxWallet(addr2.address);

            const firstBuyAmount = toUnits(1000);
            await token.connect(lpSigner).transfer(owner.address, firstBuyAmount);
            expect(await token.firstBuyCompleted()).to.equal(true);

            const sellAmount = toUnits(500);

            const lpStart = await token.balanceOf(LP_WALLET);
            const ownerStart = await token.balanceOf(owner.address);
            const taxStart = await token.balanceOf(addr2.address);

            await token.connect(owner).transfer(LP_WALLET, sellAmount);

            const lpEnd = await token.balanceOf(LP_WALLET);
            const ownerEnd = await token.balanceOf(owner.address);
            const taxEnd = await token.balanceOf(addr2.address);

            const taxPercent = await token.sellTaxPercent();
            const expectedTax = (sellAmount * taxPercent) / 100n;
            const expectedSentToPool = sellAmount - expectedTax;

            expect(ownerStart - ownerEnd).to.equal(sellAmount);
            expect(lpEnd - lpStart).to.equal(expectedSentToPool);
            expect(taxEnd - taxStart).to.equal(expectedTax);
        });

        it("does not take tax if tax wallet is not set", async function () {
            await token.connect(owner).setUniswapPool(LP_WALLET);

            const firstBuyAmount = toUnits(1000);
            const ownerStart = await token.balanceOf(owner.address);
            const lpStart = await token.balanceOf(LP_WALLET);

            await token.connect(lpSigner).transfer(owner.address, firstBuyAmount);

            const ownerEnd = await token.balanceOf(owner.address);
            const lpEnd = await token.balanceOf(LP_WALLET);

            expect(lpStart - lpEnd).to.equal(firstBuyAmount);
            expect(ownerEnd - ownerStart).to.equal(firstBuyAmount);
        });
    });
});