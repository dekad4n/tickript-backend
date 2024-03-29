// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Burnable.sol";

contract TicketMint is ERC721URIStorage, ERC721Burnable {
    using Counters for Counters.Counter;
    Counters.Counter private _tokenIds;
    address contractAddress;
    mapping(address => bool) owners;
    mapping(address => bool) EventOwnerAddresses;
    mapping(uint256 => uint256[]) EventIDtotokenID;
    mapping(uint256 => uint256) tokenIDtoeventID;
    mapping(uint256 => address) public eventIDtoeventOwner;
    mapping(uint256 => mapping(address => bool)) public eventIDtoTicketControllers;


    constructor(address marketAddress) ERC721("Tickript", "Tic") {
        contractAddress = marketAddress;
        owners[msg.sender]=true;
    }

    modifier onlyOwner() {
        require(owners[msg.sender], "Only contract owners!");
        _;
    }

    event Mint(
        uint256 indexed eventID,
        uint256 supply,
        address ticketOwner
    );

    function mintNFT(string memory tokenUri, uint256 eventId,uint256 supply)
        public isEventOwner(msg.sender)
    {
        uint256 newItemId;
        for (uint256 i = 0; i < supply; i++) {
            _tokenIds.increment();
            newItemId = _tokenIds.current();
            _safeMint(msg.sender, newItemId);
            _setTokenURI(newItemId, tokenUri);
            setApprovalForAll(contractAddress, true);
            EventIDtotokenID[eventId].push(newItemId);
            tokenIDtoeventID[newItemId]=eventId;
        }
        eventIDtoeventOwner[eventId]=msg.sender;
        emit Mint(eventId,supply,msg.sender);
    }

    function transferToken(
        address from,
        address to,
        uint256 tokenId
    ) external {
        require(ownerOf(tokenId) == from, "From address must be token owner");
        _transfer(from, to, tokenId);
    }

    function _burn(uint256 tokenId)
        internal
        override(ERC721, ERC721URIStorage)
    {
        super._burn(tokenId);
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function burnNFT(uint256 tokenId) public {
        require(
            _isApprovedOrOwner(_msgSender(), tokenId),
            "ERC721Burnable: caller is not owner nor approved"
        );
        _burn(tokenId);
    }

    function tokenID() external view returns (uint256) {
        return _tokenIds.current();
    }

    function addOwner(address _addressToOwners) public onlyOwner {
        owners[_addressToOwners] = true;
    }

    function addEventOwner(address _address) public onlyOwner {
        EventOwnerAddresses[_address] = true;
    }

    function setTicketController(address _address, uint256 eventId) public onlyEventOwner(eventId) {
        eventIDtoTicketControllers[eventId][_address]=true;
    }

    function verifyEventOwner(address _address) public view returns (bool){
        bool userIsWhitelisted = EventOwnerAddresses[_address];
        return userIsWhitelisted;
    }

    function verifyTicketController(address _address, uint256 eventId) public view returns (bool){
        return eventIDtoTicketControllers[eventId][_address];
    }

    function getEventTicketList(uint eventid) public view returns( uint256 [] memory){
        return EventIDtotokenID[eventid];
    }

    function getEventID(uint tokenid) public view returns( uint256){
        return tokenIDtoeventID[tokenid];
    }

    function eventOwnerOfEventID(uint eventid) public view returns (address){
        return eventIDtoeventOwner[eventid];
    }

    modifier isEventOwner(address _address) {
        require(EventOwnerAddresses[_address], "You need to be whitelisted");
        _;
    }

    modifier onlyEventOwner(uint256 eventId) {
        require(eventIDtoeventOwner[eventId]==msg.sender, "Only contract owners!");
        _;
    }
}
