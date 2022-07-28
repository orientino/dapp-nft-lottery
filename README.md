# DApp NFT Lottery 
Decentralized application that simulates the [powerball](https://en.wikipedia.org/wiki/Powerball) game where the players can win a custom ERC721 NFT token. The application is made by a frontend part in Javascript Web3, and the backed smart contract using Solidity. For more details, check `/reports/`.

# Installing
```
npm init
npm install --save lite-server
npm install --save web3
npm install --save @truffle/contract
npm install @openzeppelin/contracts
```

# Launch
```
ganache -p 8545 --seed 42
truffle compile
truffle test
truffle migrate --reset
npm run dev
```
