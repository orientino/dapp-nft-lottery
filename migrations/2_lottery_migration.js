const NFT = artifacts.require("NFTAnimals")
const LotteryFactory = artifacts.require("LotteryFactory")

module.exports = function (deployer) {
    deployer.then(async () => {
        await deployer.deploy(NFT, { from: arguments[2][0] });
        await deployer.deploy(LotteryFactory, arguments[2][0], NFT.address, { from: arguments[2][0] });
    });
}