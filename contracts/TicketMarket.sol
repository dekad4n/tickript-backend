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
        uint256 price;
        string ticketType;
        bool sold;
        bool soldBefore;
    }

    mapping(uint256 => MarketItem) private idMarketItem;
    mapping(uint256 => uint256) private tokenToItem;

    event MarketItemCreation(
        uint256 indexed tokenID,
        uint256 eventID,
        address eventOwner,
        address seller,
        uint256 price,
        string ticketType
    );

    event MarketItemAfterSale(
        uint256 indexed tokenID,
        address ticketOwner,
        uint256 price
    );

    event MarketItemResell(
        uint256 indexed tokenID,
        address ticketOwner,
        address seller,
        uint256 price
    );

    event MarketItemStopSale(
        uint256 indexed tokenID,
        address seller,
        uint256 price
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
        uint256 price,
        address NftCont,
        string memory ticketType,
        uint256 eventID,
        uint256 supply
    ) public payable nonReentrant {
        require(price > 0, "Too low");
        uint256[] memory ticketList;
        TicketMint tokenContract = TicketMint(NftCont);
        ticketList = tokenContract.getEventTicketList(eventID);
        uint256 total=0;
        for (uint256 i = 0 ; i < ticketList.length && total < supply; i++) {
            _itemsID.increment();
            uint256 currentItemID = _itemsID.current();
            uint256 tokenId=ticketList[i];
            if (!isInMarket(tokenId)){
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
                    false
                );
                IERC721(NftCont).transferFrom(msg.sender, address(this), tokenId);
                emit MarketItemCreation(
                    tokenId,
                    eventID,
                    msg.sender,
                    msg.sender,
                    price,
                    ticketType);
            }
        }
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

    function ResellNFT(
        uint256 price,
        address NftCont,
        uint256 tokenId
    ) public payable nonReentrant {
        uint256 item = tokenToItem[tokenId];
        require(
            idMarketItem[item].ticketOwner == msg.sender,
            "Only ticket owner can perform this operation"
        );

        TicketMint tokenContract = TicketMint(NftCont);
        tokenContract.transferToken(msg.sender, address(this), tokenId);

        idMarketItem[item].sold = false;
        idMarketItem[item].price = price;
        idMarketItem[item].seller = payable(msg.sender);
        idMarketItem[item].ticketOwner = payable(address(this));
        _itemsSold.decrement();
        emit MarketItemResell(tokenId, address(this), msg.sender, price);
    }

    ////This function operates stopping an NFT Sale
    function StopNFTSale(
        uint256 price,
        address NftCont,
        uint256 tokenId
    ) public payable nonReentrant {
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
    function ticketSale(address NftCont, uint256 tokenId)
        public
        payable
        nonReentrant
    {
        uint256 item = tokenToItem[tokenId];
        uint256 currentPrice = idMarketItem[item].price;
        uint256 currentTokenId = idMarketItem[item].tokenID;
        address seller = idMarketItem[item].seller;
        require(msg.value >= currentPrice, "Please pay the asking price");
        require(idMarketItem[item].sold == false, "Item has been already sold");

        idMarketItem[item].ticketOwner = payable(msg.sender); //// market item i guncelle yeni sahip
        idMarketItem[item].sold = true; ////market item i guncelle satildi
        idMarketItem[item].seller = payable(address(0));
        idMarketItem[item].soldBefore = true;
        _itemsSold.increment(); //// toplam satisi guncelle
        IERC721(NftCont).transferFrom(
            address(this),
            msg.sender,
            currentTokenId
        ); //// Bu contracttaki tokenId si currenttokenid olanin sahipligini msg.sender'a ver
        payable(seller).transfer(msg.value); //// NFT yi satan kisiye parayi gonder

        emit MarketItemAfterSale(tokenId, msg.sender, currentPrice);
    }

    //// This function operates listing NFTs on marketsale (unsold items)
    function ListItemsOnSale() public view returns (MarketItem[] memory) {
        uint256 itemCount = _itemsID.current();
        uint256 itemUnsold = _itemsID.current() - _itemsSold.current();
        uint256 currentindex = 0;

        MarketItem[] memory items = new MarketItem[](itemUnsold);
        for (uint256 index = 0; index < itemCount; index++) {
            if (idMarketItem[index + 1].ticketOwner == address(this)) {
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

    //// This function operates User's listed NFTs (on sale)
    function ListUserSaleItems() public view returns (MarketItem[] memory) {
        uint256 totalItem = _itemsID.current();
        uint256 itemCount = 0;
        uint256 currentindex = 0;

        for (uint256 index = 0; index < totalItem; index++) {
            if (idMarketItem[index + 1].seller == msg.sender) {
                itemCount += 1;
            }
        }
        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint256 index = 0; index < totalItem; index++) {
            if (idMarketItem[index + 1].seller == msg.sender) {
                uint256 currentItemID = index + 1;
                MarketItem storage currentItem = idMarketItem[currentItemID];
                items[currentindex] = currentItem;
                currentindex += 1;
            }
        }
        return items;
    }

    function ListUsersAllItems(address user)
        public
        view
        returns (MarketItem[] memory)
    {
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

    function ListEventOwnerItems() public view returns (MarketItem[] memory) {
        uint256 totalItem = _itemsID.current();
        uint256 itemCount = 0;
        uint256 currentindex = 0;

        for (uint256 index = 0; index < totalItem; index++) {
            if (idMarketItem[index + 1].eventOwner == msg.sender) {
                itemCount += 1;
            }
        }
        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint256 index = 0; index < totalItem; index++) {
            if (idMarketItem[index + 1].eventOwner == msg.sender) {
                uint256 currentItemID = index + 1;
                MarketItem storage currentItem = idMarketItem[currentItemID];
                items[currentindex] = currentItem;
                currentindex += 1;
            }
        }
        return items;
    }

    function ListEventOwnerItemsOnSale()
        public
        view
        returns (MarketItem[] memory)
    {
        uint256 totalItem = _itemsID.current();
        uint256 itemCount = 0;
        uint256 currentindex = 0;

        for (uint256 index = 0; index < totalItem; index++) {
            if (idMarketItem[index + 1].seller == msg.sender) {
                itemCount += 1;
            }
        }
        MarketItem[] memory items = new MarketItem[](itemCount);
        for (uint256 index = 0; index < totalItem; index++) {
            if (idMarketItem[index + 1].seller == msg.sender) {
                uint256 currentItemID = index + 1;
                MarketItem storage currentItem = idMarketItem[currentItemID];
                items[currentindex] = currentItem;
                currentindex += 1;
            }
        }
        return items;
    }

    function ListPartyItemsOnSale() public view returns (MarketItem[] memory) {
        uint256 itemCount = _itemsID.current();
        uint256 itemUnsold = _itemsID.current() - _itemsSold.current();
        uint256 currentindex = 0;

        MarketItem[] memory items = new MarketItem[](itemUnsold);
        for (uint256 index = 0; index < itemCount; index++) {
            if (
                keccak256(
                    abi.encodePacked(idMarketItem[index + 1].ticketType)
                ) ==
                keccak256(abi.encodePacked("PARTY")) &&
                idMarketItem[index + 1].sold == false
            ) {
                uint256 currentItemID = index + 1;
                MarketItem storage currentItem = idMarketItem[currentItemID];
                items[currentindex] = currentItem;
                currentindex += 1;
            }
        }
        return items;
    }

    function ListOrganizationItemsOnSale()
        public
        view
        returns (MarketItem[] memory)
    {
        uint256 itemCount = _itemsID.current();
        uint256 itemUnsold = _itemsID.current() - _itemsSold.current();
        uint256 currentindex = 0;

        MarketItem[] memory items = new MarketItem[](itemUnsold);
        for (uint256 index = 0; index < itemCount; index++) {
            if (
                keccak256(
                    abi.encodePacked(idMarketItem[index + 1].ticketType)
                ) ==
                keccak256(abi.encodePacked("ORGANIZATION")) &&
                idMarketItem[index + 1].sold == false
            ) {
                uint256 currentItemID = index + 1;
                MarketItem storage currentItem = idMarketItem[currentItemID];
                items[currentindex] = currentItem;
                currentindex += 1;
            }
        }
        return items;
    }

    function ListMusicItemsOnSale() public view returns (MarketItem[] memory) {
        uint256 itemCount = _itemsID.current();
        uint256 itemUnsold = _itemsID.current() - _itemsSold.current();
        uint256 currentindex = 0;

        MarketItem[] memory items = new MarketItem[](itemUnsold);
        for (uint256 index = 0; index < itemCount; index++) {
            if (
                keccak256(
                    abi.encodePacked(idMarketItem[index + 1].ticketType)
                ) ==
                keccak256(abi.encodePacked("MUSIC")) &&
                idMarketItem[index + 1].sold == false
            ) {
                uint256 currentItemID = index + 1;
                MarketItem storage currentItem = idMarketItem[currentItemID];
                items[currentindex] = currentItem;
                currentindex += 1;
            }
        }
        return items;
    }

    function ListStageItemsOnSale() public view returns (MarketItem[] memory) {
        uint256 itemCount = _itemsID.current();
        uint256 itemUnsold = _itemsID.current() - _itemsSold.current();
        uint256 currentindex = 0;

        MarketItem[] memory items = new MarketItem[](itemUnsold);
        for (uint256 index = 0; index < itemCount; index++) {
            if (
                keccak256(
                    abi.encodePacked(idMarketItem[index + 1].ticketType)
                ) ==
                keccak256(abi.encodePacked("STAGE")) &&
                idMarketItem[index + 1].sold == false
            ) {
                uint256 currentItemID = index + 1;
                MarketItem storage currentItem = idMarketItem[currentItemID];
                items[currentindex] = currentItem;
                currentindex += 1;
            }
        }
        return items;
    }

    function ListSportItemsOnSale() public view returns (MarketItem[] memory) {
        uint256 itemCount = _itemsID.current();
        uint256 itemUnsold = _itemsID.current() - _itemsSold.current();
        uint256 currentindex = 0;

        MarketItem[] memory items = new MarketItem[](itemUnsold);
        for (uint256 index = 0; index < itemCount; index++) {
            if (
                keccak256(
                    abi.encodePacked(idMarketItem[index + 1].ticketType)
                ) ==
                keccak256(abi.encodePacked("SPORT")) &&
                idMarketItem[index + 1].sold == false
            ) {
                uint256 currentItemID = index + 1;
                MarketItem storage currentItem = idMarketItem[currentItemID];
                items[currentindex] = currentItem;
                currentindex += 1;
            }
        }
        return items;
    }

    function ListOtherItemsOnSale() public view returns (MarketItem[] memory) {
        uint256 itemCount = _itemsID.current();
        uint256 itemUnsold = _itemsID.current() - _itemsSold.current();
        uint256 currentindex = 0;

        MarketItem[] memory items = new MarketItem[](itemUnsold);
        for (uint256 index = 0; index < itemCount; index++) {
            if (
                keccak256(
                    abi.encodePacked(idMarketItem[index + 1].ticketType)
                ) ==
                keccak256(abi.encodePacked("OTHER")) &&
                idMarketItem[index + 1].sold == false
            ) {
                uint256 currentItemID = index + 1;
                MarketItem storage currentItem = idMarketItem[currentItemID];
                items[currentindex] = currentItem;
                currentindex += 1;
            }
        }
        return items;
    }
}
