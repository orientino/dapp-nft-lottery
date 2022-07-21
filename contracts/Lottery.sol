// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "./NFTAnimals.sol";

contract Lottery {

    uint constant TICKET_PRICE = 1 wei;
    uint8 constant MAX_WHITEBALL = 69;
    // uint8 constant MAX_POWERBALL = 26;
    uint8 constant MAX_POWERBALL = 3;
    uint8 constant ROUND_DURATION = 3;

    address admin;
    address balance;
    NFTAnimals nft;

    uint public blockStart;
    uint public roundCounter;
    bool public prizesDistributed;

    mapping(uint8 => bool) whiteballsMapping;
    uint8[5] public whiteballsArray;
    uint8 public powerball;

    // Mapping of tickets/prizes/winners for each round
    mapping(uint => Ticket[]) ticketsPerRound;

    struct Ticket {
        address owner;
        uint8[5] whiteballs;
        uint8 powerball;
    }

    event Logging(string output, address caller);
    event LoggingTicketPurchase(uint8[5] whiteballs, uint powerball, address buyer);
    event LoggingTicketWin(uint8[5] whiteballs, uint powerball);
    event LoggingMintNFT(uint8 class, address caller);
    event LoggingWinner(address winner, uint id, uint8 prizeClass);
    event LoggingRefund(address player, string output);

    // --------------------------------------------------------
    // MODIFIERS

    modifier adminOnly() {
        require(msg.sender == admin,
            "This function can be called only by the Admin.");
        _;
    }

    modifier roundIsActive() {
        require(isRoundActive() && roundCounter > 0, 
            "This function can be called only when the round is active.");
        _;
    }

    modifier roundIsInactive() {
        require(!isRoundActive() && roundCounter > 0 && !prizesDistributed,
            "This function can be called only when the purchase phase is finished and the prize haven't been assigned yet.");
        _;
    }

    modifier roundIsEnded() {
        require(prizesDistributed,
            "This function can be called only when the current round's prize have been assigned.");
        _;
    }
    
    // --------------------------------------------------------
    // FUNCTIONS

    constructor(address _admin, address _nft) {
        require(admin == address(0), "");
        admin = _admin;
        roundCounter = 0;
        prizesDistributed = true;
        nft = NFTAnimals(_nft);

        // Mint some initial NFT's
        for (uint8 i=1; i<nft.N_CLASSES()+1; i++)
            nft.mint(address(this), i);
    }
    
    function startNewRound() adminOnly roundIsEnded public {
        // Reset states
        blockStart = block.number;
        prizesDistributed = false;

        for (uint8 i=0; i<whiteballsArray.length; i++)
            whiteballsMapping[whiteballsArray[i]] = false;
        
        whiteballsArray = [0, 0, 0, 0, 0];
        powerball = 0;
        roundCounter++;

        emit Logging(
            string.concat("Round ", Strings.toString(roundCounter), " started!"), 
            msg.sender
        );
    }

    function buy(uint8[5] memory _whiteballs, uint8 _powerball) roundIsActive payable public {
        // Guard conditions: check payment price and powerball range validity
        require(msg.value == TICKET_PRICE, 
            "Purchase failed: incorrect price ticket.");
        require(_powerball > 0 && _powerball <= MAX_POWERBALL, 
            "Purchase failed: out of range powerball number.");

        // Guard conditions: check whiteballs range validity and duplicates
        for (uint8 i=0; i<_whiteballs.length; i++) {
            require(_whiteballs[i] > 0 && _whiteballs[i] <= MAX_WHITEBALL, 
                "Purchase failed: out of range whiteball number.");

            for (uint8 j=i+1; j<_whiteballs.length; j++)
                require(_whiteballs[i] != _whiteballs[j], 
                    "Purchase failed: duplicated whiteball found.");
        }
            
        // Add ticket
        ticketsPerRound[roundCounter].push(Ticket(msg.sender, _whiteballs, _powerball));
        emit LoggingTicketPurchase(_whiteballs, _powerball, msg.sender);
    }

    function drawNumbers() adminOnly roundIsInactive public {
        // Guard condition: prevent from re-drawing the numbers
        require(powerball == 0, "This function can only be called only once per round.");

        // Generate numbers for whiteballs and powerball
        for (uint8 i=0; i<whiteballsArray.length; i++) {
            uint8 w = uint8(nft.generateRandom(MAX_WHITEBALL, i));

            // Prevent duplicates
            uint8 j=i;
            while (whiteballsMapping[w]) {
                j = i*5;
                w = uint8(nft.generateRandom(MAX_WHITEBALL, j));
            }

            whiteballsMapping[w] = true;
            whiteballsArray[i] = w;
        }
        powerball = uint8(nft.generateRandom(MAX_POWERBALL, 0));
        emit LoggingTicketWin(whiteballsArray, powerball);
    }

    function givePrizes() adminOnly roundIsInactive public {
        // Guard condition: the winning numbers are not extracted yet
        require(powerball != 0, "This function can only be called after drawNumbers() is called.");

        // Distribute the prizes among winners
        for (uint i=0; i<ticketsPerRound[roundCounter].length; i++) {

            uint8 whiteMatches = 0;
            for (uint8 j=0; j<whiteballsArray.length; j++) 
                if (whiteballsMapping[ticketsPerRound[roundCounter][i].whiteballs[j]]) 
                    whiteMatches++;

            bool powerMatch = powerball == ticketsPerRound[roundCounter][i].powerball;
            uint8 prizeClass = 0;
            
            if (whiteMatches == 5) 
                prizeClass = 2;
            else if (whiteMatches == 4) 
                prizeClass = 4;
            else if (whiteMatches == 3) 
                prizeClass = 5;
            else if (whiteMatches == 2) 
                prizeClass = 6;
            else if (whiteMatches == 1) 
                prizeClass = 7;

            if (powerMatch) {
                if (whiteMatches > 0) 
                    prizeClass--;
                else 
                    prizeClass = 8;
            }

            // Distribute NFT to the winners
            if (prizeClass != 0) {
                uint id = nft.transfer(address(this), ticketsPerRound[roundCounter][i].owner, prizeClass);
                nft.mint(address(this), prizeClass);
                emit LoggingWinner(ticketsPerRound[roundCounter][i].owner, id, prizeClass);
            }
        }

        prizesDistributed = true;
        emit Logging("All the winners have been rewarded!", msg.sender);
    }

    function mint(uint8 class) adminOnly public {
        nft.mint(address(this), class);
        emit LoggingMintNFT(class, msg.sender);
    }

    function closeLottery() adminOnly public {
        emit Logging(
            "Lottery is closing. All the partecipants will be refunded in case of purchase.", 
            msg.sender
        );

        if (!prizesDistributed) 
            for (uint i=0; i<ticketsPerRound[roundCounter].length; i++) {
                payable(ticketsPerRound[roundCounter][i].owner).transfer(TICKET_PRICE);
                emit LoggingRefund(ticketsPerRound[roundCounter][i].owner, "Refunded.");
            }
        
        selfdestruct(payable(balance));
    }

    fallback() payable external {
        emit Logging("This is the fallback function.", msg.sender);
    }

    receive() external payable {
        emit Logging("This is the receive function.", msg.sender);
    }

    // --------------------------------------------------------
    // GETTERS 

    function getBlockNumber() public view returns(uint) {
        return block.number;
    }

    function isRoundActive() public view returns(bool) {
        return block.number <= blockStart + ROUND_DURATION;
    }

    function getNumberOfTickets() public view returns(uint) {
        return ticketsPerRound[roundCounter].length;
    }

    function getNFTData(uint id) public view returns(string memory) {
        return nft.getNFTData(id);
    }

    function getNFTOwner(uint id) public view returns(address) {
        return nft.ownerOf(id);
    }

    function getNFTClassLength(uint8 class) public view returns(uint) {
        return nft.getNFTClassLength(class);
    }

    function getNFTTotalAvailable() public view returns(uint) {
        return nft.getNFTTotalAvailable();
    }

    function getNFTAdmin() public view returns(address) {
        return nft.admin();
    }

    function getNFTLottery() public view returns(address) {
        return nft.lottery();
    }
}
