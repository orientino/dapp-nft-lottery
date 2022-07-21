App = {
    contracts: {},
    web3Provider: null,             // Web3 provider
    url: "http://localhost:8545",   // Url for web3

    account: "0x0",                 // Current user's address
    accountBalance: 0,              // Current user's balance
    accountAdmin: "0x0",            // Admin's address
    accountType: "admin",           // Type of user { admin, player }
    accountChange: false,
    ticketPrice: 1,

    lotteryAddress: '0x0',
    roundNumber: 0,
    roundActive: false,

    init: function () {
        return App.initWeb3();
    },

    // Initialize Web3
    initWeb3: function () {
        console.log("[Info] initWeb3")

        if (typeof web3 != 'undefined') {
            App.web3Provider = window.ethereum;
            web3 = new Web3(App.web3Provider);

            try {
                ethereum.request({ method: 'eth_requestAccounts' }).then(async () => {
                    console.log("DApp connected to Metamask");
                });
            }
            catch (error) {
                console.log(error);
            }
        } else {
            App.web3Provider = new Web3.providers.HttpProvider(App.url); // <==
            web3 = new Web3(App.web3Provider);
        }

        return App.initContract();
    },

    // Initialize the contract
    initContract: async function () {
        console.log("[Info] initContract")

        // Get current account
        web3.eth.getCoinbase(function (err, account) {
            if (err == null) {
                App.account = account.toLowerCase();
                $("#address").html("Address: " + account);
            }
        });

        let account = await window.ethereum.request({ method: 'eth_requestAccounts' });
        App.account = account[0].toLowerCase();
        App.accountBalance = await web3.utils.fromWei(await web3.eth.getBalance(account[0]));
        $("#balance").html("Balance: " + App.accountBalance + " ETH");

        // Retrieve the Factory and the Lottery .json instances contract
        let factory = await $.getJSON('LotteryFactory.json');
        App.contracts["LotteryFactory"] = await TruffleContract(factory);
        App.contracts["LotteryFactory"].setProvider(App.web3Provider);

        let lottery = await $.getJSON('Lottery.json');
        App.contracts["Lottery"] = await TruffleContract(lottery);
        App.contracts["Lottery"].setProvider(App.web3Provider);

        if (window.location.href.toString().toLowerCase() == 'http://localhost:3000/lottery.html') {
            App.contracts["LotteryFactory"].deployed().then(async (instance) => {
                App.lotteryAddress = await instance.getLotteryAddress();
                console.log("Lottery Address: " + App.lotteryAddress);
                return App.initDApp();
            });
        }
    },

    // initialize DApp
    initDApp: function () {
        console.log("[Info] initDApp");

        // Set the admin address
        App.contracts["LotteryFactory"].deployed().then(async (instance) => {
            let _admin = await instance.admin();
            App.account = _admin.toLowerCase();
            App.accountAdmin = _admin.toLowerCase();
            App.setAccount(App.accountChange);
        })

        // Initialize ROUND INFOS
        App.getRoundNumber();
        App.getNFTTotalAvailable();
        App.isRoundActive();

        return App.listenForEvents();
    },

    // Event listener to handle all the contract's events
    listenForEvents: function () {
        console.log("[Info] listenForEvents");

        App.contracts["Lottery"].at(App.lotteryAddress).then(async (instance) => {
            // Event Logging: display the general logging events
            instance.Logging().on('data', function (event) {
                $("#logging").html("Logging: " + event.returnValues.output);
                App.isRoundActive();
                console.log("[Log] Event Logging catched.");
            });

            // Event LoggingTicketPurchase: display the newly purchased ticket
            instance.LoggingTicketPurchase().on('data', function (event) {
                $("#logging").html("Logging: new ticket has been purchased.");
                $("#tickets_list").append("<br>" + event.returnValues.buyer + " bought [" + event.returnValues.whiteballs + " - " + event.returnValues.powerball + "]");
                App.isRoundActive();
                console.log("[Log] Event TicketPurchase catched.");
            });

            // Event LoggingTicketWin: display the winner ticker
            instance.LoggingTicketWin().on('data', function (event) {
                $("#logging").html("Logging: winning ticket has been announced.");
                $('#winning_ticket').html("Winning Ticket: [" + event.returnValues.whiteballs + " - " + event.returnValues.powerball + "]");
                App.isRoundActive();
                console.log("[Log] Event LoggingTicketWin catched.");
            });

            // Event LoggingMintNFT: display how many NFT are available
            instance.LoggingMintNFT().on('data', function (event) {
                $("#logging").html("Logging: new NFT has been minted.");
                App.getNFTTotalAvailable();
                console.log("[Log] NFT of class ", event.returnValues.class, " has been minted.");
            });

            // Event LoggingWinner: display all the winners of the round
            instance.LoggingWinner().on('data', function (event) {
                $("#logging").html("Logging: winners have been announced!");
                $("#winners").append("<br> " + event.returnValues.winner + " won NFT id " + event.returnValues.id + " of class " + event.returnValues.prizeClass);
                App.isRoundActive();
                console.log("[Log] Event LoggingWinner catched.");
            });

            // Event LoggingRefund: refund the players if in game
            instance.LoggingRefund().on('data', function (event) {
                console.log("[Log] Event LoggingRefund catched.");
            });
        });

        // Listener that handles the account change event
        ethereum.on("accountsChanged", function (accounts) {
            console.log("Accounts changed");
            App.accountChange = true;
            App.setAccount(App.accountChange);
        });
    },

    // -----------------------------------------------------------
    // LOTTERY COMMANDS FUNCTIONS

    // Deploy the Lottery contract 
    createLottery: function () {
        console.log('[Info] createLottery');

        App.contracts["LotteryFactory"].deployed().then(async (instance) => {
            await instance.createLottery({ from: App.account });
            window.location.replace("lottery.html");
        });
    },

    // Call the smart contract's function to start a new lottery round
    startNewRound: function () {
        console.log("[Info] startNewRound");

        App.contracts["Lottery"].at(App.lotteryAddress).then(async (instance) => {
            try {
                await instance.startNewRound({ from: App.account });
                $("#tickets_list").html("Tickets Sold: ");
                $("#winning_ticket").html("Winning Ticket: ");
                $("#winners").html("Winning Ticket: ");
                App.getRoundNumber();
                console.log('Round ' + App.roundNumber + ' started!');
            } catch (error) {
                console.log('[Error] startNewRound failed.');
            }
        });
        App.debug();
    },

    // Call the smart contract's function to buy a ticket
    buy: function () {
        console.log("[Info] buy");

        App.contracts["Lottery"].at(App.lotteryAddress).then(async (instance) => {
            try {
                let n1 = document.getElementById("n1").value;
                let n2 = document.getElementById("n2").value;
                let n3 = document.getElementById("n3").value;
                let n4 = document.getElementById("n4").value;
                let n5 = document.getElementById("n5").value;
                let powerball = document.getElementById("n6").value;
                const whiteballs = [n1, n2, n3, n4, n5];

                await instance.buy(whiteballs, powerball, { from: App.account, value: App.ticketPrice.toString() });
                console.log("Ticket bought: whiteballs=[" + whiteballs + "], powerball=" + powerball);
            } catch (error) {
                console.log('[Error] buy function failed.');
            }

            let accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
            App.balance = await web3.utils.fromWei(await web3.eth.getBalance(accounts[0]));
            $("#balance").html("Balance: " + App.balance + " ETH");
        });
        App.isRoundActive();
        App.debug();
    },

    // Call the smart contract's function to draw the winning numbers
    drawNumbers: function () {
        console.log("[Info] drawNumbers");

        App.contracts["Lottery"].at(App.lotteryAddress).then(async (instance) => {
            try {
                await instance.drawNumbers({ from: App.account });
                console.log("Winning numbers have been drawn!");
            } catch (error) {
                console.log('[Error] drawNumbers function failed.');
            }
        });
        App.isRoundActive();
        App.debug();
    },

    // Call the smart contract's function to assign prizes to the winners
    givePrizes: function () {
        console.log("[Info] givePrizes");

        App.contracts["Lottery"].at(App.lotteryAddress).then(async (instance) => {
            try {
                await instance.givePrizes({ from: App.account });
                console.log('All the prizes have been assigned.');
            } catch (error) {
                console.log('[Error] givePrizes function failed.');
            }
        });
        App.isRoundActive();
        App.debug();
    },

    // Call the smart contract's function to mint new n collectibles
    mint: function () {
        console.log("[Info] mint");

        App.contracts["Lottery"].at(App.lotteryAddress).then(async (instance) => {
            try {
                let prizeClass = Math.floor(Math.random() * 8) + 1;
                await instance.mint(prizeClass, { from: App.account });
                console.log("NFT of class " + classNFT + " has been minted!");
            } catch (error) {
                console.log('[Error] mint function failed.');
            }
        });
        App.debug();
    },

    // Call the smart contract's function to close the lottery
    closeLottery: function () {
        console.log("[Info] closeLottery");

        App.contracts["Lottery"].at(App.lotteryAddress).then(async (instance) => {
            try {
                await instance.closeLottery({ from: App.account });
                console.log("Lottery closed!");
                window.location.replace('index.html');
            } catch (error) {
                console.log('[Error] closeLottery function.');
            }
        });
        App.debug();
    },

    // -----------------------------------------------------------
    // UTILS FUNCTIONS

    debug: function () {
        App.contracts["Lottery"].at(App.lotteryAddress).then(async (instance) => {
            // let block_number = await instance.getBlockNumber({ from: App.account });
            // console.log("[Debug] blockNumber: " + block_number.toNumber());
            // let _admin = await instance.getNFTAdmin();
            // let _owner = await instance.getNFTOwner(1);
            // console.log("[Debug] NFT Admin " + _admin);
            // console.log("[Debug] NFT Owner: " + _owner);
        })
    },

    getRoundNumber: function () {
        App.contracts["Lottery"].at(App.lotteryAddress).then(async (instance) => {
            App.roundNumber = await instance.roundCounter();
            $("#round_number").html("Round Number: " + App.roundNumber);
        });
    },

    getNFTTotalAvailable: function () {
        App.contracts["Lottery"].at(App.lotteryAddress).then(async (instance) => {
            let n_nfts = await instance.getNFTTotalAvailable({ from: App.account });
            $("#number_nft").html("Total Available NFTs: " + n_nfts);
        });
    },

    isRoundActive: function () {
        App.contracts["Lottery"].at(App.lotteryAddress).then(async (instance) => {
            App.isActive = await instance.isRoundActive({ from: App.account });
            $("#round_active").html("Round Active: " + App.isActive);
        });
    },

    // Set the account type of the current user and check if the page has been reloaded or has changed due to an account switch
    setAccount: async function () {
        console.log("[Info] setAccount");

        let account = await window.ethereum.request({ method: 'eth_requestAccounts' });
        App.account = account[0].toLowerCase();
        App.balance = await web3.utils.fromWei(await web3.eth.getBalance(account[0]));

        if (App.account === App.accountAdmin) {
            App.accountType = 'admin';
        } else {
            App.accountType = 'player';
        }

        console.log("Account: " + App.account);
        console.log("Admin: " + App.accountAdmin);
        console.log("Account type: " + App.accountType);

        $("#address").html(App.account);
        $("#balance").html(App.balance + " ETH");

        App.render();
    },

    // Function that show the appropriate UI based on the type of account and the action occurred (load/change account)
    render: function () {
        console.log("[Info] render");

        if (App.accountType === 'admin')
            document.getElementById("admin_panel").style.display = "block";
        else if (App.accountType === 'player')
            document.getElementById("admin_panel").style.display = "none";
    },
}

// Call init whenever the window loads
$(function () {
    $(window).on('load', function () {
        App.init();
    });
});