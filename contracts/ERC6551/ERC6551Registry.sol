// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.13;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {ERC721Enumerable} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/utils/Create2.sol";
import "./IERC6551Registry.sol";

contract ERC6551Registry is IERC6551Registry, ERC721Enumerable {
    error InitializationFailed();

    constructor(
        string memory name_,
        string memory symbol_
    ) ERC721(name_, symbol_) {}

    function createAccount(
        address implementation,
        uint256 chainId,
        address tokenContract,
        uint256 tokenId,
        bytes calldata initData
    ) external returns (address) {
        // mint token if tokenContract and tokenId are not supplied
        if (tokenContract == address(0) && tokenId == 0) {
            tokenId = totalSupply();
            tokenContract = address(this);
            _safeMint(_msgSender(), tokenId);
        } else if (IERC721(tokenContract).ownerOf(tokenId) != _msgSender()) {
            revert("createAccount caller is not an owner!");
        }
        uint salt = 0;

        bytes memory code = _creationCode(
            implementation,
            chainId,
            tokenContract,
            tokenId,
            salt
        );

        address _account = Create2.computeAddress(
            bytes32(salt),
            keccak256(code)
        );
        // if account already exist ,increment salt
        if (_account.code.length != 0) {
            // loop to find salt to create non-colliding account
            while (salt >= 0) {
                salt++;
                address acc = Create2.computeAddress(bytes32(salt), keccak256(code));
                if (acc.code.length == 0) {
                    break;
                }
            }

        }

        _account = Create2.deploy(0, bytes32(salt), code);

        if (initData.length != 0) {
            (bool success,) = _account.call(initData);
            if (!success) revert InitializationFailed();
        }

        emit AccountCreated(
            _account,
            implementation,
            chainId,
            tokenContract,
            tokenId,
            salt
        );

        return _account;
    }

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

    function getMax() pure public returns (uint256){
        return type(uint256).max;

    }
}
