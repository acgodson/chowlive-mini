import { viem } from "hardhat";
import { getContract, parseEther, formatEther, toBytes } from "viem";
import { ERC725YDataKeys } from "@lukso/lsp-smart-contracts";

async function deployChowliveRoom() {
  // Get the deployer
  const [deployer] = await viem.getWalletClients();
  const deployerAddress = deployer.account.address;
  console.log(
    "Deploying ChowliveRoom contract with the account:",
    deployerAddress
  );

  // Get the public client for reading the blockchain
  const publicClient = await viem.getPublicClient();

  // Contract parameters
  const name = "Chowlive Room";
  const symbol = "CHOW";
  const roomCreationFee = parseEther("0.1");
  // Write metadata (should be a VerifiableURI)
  const metadataValue = "ipfs://QmNsEzKk2sBX43aH4obbdETnntHgKuenoLd7JZqbeQtLqY";
  const value = toBytes(metadataValue);
  console.log(value);

  // Deploy the contract
  const chowlive = await viem.deployContract(
    "ChowliveRoom" as any,
    [name, symbol, deployerAddress, roomCreationFee],
    {
      client: {
        wallet: deployer,
      },
    }
  );

  // Wait for deployment to complete
  const chowliveRoomAddress = chowlive.address;

  console.log("ChowliveRoom address:", chowliveRoomAddress);

  // Get contract instance
  const chowliveRoom = getContract({
    address: chowliveRoomAddress,
    abi: chowlive.abi,
    client: deployer,
  });

  // Read metadata
  const metadata = await chowliveRoom.read.getData([
    ERC725YDataKeys.LSP4["LSP4Metadata"] as `0x${string}`,
  ]);
  console.log("ChowliveRoom metadata:", ERC725YDataKeys.LSP4["LSP4Metadata"]);

  return;
  //@ts-ignore
  const setDataHash = await chowliveRoom.write.setData([
    ERC725YDataKeys.LSP4["LSP4Metadata"] as `0x${string}`,
    value,
  ]);

  const setDataReceipt = await publicClient.waitForTransactionReceipt({
    hash: setDataHash,
  });
  console.log("ChowliveRoom metadata updated:", setDataReceipt.transactionHash);
}

deployChowliveRoom()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
