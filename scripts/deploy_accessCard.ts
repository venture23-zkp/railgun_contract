import { ethers } from "hardhat";

async function main() {
  const AccessCard = await ethers.getContractFactory('AccessCard');
  // Deploy AccessCard contract
  const accessCard = await AccessCard.deploy('Railgun Access Card', 'RAC');

  console.log('AccessCard contract deployed to:', accessCard.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
