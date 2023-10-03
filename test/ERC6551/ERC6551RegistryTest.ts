import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import * as hre from 'hardhat';
import { ethers } from 'hardhat';
import { mock } from 'node:test';

describe('ERC6551 Registry', function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployContracts() {
    const Registry = await hre.ethers.getContractFactory('ERC6551Registry');
    const Account = await hre.ethers.getContractFactory('DefaultERC6551Account');

    const MockNft = await ethers.getContractFactory('TestERC721');
    const mockNft = await MockNft.deploy();
    const account = await Account.deploy();

    const registry = await Registry.deploy(account.address, mockNft.address);
    await registry.deployed();
    await account.deployed();
    return { registry, account, mockNft };
  }

  describe('Create Account for a Minted NFT', function () {
    it('Should create account for minted mint nft', async function () {
      const { registry, account, mockNft } = await loadFixture(deployContracts);

      //Setting accounts
      const [acc1, acc2, acc3] = await ethers.getSigners();

      // params to create a new account
      const chainId = BigInt(await ethers.provider.send('eth_chainId', []));
      const tokenId = 1;
      const initData: [] = [];
      const salt = 0;

      // minting nfts
      await mockNft.mint(acc1.address, tokenId);
      await mockNft.mint(acc1.address, tokenId + 1);

      //creating  accounts with acc1
      const create = await registry['createAccount(address,uint256,address,uint256,bytes)'](
        account.address,
        chainId,
        mockNft.address,
        tokenId,
        initData,
      );
      const create2 = await registry['createAccount(address,uint256)'](
        mockNft.address,
        tokenId + 1,
      );

      await expect(create).to.emit(registry, 'AccountCreated');
      await expect(create2).to.emit(registry, 'AccountCreated');

      // getting the created account
      const accountAddress = await registry.account(
        account.address,
        chainId,
        mockNft.address,
        tokenId,
        salt,
      );

      // validating the owner of the created account
      const AC = await ethers.getContractFactory('DefaultERC6551Account');
      const ac = await AC.attach(accountAddress);
      expect(await ac.owner()).to.equal(acc1.address);

      // getting the second created account
      const accountAddress2 = await registry.account(
        account.address,
        chainId,
        mockNft.address,
        tokenId + 1,
        salt,
      );

      // validating the owner of the created account
      const ac2 = await AC.attach(accountAddress2);
      expect(await ac2.owner()).to.equal(acc1.address);
    });
  });

  describe('Fail to Create Account for a Minted NFT', function () {
    it('Should fail to create account for minted mint nft', async function () {
      const { registry, account, mockNft } = await loadFixture(deployContracts);

      //Setting accounts
      const [acc1, acc2, acc3] = await ethers.getSigners();

      // params to create a new account
      const chainId = BigInt(await ethers.provider.send('eth_chainId', []));
      const tokenId = 1;
      const initData: [] = [];
      const salt = 0;

      // minting nfts to acc1
      await mockNft.mint(acc1.address, tokenId);
      await mockNft.mint(acc1.address, tokenId + 1);

      //creating  accounts with acc2
      const create = registry
        .connect(acc2)
        ['createAccount(address,uint256,address,uint256,bytes)'](
          account.address,
          chainId,
          mockNft.address,
          tokenId,
          initData,
        );
      const create2 = registry.connect(acc2)['createAccount(address,uint256)'](mockNft.address, +1);

      await expect(create).to.be.revertedWith('Only owner can create a account');
      await expect(create2).to.be.revertedWith('Only owner can create a account');

      //transferring the NFT to acc2
      await mockNft['safeTransferFrom(address,address,uint256)'](
        acc1.address,
        acc2.address,
        tokenId,
      );
      await mockNft['safeTransferFrom(address,address,uint256)'](
        acc1.address,
        acc2.address,
        tokenId + 1,
      );

      // creating account with acc2
      const create3 = await registry
        .connect(acc2)
        ['createAccount(address,uint256,address,uint256,bytes)'](
          account.address,
          chainId,
          mockNft.address,
          tokenId,
          initData,
        );
      const create4 = registry
        .connect(acc2)
        ['createAccount(address,uint256)'](mockNft.address, tokenId + 1);
      await expect(create3).to.emit(registry, 'AccountCreated');
      await expect(create4).to.emit(registry, 'AccountCreated');
    });
  });
});
