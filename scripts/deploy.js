const hre = require("hardhat");
const { ethers, network } = hre;

const main = async () => {
    try {
        const [deployer] = await ethers.getSigners();
        const { chainId } = await deployer.provider.getNetwork();

        const getBalance = await deployer.provider.getBalance(deployer.address);
        const balanceFormatted = ethers.formatEther(getBalance);

        console.log(`Network: ${network.name} ChainId: ${chainId}`);
        console.log(`Deployer Balance: ${balanceFormatted} ETH`);
        console.log(`Deployer Address: ${deployer.address}`);
        

        const Veltrix = await ethers.getContractFactory("Veltrix", deployer);
        const token = await Veltrix.deploy();
        await token.waitForDeployment();

        const contractAddress = await token.getAddress();

        const DeployemntTx = token.deploymentTransaction();
        const txHash = DeployemntTx ? DeployemntTx.hash : "N/A";

        const totalSupply = await token.totalSupply();
        const totalSupplyFormated = ethers.formatUnits(totalSupply ,18);

        console.log(`Contract Address: ${contractAddress}`);
        console.log(`Deployemnt Tx Hash: ${txHash}`);
        console.log(`Total Supply in Wei: ${totalSupply}`);
        console.log(`Total Supply Formatted: ${totalSupplyFormated}`);       

    } 
     catch (error) {
        console.error("Deployment Failed:", error);
        process.exitCode = 1;
    }
    
}
main();