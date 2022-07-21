const NFT = artifacts.require("NFTAnimals")
const LotteryFactory = artifacts.require("LotteryFactory")

// module.exports = async (deployer, network, accounts) => {
//   let LotteryFactoryDeploy = await deployer.deploy(LotteryFactory);
//   let LotteryFactoryDeployed = await LotteryFactory.deployed();

//   let kittyDeploy = await deployer.deploy(KittyNFT, TryFactory.address);
//   await tryFactoryDeployed.setKittyNFTAddress(KittyNFT.address)
//   await tryFactoryDeployed.createNewLottery(5, 1, 10, {gas: 6000000});
//   //var newLotteryAddr = await tryFactoryDeployed.getLottteryAddr();
//   //await tryFactoryDeployed.setLotteryAddr(newLotteryAddr);
// };

module.exports = function (deployer) {
    deployer.then(async () => {
        await deployer.deploy(NFT, { from: arguments[2][0] });
        await deployer.deploy(LotteryFactory, arguments[2][0], NFT.address, { from: arguments[2][0] });
    });
}