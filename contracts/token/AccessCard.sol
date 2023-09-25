// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

// OpenZeppelin v4
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";

import { ERC721A } from "erc721a/contracts/ERC721A.sol";

contract AccessCard is ERC721A, Ownable {
  /* TOKEN URI TRANSFORMER VARIABLES */
  string public baseURI;
  address public railgun;
  mapping (uint256 => bytes32) public  encryptedMetadata;

  /* CONSTRUCTOR */

  constructor(string memory _name, string memory _symbol) ERC721A(_name, _symbol) {}

  /* ADMIN FUNCTIONS */

  function setBaseURI(string calldata _newBaseURI) external onlyOwner {
    baseURI = _newBaseURI;
  }

  function setRailgunAddress(address _railgunContract) external onlyOwner {
    railgun = _railgunContract;
  }

  function setEncryptedMetadata(uint256 tokenId,bytes32 metadata) public {
    require(ownerOf(tokenId)== msg.sender,"Only token owner can set metadata");
    encryptedMetadata[tokenId] = metadata;
  }

  /* TOKEN URI GETTER */

  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    // Check if token is in RAILGUN
    if (ownerOf(tokenId) == railgun) {
      // Return special path if in RAILGUN
      return string(abi.encodePacked(baseURI, "/special/", _toString(tokenId)));
    }

    // Else return standard token path
    return string(abi.encodePacked(baseURI, "/normal/", _toString(tokenId)));
  }

  function mint(bytes32 metadata) external {
    //setting the metadata for token id to be minted
    encryptedMetadata[ERC721A._nextTokenId()] = metadata;
    ERC721A._safeMint(msg.sender, 1);
  }
}

