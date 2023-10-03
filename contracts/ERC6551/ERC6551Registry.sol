// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import { IERC721 } from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "./IERC6551Registry.sol";

contract ERC6551Registry is IERC6551Registry, Ownable {
  error InitializationFailed();

  // default account implementation
  address public defaultImplementation;

  // default token contract
  address public defaultToken;

  constructor(address _defaultImplementation, address _defaultToken) Ownable() {
    defaultImplementation = _defaultImplementation;
    defaultToken = _defaultToken;
  }

  /**
   * @notice Creates a account for the given params
   * @param implementation - Implementation address of account
   * @param chainId - Chain id of the network
   * @param tokenContract - The address of nft token contract
   * @param tokenId - The nft token id associated with the account to be created
   * @param initData - The data to initialize the account after creating it
   */
  function createAccount(
    address implementation,
    uint256 chainId,
    address tokenContract,
    uint256 tokenId,
    bytes memory initData
  ) external returns (address) {
    return _createAccount(implementation, chainId, tokenContract, tokenId, initData);
  }

  function createAccount(address tokenContract, uint256 tokenId) external returns (address) {
    return _createAccount(defaultImplementation, block.chainid, tokenContract, tokenId, "");
  }

  function _createAccount(
    address implementation,
    uint256 chainId,
    address tokenContract,
    uint256 tokenId,
    bytes memory initData
  ) internal returns (address) {
    require(
      IERC721(tokenContract).ownerOf(tokenId) == _msgSender(),
      "Only owner can create a account"
    );
    uint salt = 0;

    bytes memory code = _creationCode(implementation, chainId, tokenContract, tokenId, salt);

    address _account = Create2.computeAddress(bytes32(salt), keccak256(code));

    // loop to find salt to create non-colliding account
    while (_account.code.length != 0) {
      salt++;
      _account = Create2.computeAddress(bytes32(salt), keccak256(code));
    }

    _account = Create2.deploy(0, bytes32(salt), code);

    if (initData.length != 0) {
      (bool success, ) = _account.call(initData);
      if (!success) revert InitializationFailed();
    }

    emit AccountCreated(_account, implementation, chainId, tokenContract, tokenId, salt);

    return _account;
  }

  /**
   * @notice Returns the account for the given params
   * @param implementation - Implementation address of account
   * @param chainId - Chain id of the network
   * @param tokenContract - The address of nft token contract
   * @param tokenId - The nft token id associated with the account to be created
   * @param salt - The salt that was used to create a account
   */
  function account(
    address implementation,
    uint256 chainId,
    address tokenContract,
    uint256 tokenId,
    uint256 salt
  ) external view returns (address) {
    bytes32 bytecodeHash = keccak256(
      _creationCode(implementation, chainId, tokenContract, tokenId, salt)
    );

    return Create2.computeAddress(bytes32(salt), bytecodeHash);
  }

  function _creationCode(
    address implementation_,
    uint256 chainId_,
    address tokenContract_,
    uint256 tokenId_,
    uint256 salt_
  ) internal pure returns (bytes memory) {
    return
      abi.encodePacked(
        hex"3d60ad80600a3d3981f3363d3d373d3d3d363d73",
        implementation_,
        hex"5af43d82803e903d91602b57fd5bf3",
        abi.encode(salt_, chainId_, tokenContract_, tokenId_)
      );
  }
}
