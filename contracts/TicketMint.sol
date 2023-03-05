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

    constructor(address marketAddress) ERC721("Tickript", "Tic") {
        contractAddress = marketAddress;
    }

    function mintNFT(string memory tokenUri, uint256 supply)
        public
        returns (uint256)
    {
        uint256 newItemId;
        for (uint256 i = 0; i < supply; i++) {
            _tokenIds.increment();
            newItemId = _tokenIds.current();
            _safeMint(msg.sender, newItemId);
            _setTokenURI(newItemId, tokenUri);
        }
        setApprovalForAll(contractAddress, true);

        return newItemId;
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
}
