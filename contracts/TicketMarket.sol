//Contract based on [https://docs.openzeppelin.com/contracts/3.x/erc721](https://docs.openzeppelin.com/contracts/3.x/erc721)
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./TicketMint.sol";

contract TicketMarket is ReentrancyGuard {
    using Counters for Counters.Counter;
    Counters.Counter private _itemsID;
    Counters.Counter private _itemsSold;

    address payable owner;

    constructor() {
        owner = payable(msg.sender);
    }

    struct MarketItem {
        address nftContract;
        uint256 tokenID;
        uint256 eventID;
        address payable ticketOwner;
        address payable eventOwner;
        address payable seller;
        uint128 price;
        string ticketType;
        bool sold;
        bool soldBefore;
        bool used;
        uint128 seat;
        uint128 transferRight;
    }

    mapping(uint256 => MarketItem) private idMarketItem;
    mapping(uint256 => uint256) private tokenToItem;

    event MarketItemCreation(
        uint256 eventID,
        address seller,
        uint128 price,
        uint128 supply,
        string ticketType
    );

    event MarketItemAfterSale(
        uint256 indexed tokenID,
        address ticketOwner,
        uint256 price
    );

    event MarketItemResell(
        uint256 [] tokenID,
        address ticketOwner,
        address seller,
        uint256 price
    );

    event MarketItemStopSale(
        uint256 indexed tokenID,
        address seller,
        uint256 price
    );

    event StopBatchTicketSale(
        uint256 [] tokenID,
        address seller,
        uint256 price
    );

    event transferTicket( 
        uint256 tokenId, 
        address toUser
    );

    function isInMarket(uint256 tokenid) public view returns(bool){
        if(tokenToItem[tokenid]>0){
            return true;
        }
        else{
            return false;
        }
    }

    ////This function operates putting an NFT on the market which is not sold before, it is a new item.
    function createMarketItem(
        uint128 price,
        address NftCont,
        string memory ticketType,
        uint256 eventID,
        uint128 supply, uint128 transNum ) public payable nonReentrant {
        require(price > 0, "Too low");
        uint256[] memory ticketList;
        TicketMint tokenContract = TicketMint(NftCont);
        ticketList = tokenContract.getEventTicketList(eventID);
        uint256 total=0;
        for (uint128 i = 0 ; i < ticketList.length && total < supply; i++) {
            _itemsID.increment();
            uint256 currentItemID = _itemsID.current();
            uint256 tokenId=ticketList[i];
            if (!isInMarket(tokenId)){
                total=total+1;
                tokenToItem[tokenId] = currentItemID;
                idMarketItem[currentItemID] = MarketItem(
                    NftCont,
                    tokenId,
                    eventID,
                    payable(address(this)),
                    payable(msg.sender),
                    payable(msg.sender),
                    price,
                    ticketType,
                    false,
                    false,
                    false,
                    i,
                    transNum+1
                );
                IERC721(NftCont).transferFrom(msg.sender, address(this), tokenId);
            }
        }
        emit MarketItemCreation(
            eventID,
            msg.sender,
            price,
            supply,
            ticketType);
    }

    ////This function operates putting an NFT on the market which is sold before, it is a new item.
    function isSoldBefore(uint256 tokenId) public view returns (bool) {
        uint256 item = tokenToItem[tokenId];
        if (idMarketItem[item].soldBefore == true) {
            return true;
        } else {
            return false;
        }
    }
    
    ////This function oparetes selling an NFT again (by User)
    function ResellTicket( uint128 price, address NftCont, uint256 [] memory tokenIds) public payable nonReentrant {
        require(price > 0, "Too low");
        for (uint128 i=0 ; i< tokenIds.length;i++){
            uint256 tokenId=tokenIds[i];
            uint256 item = tokenToItem[tokenId];
            require(idMarketItem[item].ticketOwner == msg.sender,"Only ticket owner can perform this operation");
            require(idMarketItem[item].sold == true,"Ticket is already listed!");
            require(idMarketItem[item].transferRight > 0,"Number of transfer right is 0");


            TicketMint tokenContract = TicketMint(NftCont);
            tokenContract.transferToken(msg.sender, address(this), tokenId);

            idMarketItem[item].sold = false;
            idMarketItem[item].price = price;
            idMarketItem[item].seller = payable(msg.sender);
            idMarketItem[item].ticketOwner = payable(address(this));
            _itemsSold.decrement();
        }
        emit MarketItemResell(tokenIds, address(this), msg.sender, price);
    }

    function TransferableIds ( uint256 eventId, address user) public view returns (uint256[] memory) {
        uint256 totalItem = _itemsID.current();
        uint256 itemCount = 0;
        uint256 currentindex = 0;

        for (uint256 index = 0; index < totalItem; index++) {
            if (idMarketItem[index + 1].ticketOwner == user && idMarketItem[index + 1].transferRight > 0 && idMarketItem[index + 1].eventID==eventId) {
                itemCount += 1;
            }
        }
        uint256[] memory items = new uint256[](itemCount);
        for (uint256 index = 0; index < totalItem; index++) {
            if (idMarketItem[index + 1].ticketOwner == user && idMarketItem[index + 1].transferRight > 0 && idMarketItem[index + 1].eventID==eventId) {
                uint256 currentTokenId=idMarketItem[index + 1].tokenID;
                items[currentindex] = currentTokenId;
                currentindex += 1;
            }
        }
        return items;
    }
    function isTransferable ( uint256 ticketId) public view returns (bool) {
        uint256 item = tokenToItem[ticketId];
        if(idMarketItem[item].transferRight > 0){
            return true;
        }
        else{
            return false;
        }
    }
    ////This function operates stopping a batch ticket sale
    function StopBatchSale( uint128 price, address NftCont, uint256[] memory tokenIds, uint256 eventid) public payable nonReentrant {
        TicketMint tokenContract = TicketMint(NftCont);
        address addr=tokenContract.eventOwnerOfEventID(eventid);
        require(
            msg.sender == addr,
            "Only event owner can perform this"
        );
        for(uint256 i = 0 ; i < tokenIds.length ; i++){
            uint256 id = tokenIds[i];
            uint256 item = tokenToItem[id];
            idMarketItem[item].sold = true;
            idMarketItem[item].price = price;
            idMarketItem[item].seller = payable(address(0));
            idMarketItem[item].ticketOwner = payable(msg.sender);
            idMarketItem[item].soldBefore = true;
            _itemsSold.increment();
            IERC721(NftCont).transferFrom(address(this), msg.sender, id);
        }
        emit StopBatchTicketSale(tokenIds, msg.sender, price);
    }

    ////This function operates stopping single ticket sale
    function StopTicketSale( uint128 price, address NftCont, uint256 tokenId) public payable nonReentrant {
        uint256 item = tokenToItem[tokenId];
        require(
            msg.sender == idMarketItem[item].seller ||
            msg.sender == idMarketItem[item].eventOwner,
            "Only event owner or seller can perform this"
        );
        idMarketItem[item].sold = true;
        idMarketItem[item].price = price;
        idMarketItem[item].seller = payable(address(0));
        idMarketItem[item].ticketOwner = payable(msg.sender);
        idMarketItem[item].soldBefore = true;
        _itemsSold.increment();

        IERC721(NftCont).transferFrom(address(this), msg.sender, tokenId);

        emit MarketItemStopSale(tokenId, msg.sender, price);
    }

    //// This function operates an NFT Sale/Transaction
    function ticketSale(address NftCont, uint256 tokenId) public payable nonReentrant{
        uint256 item = tokenToItem[tokenId];
        uint128 currentPrice = idMarketItem[item].price;
        uint256 currentTokenId = idMarketItem[item].tokenID;
        address seller = idMarketItem[item].seller;

        require(msg.value >= currentPrice, "Please pay the asking price");
        require(idMarketItem[item].sold == false, "Item has been already sold");

        idMarketItem[item].ticketOwner = payable(msg.sender); //// market item i guncelle yeni sahip
        idMarketItem[item].sold = true; ////market item i guncelle satildi
        idMarketItem[item].seller = payable(address(0));
        idMarketItem[item].soldBefore = true;
         idMarketItem[item].transferRight = idMarketItem[item].transferRight - 1;
        _itemsSold.increment(); //// toplam satisi guncelle
        IERC721(NftCont).transferFrom(
            address(this),
            msg.sender,
            currentTokenId
        ); //// Bu contracttaki tokenId si currenttokenid olanin sahipligini msg.sender'a ver
        payable(seller).transfer(msg.value); //// NFT yi satan kisiye parayi gonder

        emit MarketItemAfterSale(tokenId, msg.sender, currentPrice);
    }

    function TransferTicket (address NftCont, uint256 tokenId, address toAddr) public payable nonReentrant{
        uint256 item = tokenToItem[tokenId];
        require(idMarketItem[item].ticketOwner == msg.sender, "Only ticket owner");

        idMarketItem[item].ticketOwner = payable(toAddr); //// market item i guncelle yeni sahip
        idMarketItem[item].transferRight = idMarketItem[item].transferRight - 1;
        TicketMint tokenContract = TicketMint(NftCont);
        tokenContract.transferToken(msg.sender, toAddr, tokenId);

        emit transferTicket(tokenId, toAddr);
    }

    function ListEventTicketAll(uint256 eventId) public view returns (MarketItem[] memory) {
        uint256 totalItem = _itemsID.current();
        uint256 itemCount = 0;
        uint256 currentindex = 0;

        for (uint256 index = 0; index < totalItem; index++) {
            if (idMarketItem[index + 1].eventID == eventId) {
                itemCount += 1;
            }
        }
        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint256 index = 0; index < totalItem; index++) {
            if (idMarketItem[index + 1].eventID == eventId) {
                uint256 currentItemID = index + 1;
                MarketItem storage currentItem = idMarketItem[currentItemID];
                items[currentindex] = currentItem;
                currentindex += 1;
            }
        }
        return items;
    }

    function ListEventTicketOnSale(uint256 eventId) public view returns (MarketItem[] memory) {
        uint256 totalItem = _itemsID.current();
        uint256 itemCount = 0;
        uint256 currentindex = 0;

        for (uint256 index = 0; index < totalItem; index++) {
            if (idMarketItem[index + 1].eventID == eventId && idMarketItem[index + 1].sold == false) {
                itemCount += 1;
            }
        }
        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint256 index = 0; index < totalItem; index++) {
            if (idMarketItem[index + 1].eventID == eventId  && idMarketItem[index + 1].sold == false) {
                uint256 currentItemID = index + 1;
                MarketItem storage currentItem = idMarketItem[currentItemID];
                items[currentindex] = currentItem;
                currentindex += 1;
            }
        }
        return items;
    }

    //// This function operates User's NFTs (purchased)
    function ListUserOwnItems() public view returns (MarketItem[] memory) {
        uint256 totalItem = _itemsID.current();
        uint256 itemCount = 0;
        uint256 currentindex = 0;

        for (uint256 index = 0; index < totalItem; index++) {
            if (idMarketItem[index + 1].ticketOwner == msg.sender) {
                itemCount += 1;
            }
        }
        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint256 index = 0; index < totalItem; index++) {
            if (idMarketItem[index + 1].ticketOwner == msg.sender) {
                uint256 currentItemID = index + 1;
                MarketItem storage currentItem = idMarketItem[currentItemID];
                items[currentindex] = currentItem;
                currentindex += 1;
            }
        }
        return items;
    }

    //// This function operates USer's both purchased and on sale items
    function ListEventTicketByPublicAddress(address user) public view returns (MarketItem[] memory) {
        uint256 totalItem = _itemsID.current();
        uint256 itemCount = 0;
        uint256 currentindex = 0;

        for (uint256 index = 0; index < totalItem; index++) {
            if (
                idMarketItem[index + 1].seller == user ||
                idMarketItem[index + 1].ticketOwner == user
            ) {
                itemCount += 1;
            }
        }
        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint256 index = 0; index < totalItem; index++) {
            if (
                idMarketItem[index + 1].seller == user ||
                idMarketItem[index + 1].ticketOwner == user
            ) {
                uint256 currentItemID = index + 1;
                MarketItem storage currentItem = idMarketItem[currentItemID];
                items[currentindex] = currentItem;
                currentindex += 1;
            }
        }
        return items;
    }

    function NFTItem(uint256 tokenId) public view returns (MarketItem memory) {
        uint256 item = tokenToItem[tokenId];
        return idMarketItem[item];
    }

    function useTickets(uint256 [] memory tokenIds, uint256 eventId, address NftCont) public {
        TicketMint tokenContract = TicketMint(NftCont);
        require(tokenContract.eventIDtoTicketControllers(eventId,msg.sender)==true, "Only ticket controller");

        for (uint128 i=0 ; i< tokenIds.length;i++){
            uint256 tokenId=tokenIds[i];
            uint256 item = tokenToItem[tokenId];
            idMarketItem[item].used = true;

        }
    } 

}
