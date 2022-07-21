// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

contract NFTAnimals is ERC721 {
    
    uint8 constant public N_CLASSES = 8;

    address public admin;
    address public lottery;
    uint tokenCounter;

    struct Animal {
        uint id;
        uint8 class;
        string metadata;
    }

    // Mapping from id to all the NFT
    // Mapping from class to the list of available NFTs'ids of that class
    mapping(uint => Animal) animals;
    mapping(uint => uint[]) animalsPerClassAvailable;

    string[] animalType = ["Cat", "Dog", "Dinosaur", "Sheep", "Bird", "Worm", "Shark", "Deer", "Bear"];
    string[] animalColour = ["Red", "Blue", "Black", "Green", "Yellow", "White", "Purple", "Rainbow"];

    // Constructor initialized by minting one NFT for each class
    constructor() ERC721("NFTAnimals", "ANIM") {
        require(admin == address(0), "");
        admin = msg.sender;
        tokenCounter = 0;
    }

    // Assign an NFT of the specified class to an address
    function transfer(address from, address to, uint8 class) public returns(uint) {
        require(class > 0 && class <= N_CLASSES, "Class must be between 1 and 8.");

        uint id = animalsPerClassAvailable[class][animalsPerClassAvailable[class].length - 1];
        safeTransferFrom(from, to, id);
        animalsPerClassAvailable[class].pop();

        return id;
    }
    
    // Mint an NFT of the specified class and transfer it to the owner
    function mint(address to, uint8 class) public returns(uint) {
        require(class > 0 && class <= N_CLASSES, "Class must be between 1 and 8.");

        _mint(to, tokenCounter);
        animals[tokenCounter] = Animal(tokenCounter, class, generateMetadata(tokenCounter));
        animalsPerClassAvailable[class].push(tokenCounter);
        tokenCounter++;

        return tokenCounter;
    }

    function generateMetadata(uint seed) public view returns(string memory) {
        return string.concat(
            animalColour[generateRandom(animalColour.length-1, seed)], 
            " ",
            animalType[generateRandom(animalType.length-1, seed)]
        );
    }

    function generateRandom(uint max, uint seed) public view returns(uint) {
        return (uint(keccak256(abi.encodePacked(seed, block.number, block.timestamp))) % max) + 1;
    }

    // --------------------------------------------------------
    // GETTERS 

    function getNFTData(uint id) public view returns(string memory) {
        require(animals[id].class != 0, "NFT with the corresponding ID doesn't exist.");
        return string.concat(
            Strings.toString(animals[id].class), 
            ", ", 
            animals[id].metadata
        );
    }

    function getNFTClassLength(uint8 class) public view returns(uint) {
        require(class > 0 && class <= N_CLASSES, "Class must be between 1 and 8.");
        return animalsPerClassAvailable[class].length;
    }

    function getNFTTotalAvailable() public view returns(uint) {
        uint total = 0;
        for (uint8 i=1; i<N_CLASSES+1; i++) 
            total += animalsPerClassAvailable[i].length;
        
        return total;
    }
}
