import { ethers } from 'hardhat';
import { expect } from 'chai';
import { Signer } from 'ethers';
import { loadFixture } from '@nomicfoundation/hardhat-network-helpers';


describe('Token/AccessCard', function () {
  let owner: Signer;
  let railgun: Signer;
  let non_owner: Signer;


  async function deploy() {
    [owner, railgun, non_owner] = await ethers.getSigners();

    // Deploy the contract
    const AccessCardFactory = await ethers.getContractFactory('AccessCard');
    const nft = await AccessCardFactory.deploy('NFT Test', 'NFTT');
    return { nft, owner, railgun, non_owner};
  }


  it('Should mint an NFT', async function () {
    // Mint an NFT
    const { nft, owner } = await loadFixture(deploy);
    const metadata = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(JSON.stringify({
      "name": "My NFT",
      "description": "A unique non-fungible token"
  })));
    await nft.connect(owner).mint(metadata);

    // Check the balance of the owner (should be 1)
    const balance = await nft.balanceOf(await owner.getAddress());
    expect(balance).to.equal(1);

  });

  it('Should set baseURI and railgun address', async function () {

    const { nft, owner, railgun } = await loadFixture(deploy);
    const metadata = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(JSON.stringify({
      "name": "My NFT",
      "description": "A unique non-fungible token"
  })));

    await nft.connect(railgun).mint(metadata);

    // Set baseURI
    const newBaseURI = 'https://railgun.com/';
    await nft.connect(owner).setBaseURI(newBaseURI);
    const updatedBaseURI = await nft.baseURI();
    expect(updatedBaseURI).to.equal(newBaseURI);

    // Get the Ethereum address of the railgun signer
    const railgunAddress = await railgun.getAddress();

    // Set railgun address
    await nft.connect(owner).setRailgunAddress(railgunAddress);

    const updatedRailgunAddress = await nft.railgun();
    expect(updatedRailgunAddress).to.equal(railgunAddress);
  });

  it('Should set encrypted metadata', async function () {
    // Mint an NFT
    const { nft, owner } = await loadFixture(deploy);
    
    const metadata = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(JSON.stringify({
      "name": "My NFT",
      "description": "A unique non-fungible token"
    })));
    await nft.connect(owner).mint(metadata);

    // Set encrypted metadata for the NFT
    const tokenId = 0;
    await nft.connect(owner).setEncryptedMetadata(tokenId, metadata);

    // Check the stored encrypted metadata
    const storedMetadata = await nft.encryptedMetadata(tokenId);
    expect(storedMetadata).to.equal(metadata);
  });

  it('Should not set encrypted metadata by non-owners', async function () {
    // Mint an NFT
    const { nft, owner, non_owner } = await loadFixture(deploy);
    const metadata = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(JSON.stringify({
      "name": "My NFT",
      "description": "A unique non-fungible token"
    })));
    const mint = await nft.connect(owner).mint(metadata);

    // Set encrypted metadata for the NFT
    const tokenId = 0;
    //throws error 
    await expect(nft.connect(non_owner).setEncryptedMetadata(tokenId, metadata)).to.be.revertedWith('Only token owner can set metadata');
  });


  it('Should generate correct tokenURI for owner', async function () {
    // Mint an NFT
    const { nft, owner } = await loadFixture(deploy);

    const metadata = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(JSON.stringify({
      "name": "My NFT",
      "description": "A unique non-fungible token"
    })));
    const mint = await nft.connect(owner).mint(metadata);

    // Set the baseURI in your test setup
    await nft.connect(owner).setBaseURI('https://railgun.com');

    // Check the tokenURI for the owner
    const tokenId = 0;
    const tokenURI = await nft.tokenURI(tokenId);

    const expectedURI = `https://railgun.com/normal/${tokenId}`;
    expect(tokenURI).to.equal(expectedURI);
  });

  it('Should generate correct tokenURI for railgun', async function () {
    // Mint an NFT
    const { nft, owner, railgun } = await loadFixture(deploy);

    const metadata = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(JSON.stringify({
      "name": "My NFT",
      "description": "A unique non-fungible token"
    })));
  
    // Set the baseURI in your test setup
    await nft.connect(owner).setBaseURI('https://railgun.com');

    // Get the Ethereum address of the railgun signer
    const railgunAddress = await railgun.getAddress();

    // Set railgun address
    await nft.connect(owner).setRailgunAddress(railgunAddress);
    await nft.connect(railgun).mint(metadata);


    // Check the tokenURI for the railgun
    const tokenId =0;
    const tokenURI = await nft.tokenURI(tokenId);
    const expectedURI = `https://railgun.com/special/${tokenId}`;
    expect(tokenURI).to.equal(expectedURI);
  });

  it('Should transfer NFT to another address', async function () {
    const { nft, owner, non_owner } = await loadFixture(deploy);
    const metadata = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(JSON.stringify({
      "name": "My NFT",
      "description": "A unique non-fungible token"
    })));
    const mint = await nft.connect(owner).mint(metadata);    
    const tokenId = 0;
    await nft.connect(owner).transferFrom(await owner.getAddress(), await non_owner.getAddress(), tokenId);
    const newOwner = await nft.ownerOf(tokenId);
    expect(newOwner).to.equal(await non_owner.getAddress());
  });

  it('Should approve and then transfer NFT to another address', async function () {
    const { nft, owner, non_owner } = await loadFixture(deploy);
    const metadata = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(JSON.stringify({
      "name": "My NFT",
      "description": "A unique non-fungible token"
    })));
    const mint = await nft.connect(owner).mint(metadata);
    const tokenId = 0;
    await nft.connect(owner).approve(await non_owner.getAddress(), tokenId);
    await nft.connect(non_owner).transferFrom(await owner.getAddress(), await non_owner.getAddress(), tokenId);
    const newOwner = await nft.ownerOf(tokenId);
    expect(newOwner).to.equal(await non_owner.getAddress());
  });
});
