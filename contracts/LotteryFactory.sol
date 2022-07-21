// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import "./Lottery.sol";


contract LotteryFactory {

    Lottery lottery;

    address public admin;
    address public nft; 

    event LotteryCreated();

    constructor(address _admin, address _nft) {
        admin = _admin;
        nft = _nft;
    }

    function createLottery() public {
        // require(msg.sender == admin, "");
        lottery = new Lottery(admin, nft);
        emit LotteryCreated();
    }

    function getLotteryAddress() public view returns(address) {
        return address(lottery);
    }
}