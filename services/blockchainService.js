const { ethers } = require("ethers");
require("dotenv").config();

const ABI = [
  "function recordOverseas(uint256 receiverBcUserID, uint256 amountCents, string ref) external"
];


function toCents(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) throw new Error("Invalid amount");
  return Math.round(n * 100);
}

function requireEnv(name) {
  const v = process.env[name];
  if (!v || typeof v !== "string") throw new Error(`Missing env: ${name}`);
  return v;
}

async function recordOverseasOnChain(receiverBcUserID, amountCents, reference) {
  if (receiverBcUserID === undefined || receiverBcUserID === null) {
    throw new Error("receiverBcUserID is undefined/null");
  }
  if (amountCents === undefined || amountCents === null) {
    throw new Error("amountCents is undefined/null");
  }
  if (!reference) {
    throw new Error("reference is missing");
  }

  const SEPOLIA_RPC_URL = requireEnv("SEPOLIA_RPC_URL");
  const PRIVATE_KEY = requireEnv("PRIVATE_KEY");
  const LEDGER_ADDRESS = requireEnv("LEDGER_ADDRESS");

  const provider = new ethers.providers.JsonRpcProvider(SEPOLIA_RPC_URL);
  const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
  const contract = new ethers.Contract(LEDGER_ADDRESS, ABI, wallet);

  // Ensure integers are encoded correctly
  const receiverIdBN = ethers.BigNumber.from(String(receiverBcUserID));
  const amountBN = ethers.BigNumber.from(String(amountCents));

  const tx = await contract.recordOverseas(receiverIdBN, amountBN, reference);
  const receipt = await tx.wait();

  return { txHash: tx.hash, blockNumber: receipt.blockNumber };
}

module.exports = { recordOverseasOnChain, toCents };
