const {
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const {expect} = require("chai");
const hre = require("hardhat");
const {ethers} = require("hardhat");

describe("ERC6551 Registry",
    function () {
      // We define a fixture to reuse the same setup in every test.
      // We use loadFixture to run this setup once, snapshot that state,
      // and reset Hardhat Network to that snapshot in every test.
      async function deployContracts() {

        const name = "Private Aave AM";
        const symbol = "PACM"

        const Registry = await hre.ethers.getContractFactory("ERC6551Registry");
        const Account = await hre.ethers.getContractFactory(
            "DefaultERC6551Account");
        const registry = await Registry.deploy(name, symbol);
        const account = await Account.deploy();
        await registry.deployed();
        await account.deployed();
        return {registry, account};
      }

      describe("Deployment", function () {
        it("Should return valid name and symbol", async function () {
          const {registry, account} = await loadFixture(
              deployContracts);
          expect(await registry.name()).to.equal("Private Aave AM");
          expect(await registry.symbol()).to.equal("PACM");
        });
      });

      describe("Create Account,Mint NFT", function () {
        it("Should create account and mint nft", async function () {
          const {registry, account} = await loadFixture(
              deployContracts);

          // params to create a new account
          const chainId = BigInt(
              (await ethers.provider.send('eth_chainId', [])));
          const tokenAddress = ethers.constants.AddressZero;
          const salt = 123;
          const initData = [];
          const [acc1, acc2, acc3] = await ethers.getSigners();

          //creating an account with acc1
          const create = await registry.createAccount(account.address, chainId,
              tokenAddress,
              0, salt, initData);

          // await expect(create).to.emit(registry, "AccountCreated").withArgs("",
          //     account.address, chainId, tokenAddress,
          //     maxUint, salt);

          await expect(create).to.emit(registry, "AccountCreated");

          // getting the created account
          const accountAddress = await registry.account(account.address,
              chainId, registry.address, 0, salt);

          // validating the owner of the created account
          const AC = await ethers.getContractFactory("DefaultERC6551Account");
          const ac = await AC.attach(accountAddress);
          expect(await ac.owner()).to.equal(acc1.address);

          //validation the nft owner
          expect(await registry.ownerOf(0)).to.equal(acc1.address);

          //creating another account with acc1
          const create2 = await registry.createAccount(account.address, chainId,
              tokenAddress,
              0, salt, initData);

          await expect(create2).to.emit(registry, "AccountCreated");

          // getting the created account
          const accountAddress2 = await registry.account(account.address,
              chainId, registry.address, 1, salt);

          // validating the owner of the created account
          const AC2 = await ethers.getContractFactory("DefaultERC6551Account");
          const ac2 = await AC2.attach(accountAddress2);
          expect(await ac2.owner()).to.equal(acc1.address);

          //validation the nft owner
          expect(await registry.ownerOf(1)).to.equal(acc1.address);

        });
      });
      describe("Create Account With Different NFT address", function () {
        it("Should create account and mint nft", async function () {
          const {registry, account} = await loadFixture(
              deployContracts);
          const [acc1, acc2, acc3] = await ethers.getSigners();

          // params to create a new account

          // Deploying the mock nft
          const MockNft = await ethers.getContractFactory("TestERC721");
          const mockNft = await MockNft.deploy();
          const chainId = BigInt(
              (await ethers.provider.send('eth_chainId', [])));
          const tokenAddress = mockNft.address;
          const tokenId = 1;
          const salt = 123;
          const initData = [];

          //Minting the nft
          await mockNft.safeMint(acc1.address, tokenId)

          //validation of the nft owner
          expect(await mockNft.ownerOf(tokenId)).to.equal(acc1.address);

          //creating an account with acc1
          const create = await registry.createAccount(account.address, chainId,
              tokenAddress,
              tokenId, salt, initData);

          await expect(create).to.emit(registry, "AccountCreated");

          // getting the created account
          const accountAddress = await registry.account(account.address,
              chainId, tokenAddress, tokenId, salt);

          // validating the owner of the created account
          const AC = await ethers.getContractFactory("DefaultERC6551Account");
          const ac = await AC.attach(accountAddress);
          expect(await ac.owner()).to.equal(acc1.address);

          //Minting another  nft
          const tokenId2 = 2;
          await mockNft.safeMint(acc1.address, tokenId2)

          //Validating the NFT owner
          expect(await mockNft.ownerOf(tokenId2)).to.equal(acc1.address);

          //creating another account with acc1
          const create2 = await registry.createAccount(account.address, chainId,
              tokenAddress,
              tokenId2, salt, initData);
          await expect(create2).to.emit(registry, "AccountCreated");

          // getting the created account
          const accountAddress2 = await registry.account(account.address,
              chainId, tokenAddress, tokenId2, salt);

          // validating the owner of the created account
          const AC2 = await ethers.getContractFactory("DefaultERC6551Account");
          const ac2 = await AC2.attach(accountAddress2);
          expect(await ac2.owner()).to.equal(acc1.address);

        });
      });

      describe("Failed Create Account,Mint NFT", function () {
        it("Should revert while creating account and mint nft",
            async function () {
              const {registry, account} = await loadFixture(
                  deployContracts);

              // params to create a new account
              const chainId = BigInt(
                  (await ethers.provider.send('eth_chainId', [])));
              const zeroAddress = ethers.constants.AddressZero;
              const salt = 123;
              //invalid init data
              const initData = [1];
              const [acc1, acc2, acc3] = await ethers.getSigners();

              //creating an account with invalid initData
              await expect(registry.createAccount(account.address, chainId,
                  zeroAddress,
                  0, salt, initData)).to.be.revertedWithCustomError(registry,
                  "InitializationFailed");


              // Deploying the mock nft
              const MockNft = await ethers.getContractFactory("TestERC721");
              const mockNft = await MockNft.deploy();

              const tokenAddress = mockNft.address;
              const tokenId = 1;

              //Minting the nft
              await mockNft.safeMint(acc2.address, tokenId)

              // Invalid owner creating account for the NFT
              await expect(registry.createAccount(account.address, chainId,
                  tokenAddress,
                  tokenId, salt, initData)).to.be.revertedWith(
                  "createAccount caller is not an owner!")

            });
      });

    });
