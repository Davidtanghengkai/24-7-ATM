const { ethers } = require("hardhat");

async function main() {
  const Ledger = await ethers.getContractFactory("OverseasLedger");
  const ledger = await Ledger.deploy();
  await ledger.deployed();

  console.log("✅ OverseasLedger deployed to:", ledger.address);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
