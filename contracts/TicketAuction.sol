// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "./TicketMint.sol";
import "./TicketMarket.sol";

contract TicketAuction is ReentrancyGuard {
    address payable owner;
    TicketMarket market;
    TicketMint mint;
    address marketAddr;
    address mintAddr;

    constructor(address ticketMarket, address ticketMint) {
        owner = payable(msg.sender);
        market = TicketMarket(ticketMarket);
        marketAddr=ticketMarket;
        mint = TicketMint(ticketMint);
        mintAddr = ticketMint;
    }

    struct AuctionInfo {
        uint256 ticketID;
        uint256 eventID;
        uint256 auctionID;
        address payable seller;
        uint256 endAt;
        bool started;
        bool ended;
        address highestBidder;
        uint256 highestBid;
        uint256 startingPrice;
    }

    struct prevBids {
        address bidder;
        uint256 bid;
        bool isBack;
    }

    struct ticketAuction {
        uint256 itemID;
        uint256 ticketID;
        uint256 auctionID;
    }

    mapping(uint256 => AuctionInfo) public auctions; //auction id to auction info
    mapping(uint256 => prevBids[]) public bids; // auction id to previos Bid info
    //mapping(uint256 => bool) private biddedBefore; //token to first bid

    event Start(uint256 ticketId, address starter, uint256 auctionId);
    event Bid(address sender, uint256 amount);
    event End(address winner, uint256 amount);
    event Withdraw(address bidder, uint256 amount);

    function createBidItem(
        uint256 ticketId,
        uint256 eventId,
        uint256 auctionId,
        uint256 startPrice,
        uint256 time
    ) public payable nonReentrant {
        require(market.isTransferable(ticketId),"Number of transfer right is 0");
        require(startPrice > 0, "Too low");
        require(time >= 60, "at least 60 sec");
        uint256 endTime = block.timestamp + time;
        auctions[auctionId] = AuctionInfo(
            ticketId,
            eventId,
            auctionId,
            payable(msg.sender),
            endTime,
            true,
            false,
            payable(msg.sender),
            startPrice,
            startPrice
        );
        mint.transferToken(msg.sender, address(this), ticketId);
        //IERC721(NftCont).transferFrom(msg.sender, address(this), tokenId);
        emit Start(ticketId,msg.sender,auctionId);
    }

    function placeBid(uint256 auctionId) public payable nonReentrant {
        require(auctions[auctionId].started, "not started");
        require(!auctions[auctionId].ended, "already end");
        require(block.timestamp < auctions[auctionId].endAt, "ended");
        require(msg.value > auctions[auctionId].highestBid, "value < highest bid");

        address prevBidder = auctions[auctionId].highestBidder;
        uint256 prevBid = auctions[auctionId].highestBid;

        prevBids memory pre;
        pre.bidder = prevBidder;
        pre.bid = prevBid;
        pre.isBack = false;

        bids[auctionId].push(pre);

        auctions[auctionId].highestBidder = msg.sender;
        auctions[auctionId].highestBid = msg.value;

        emit Bid(msg.sender, msg.value);
    }

    function finishBid(uint256 auctionId) public nonReentrant {
        require(auctions[auctionId].started, "not started");
        require(block.timestamp >= auctions[auctionId].endAt, "not ended");
        require(!auctions[auctionId].ended, "ended");

        auctions[auctionId].ended = true;

        if (auctions[auctionId].highestBidder != address(0)) {
            market.TransferTicket(
                mintAddr,
                auctions[auctionId].ticketID,
                auctions[auctionId].highestBidder
            );
            //IERC721(nft).transferFrom(address(this),auctions[aID].highestBidder,auctions[aID].nftid); //!!!
            auctions[auctionId].seller.transfer(auctions[auctionId].highestBid);
        } else {
            mint.transferToken(
                address(this),
                auctions[auctionId].seller,
                auctions[auctionId].ticketID
            );
            //IERC721(nft).transferFrom(address(this),auctions[aID].seller,auctions[aID].nftid); //!!!
        }
        // payable(owner).transfer(listingPrice);
        emit End(auctions[auctionId].highestBidder, auctions[auctionId].highestBid);
    }

    function payBackPrevBids(uint256 auctionId) public payable{
        uint256 size = bids[auctionId].length;
        for (uint256 i = 0; i < size; i++) {
            if (bids[auctionId][i].isBack == false && bids[auctionId][i].bidder == msg.sender) {
                bids[auctionId][i].isBack = true;
                uint256 bid = bids[auctionId][i].bid;
                payable(msg.sender).transfer(bid);
                emit Withdraw(msg.sender, bid);
                bids[auctionId][i].bid = 0;
            }
        }
    }

    function GetAuctionInfo(uint256 auctionId)
        public
        view
        returns (AuctionInfo memory)
    {
        return auctions[auctionId];
    }

    function listPrevBids(uint256 auctionId)
        public
        view
        returns (prevBids[] memory)
    {
        return bids[auctionId];
    }

}