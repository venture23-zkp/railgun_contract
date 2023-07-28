import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';
import { expect } from 'chai';
import * as hre from 'hardhat';
import { ethers } from 'hardhat';

function encodeCalldata(functionSelector: string, params: (string | [string, any])[]) {
  // Encode the function selector
  const encodedFunctionSelector = ethers.utils.hexDataSlice(
    ethers.utils.id(functionSelector),
    0,
    4,
  );

  // Encode the function parameters
  const encodedParams = params.map((param) => {
    const type = Array.isArray(param) ? param[0] : 'string';
    const value = Array.isArray(param) ? param[1] : param;
    return ethers.utils.defaultAbiCoder.encode([type], [value]).slice(2);
  });

  // Concatenate the encoded function selector and parameters
  const calldata = encodedFunctionSelector + encodedParams.join('');

  return calldata;
}

describe('Default ERC6551 Account ', function () {
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

  describe('Create Account,Run execute call ', function () {
    it('Should create account and execute a multicall', async function () {
      const { registry, account, mockNft } = await loadFixture(deployContracts);

      // params to create a new account
      const chainId = BigInt(await ethers.provider.send('eth_chainId', []));
      const tokenId = 1;
      const salt = 0;
      const initData: [] = [];
      const [acc1, acc2, acc3] = await ethers.getSigners();

      // minting nfts
      await mockNft.mint(acc1.address, tokenId);
      await mockNft.mint(acc1.address, tokenId + 1);

      //creating  accounts with acc1
      await registry['createAccount(address,uint256,address,uint256,bytes)'](
        account.address,
        chainId,
        mockNft.address,
        tokenId,
        initData,
      );
      await registry['createAccount(address,uint256)'](mockNft.address, tokenId + 1);

      // getting the created account
      const accountAddress = await registry.account(
        account.address,
        chainId,
        mockNft.address,
        tokenId,
        salt,
      );

      // executing a call by  the owner of the created account
      const MockCall = await hre.ethers.getContractFactory('ExecuteCallMock');
      const mockCall = await MockCall.deploy();
      const AC = await ethers.getContractFactory('DefaultERC6551Account');
      const ac = await AC.attach(accountAddress);

      const callData1 = encodeCalldata('successCall1(address,uint256)', [
        ['address', acc1.address],
        ['uint256', 1],
      ]);

      // const callData1 = encodeCalldata('successCall1(address,uint256)', [[acc1.address, 1]]);
      const callData2 = encodeCalldata('successCall2(address,address)', [
        acc1.address,
        acc2.address,
      ]);

      // validate owner can execute call on other contract successfully
      await expect(ac.executeCall(mockCall.address, 0, callData1)).to.emit(mockCall, 'Success1');
      await expect(ac.executeCall(mockCall.address, 0, callData2)).to.emit(mockCall, 'Success2');

      // invalid token owner cant execute call
      await expect(ac.connect(acc2).executeCall(mockCall.address, 0, callData2)).to.be.revertedWith(
        'Not token owner',
      );
      await expect(ac.connect(acc3).executeCall(mockCall.address, 0, callData2)).to.be.revertedWith(
        'Not token owner',
      );

      //Testing with another account
      const accountAddress1 = await registry.account(
        account.address,
        chainId,
        mockNft.address,
        tokenId + 1,
        salt,
      );
      const ac1 = await AC.attach(accountAddress1);

      // validate owner can execute call on other contract successfully
      await expect(ac1.executeCall(mockCall.address, 0, callData1)).to.emit(mockCall, 'Success1');
      await expect(ac1.executeCall(mockCall.address, 0, callData2)).to.emit(mockCall, 'Success2');

      // invalid token owner cant execute call
      await expect(
        ac1.connect(acc2).executeCall(mockCall.address, 0, callData2),
      ).to.be.revertedWith('Not token owner');
      await expect(
        ac1.connect(acc3).executeCall(mockCall.address, 0, callData2),
      ).to.be.revertedWith('Not token owner');
    });
  });

  describe('Create Account,Run Failed execute calls ', function () {
    it('Should create account and execute a multicall', async function () {
      const { registry, account, mockNft } = await loadFixture(deployContracts);

      // params to create a new account
      const chainId = BigInt(await ethers.provider.send('eth_chainId', []));
      const tokenId = 10;
      const salt = 0;
      const initData: [] = [];
      const [acc1, acc2, acc3] = await ethers.getSigners();

      // minting nfts
      await mockNft.mint(acc1.address, tokenId);
      await mockNft.mint(acc1.address, tokenId + 1);

      //creating  accounts with acc1
      await registry['createAccount(address,uint256,address,uint256,bytes)'](
        account.address,
        chainId,
        mockNft.address,
        tokenId,
        initData,
      );
      await registry['createAccount(address,uint256)'](mockNft.address, tokenId + 1);

      // getting the created account
      const accountAddress = await registry.account(
        account.address,
        chainId,
        mockNft.address,
        tokenId,
        salt,
      );

      // executing a call by  the owner of the created account
      const MockCall = await hre.ethers.getContractFactory('ExecuteCallMock');
      const mockCall = await MockCall.deploy();
      const AC = await ethers.getContractFactory('DefaultERC6551Account');
      const ac = await AC.attach(accountAddress);

      const callData1 = encodeCalldata('failedCall1(address,uint256)', [
        ['address', acc1.address],
        ['uint256', 1],
      ]);
      const callData2 = encodeCalldata('failedCall2(address,address)', [
        acc1.address,
        acc2.address,
      ]);

      // validate owner can execute call on other contract successfully
      await expect(ac.executeCall(mockCall.address, 0, callData1)).to.be.revertedWithCustomError(
        mockCall,
        'Failed1',
      );
      await expect(ac.executeCall(mockCall.address, 0, callData2)).to.be.revertedWithCustomError(
        mockCall,
        'Failed2',
      );

      // invalid token owner cant execute call
      await expect(ac.connect(acc2).executeCall(mockCall.address, 0, callData2)).to.be.revertedWith(
        'Not token owner',
      );
      await expect(ac.connect(acc3).executeCall(mockCall.address, 0, callData2)).to.be.revertedWith(
        'Not token owner',
      );

      //Testing with another account
      const accountAddress1 = await registry.account(
        account.address,
        chainId,
        mockNft.address,
        tokenId + 1,
        salt,
      );
      const ac1 = await AC.attach(accountAddress1);

      // validate owner can execute call on other contract successfully
      await expect(ac1.executeCall(mockCall.address, 0, callData1)).to.be.revertedWithCustomError(
        mockCall,
        'Failed1',
      );
      await expect(ac1.executeCall(mockCall.address, 0, callData2)).to.be.revertedWithCustomError(
        mockCall,
        'Failed2',
      );

      // invalid token owner cant execute call
      await expect(
        ac1.connect(acc2).executeCall(mockCall.address, 0, callData2),
      ).to.be.revertedWith('Not token owner');
      await expect(
        ac1.connect(acc3).executeCall(mockCall.address, 0, callData2),
      ).to.be.revertedWith('Not token owner');
    });
  });

  describe('Create Account With Different NFT address', function () {
    it('Should create account and mint nft', async function () {
      const { registry, account, mockNft } = await loadFixture(deployContracts);
      const [acc1, acc2, acc3] = await ethers.getSigners();

      // params to create a new account

      // Deploying the mock nft

      const chainId = BigInt(await ethers.provider.send('eth_chainId', []));
      const tokenId = 1;
      const salt = 0;
      const initData: [] = [];

      // minting nfts
      await mockNft.mint(acc1.address, tokenId);
      await mockNft.mint(acc1.address, tokenId + 1);

      //creating  accounts with acc1
      await registry['createAccount(address,uint256,address,uint256,bytes)'](
        account.address,
        chainId,
        mockNft.address,
        tokenId,
        initData,
      );
      await registry['createAccount(address,uint256)'](mockNft.address, tokenId + 1);

      // getting the created account
      const accountAddress = await registry.account(
        account.address,
        chainId,
        mockNft.address,
        tokenId,
        salt,
      );

      // creating mock execute call with account
      const MockCall = await hre.ethers.getContractFactory('ExecuteCallMock');
      const mockCall = await MockCall.deploy();
      const AC = await ethers.getContractFactory('DefaultERC6551Account');
      const ac = await AC.attach(accountAddress);

      const callData0 = encodeCalldata('successCall1(address,uint256)', [
        ['address', acc1.address],
        ['uint256', 1],
      ]);
      const callData00 = encodeCalldata('successCall2(address,address)', [
        acc1.address,
        acc2.address,
      ]);

      // validate owner can execute call on other contract successfully
      await expect(ac.executeCall(mockCall.address, 0, callData0)).to.emit(mockCall, 'Success1');
      await expect(ac.executeCall(mockCall.address, 0, callData00)).to.emit(mockCall, 'Success2');

      const callData1 = encodeCalldata('failedCall1(address,uint256)', [
        ['address', acc1.address],
        ['uint256', 1],
      ]);
      const callData2 = encodeCalldata('failedCall2(address,address)', [
        acc1.address,
        acc2.address,
      ]);

      // validate owner can execute call on other contract successfully
      await expect(ac.executeCall(mockCall.address, 0, callData1)).to.be.revertedWithCustomError(
        mockCall,
        'Failed1',
      );
      await expect(ac.executeCall(mockCall.address, 0, callData2)).to.be.revertedWithCustomError(
        mockCall,
        'Failed2',
      );

      // invalid token owner cant execute call
      await expect(ac.connect(acc2).executeCall(mockCall.address, 0, callData2)).to.be.revertedWith(
        'Not token owner',
      );
      await expect(ac.connect(acc3).executeCall(mockCall.address, 0, callData2)).to.be.revertedWith(
        'Not token owner',
      );

      //Testing with another account
      const accountAddress1 = await registry.account(
        account.address,
        chainId,
        mockNft.address,
        tokenId + 1,
        salt,
      );
      const ac1 = await AC.attach(accountAddress1);

      // validate owner can execute call on other contract successfully
      await expect(ac1.executeCall(mockCall.address, 0, callData1)).to.be.revertedWithCustomError(
        mockCall,
        'Failed1',
      );
      await expect(ac1.executeCall(mockCall.address, 0, callData2)).to.be.revertedWithCustomError(
        mockCall,
        'Failed2',
      );

      // invalid token owner cant execute call
      await expect(
        ac1.connect(acc2).executeCall(mockCall.address, 0, callData2),
      ).to.be.revertedWith('Not token owner');
      await expect(
        ac1.connect(acc3).executeCall(mockCall.address, 0, callData2),
      ).to.be.revertedWith('Not token owner');
    });
  });
});
