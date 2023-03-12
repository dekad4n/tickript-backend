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

    constructor(address marketAddress) ERC721("Tickript", "Tic") {
        contractAddress = marketAddress;
        owners[msg.sender]=true;
    }

    // ------------------------------------------------------------------------------------ MODIFIERS 
    modifier onlyOwner() {
        require(owners[msg.sender], "Only contract owners!");
        _;
    }

    modifier isEventOwner(address _address) {
        require(EventOwnerAddresses[_address], "You need to be whitelisted");
        _;
    }


    // ------------------------------------------------------------------------------------ EVENTS
    event Mint(
        uint256 indexed eventID,
        uint256 supply,
        address ticketOwner
    );


    // ------------------------------------------------------------------------------------ FUNCTIONS
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

    // Grants the given public address with contract-ownership
    function addOwner(address _addressToOwners) public onlyOwner {
        owners[_addressToOwners] = true;
    }

    // Grants the given public address with whitelist (Only event organiser will be whitelisted)
    function addEventOwner(address _address) public onlyOwner {
        EventOwnerAddresses[_address] = true;
    }

    // Returns true if the given address is whitelisted (is it event organiser?)
    function verifyEventOwner(address _address) public view returns (bool){
        bool userIsWhitelisted = EventOwnerAddresses[_address];
        return userIsWhitelisted;
    }

    // Returns the list of ticket ids(tokens) belong to a given eventId
    function getEventTicketList(uint eventid) public view returns( uint256 [] memory){
        return EventIDtotokenID[eventid];
    }

    // Returns the eventId which the given ticket belongs to
    function getEventID(uint tokenid) public view returns( uint256){
        return tokenIDtoeventID[tokenid];
    }

}
