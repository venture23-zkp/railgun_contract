// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/interfaces/IERC1271.sol";
import "@openzeppelin/contracts/utils/cryptography/SignatureChecker.sol";
import "./Bytecode.sol";
import "./IERC6551Account.sol";

contract DefaultERC6551Account is IERC165, IERC1271, IERC6551Account {
  /// @dev Returns a nonce value that is updated on every successful transaction
  //
  /// @return The current account nonce
  uint256 public nonce;

  receive() external payable {}

  /**
   * @notice Executes  a call to the given address with given data
   * @param to - the address to call
   * @param value - amount of eth to sent for call
   * @param data - encoded bytes function call  data for the contract call
   */

  function executeCall(
    address to,
    uint256 value,
    bytes calldata data
  ) external payable returns (bytes memory result) {
    require(msg.sender == owner(), "Not token owner");

    bool success;
    (success, result) = to.call{ value: value }(data);

    if (!success) {
      assembly {
        revert(add(result, 32), mload(result))
      }
    }

    ++nonce;
  }

  /**
   * @notice Returns the details of the account
   * @param chainId - the chain id for which the account was created
   * @param tokenContract - the token contract of the account
   * @param tokenId - the token id of the account
   */
  function token() external view returns (uint256 chainId, address tokenContract, uint256 tokenId) {
    uint256 length = address(this).code.length;
    return
      abi.decode(
        Bytecode.codeAt(address(this), length - 0x60, length),
        (uint256, address, uint256)
      );
  }

  /**
   * @notice returns the owner of the account
   */

  function owner() public view returns (address) {
    (uint256 chainId, address tokenContract, uint256 tokenId) = this.token();
    if (chainId != block.chainid) return address(0);

    return IERC721(tokenContract).ownerOf(tokenId);
  }

  function supportsInterface(bytes4 interfaceId) public pure returns (bool) {
    return (interfaceId == type(IERC165).interfaceId ||
      interfaceId == type(IERC6551Account).interfaceId);
  }

  function isValidSignature(
    bytes32 hash,
    bytes memory signature
  ) external view returns (bytes4 magicValue) {
    bool isValid = SignatureChecker.isValidSignatureNow(owner(), hash, signature);

    if (isValid) {
      return IERC1271.isValidSignature.selector;
    }

    return "";
  }
}
