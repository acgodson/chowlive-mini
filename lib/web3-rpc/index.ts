import {
  createPublicClient,
  custom,
  formatEther,
  http,
  PublicClient,
  defineChain,
  createWalletClient,
  decodeEventLog,
  type WalletClient,
} from "viem";
import { createClientUPProvider } from "@lukso/up-provider";
import chowliveRoomABI from "./ChowliveRoom.json";

// Define LUKSO mainnet chain
export const luksoMainnet = defineChain({
  id: 42,
  name: "LUKSO Mainnet",
  nativeCurrency: {
    decimals: 18,
    name: "LUKSO",
    symbol: "LYX",
  },
  rpcUrls: {
    default: {
      http: ["https://42.rpc.thirdweb.com"],
    },
  },
  blockExplorers: {
    default: {
      name: "LUKSO Explorer",
      url: "https://explorer.lukso.network",
    },
  },
});

export default class LuksoRpc {
  private provider: any;
  private publicClient: PublicClient;
  private walletClient: WalletClient;

  constructor(provider: any) {
    if (!provider?.accounts[0]) {
      throw new Error("No account connected");
    }
    this.provider = provider;
    // Create public client for read operations
    this.publicClient = createPublicClient({
      chain: luksoMainnet,
      transport: custom(provider),
    });

    // Create wallet client for write operations
    this.walletClient = createWalletClient({
      chain: luksoMainnet,
      transport: custom(provider),
    });
  }

  // Create a static method to get a provider directly
  static getUpProvider() {
    return createClientUPProvider();
  }

  // Get static clients
  static getPublicClient() {
    return createPublicClient({
      chain: luksoMainnet,
      transport: http(),
    });
  }

  static getWalletClient(provider: any) {
    return createWalletClient({
      chain: luksoMainnet,
      transport: custom(provider),
    });
  }

  async getChainId(): Promise<string> {
    try {
      const chainId = await this.publicClient.getChainId();
      return `0x${chainId.toString(16)}`;
    } catch (error) {
      console.error("Error getting chain ID:", error);
      throw error;
    }
  }

  async getAccounts(): Promise<string[]> {
    try {
      const accounts = await this.provider.accounts;
      return accounts as string[];
    } catch (error) {
      console.error("Error getting accounts:", error);
      throw error;
    }
  }

  async getBalance(): Promise<string> {
    try {
      const accounts = await this.getAccounts();
      if (!accounts || accounts.length === 0) {
        console.log("No account available for balance retrieval");
        return "0";
      }
      const balance = await this.publicClient.getBalance({
        address: accounts[0] as `0x${string}`,
      });
      return formatEther(balance);
    } catch (error) {
      console.error("Error getting balance:", error);
      return "0";
    }
  }

  async createRoom(
    isPublic: boolean,
    subscriptionFee: bigint | number
  ): Promise<{ hash: string; roomId: bigint }> {
    try {
      const accounts = await this.getAccounts();
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts available");
      }

      const contractAddress = process.env
        .NEXT_PUBLIC_CHOWLIVE_ROOM as `0x${string}`;
      if (!contractAddress) {
        throw new Error("Contract address not found");
      }

      // Get the room creation fee from the contract
      const roomCreationFee = await this.publicClient.readContract({
        address: contractAddress,
        abi: chowliveRoomABI.abi,
        functionName: "roomCreationFee",
      });

      console.log("Room creation fee:", roomCreationFee);

      // Transaction hash from writing to the contract
      const hash = await this.walletClient.writeContract({
        address: contractAddress,
        abi: chowliveRoomABI.abi,
        functionName: "createRoom",
        args: [isPublic, subscriptionFee],
        value: BigInt(roomCreationFee as any),
        chain: luksoMainnet,
        account: accounts[0] as `0x${string}`,
      });

      console.log("Transaction hash:", hash);

      // Wait for transaction receipt
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash,
      });

      // Parse event logs to get roomId
      const roomCreatedEvent = receipt.logs
        .map((log) => {
          try {
            return {
              ...log,
              ...decodeEventLog({
                abi: chowliveRoomABI.abi,
                data: log.data,
                topics: log.topics,
              }),
            };
          } catch {
            return null;
          }
        })
        .find((event) => event && event.eventName === "RoomCreated");

      if (!roomCreatedEvent || !roomCreatedEvent.args) {
        throw new Error("Failed to get room ID from event logs");
      }

      return {
        hash,
        roomId: roomCreatedEvent.args[0] as bigint,
      };
    } catch (error) {
      console.error("Error creating room:", error);
      throw error;
    }
  }

  async subscribeToRoom(
    roomId: number,
    subscriptionFee: bigint | number = 0
  ): Promise<string> {
    try {
      const accounts = await this.getAccounts();
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts available");
      }

      const contractAddress = process.env
        .NEXT_PUBLIC_CHOWLIVE_ROOM as `0x${string}`;
      if (!contractAddress) {
        throw new Error("Contract address not found");
      }

      // Get room details to check if it requires a fee
      const roomDetails: any = await this.publicClient.readContract({
        address: contractAddress,
        abi: chowliveRoomABI.abi,
        functionName: "getRoomDetails",
        args: [BigInt(roomId)],
      });

      // Send transaction using wallet client
      const hash = await this.walletClient.writeContract({
        address: contractAddress,
        abi: chowliveRoomABI.abi,
        functionName: "subscribeToRoom",
        args: [BigInt(roomId)],
        value: roomDetails[1] ? BigInt(subscriptionFee) : BigInt(0),
        chain: luksoMainnet,
        account: accounts[0] as `0x${string}`,
      });

      console.log("Subscription transaction hash:", hash);
      // Wait for transaction receipt
      await this.publicClient.waitForTransactionReceipt({
        hash,
      });

      return hash;
    } catch (error) {
      console.error("Error subscribing to room:", error);
      throw error;
    }
  }

  async cancelSubscription(roomId: number): Promise<string> {
    try {
      const accounts = await this.getAccounts();
      if (!accounts || accounts.length === 0) {
        throw new Error("No accounts available");
      }
      const contractAddress = process.env
        .NEXT_PUBLIC_CHOWLIVE_ROOM as `0x${string}`;
      if (!contractAddress) {
        throw new Error("Contract address not found");
      }

      const hash = await this.walletClient.writeContract({
        address: contractAddress,
        abi: chowliveRoomABI.abi,
        functionName: "cancelSubscription",
        args: [BigInt(roomId)],
        chain: luksoMainnet,
        account: accounts[0] as `0x${string}`,
      });

      console.log("Cancel subscription transaction hash:", hash);

      await this.publicClient.waitForTransactionReceipt({
        hash,
      });

      return hash;
    } catch (error) {
      console.error("Error cancelling subscription:", error);
      throw error;
    }
  }

  async getUserSubscribedRooms(): Promise<number[]> {
    try {
      const accounts = await this.getAccounts();
      if (!accounts || accounts.length === 0) {
        return [];
      }

      const contractAddress = process.env
        .NEXT_PUBLIC_CHOWLIVE_ROOM as `0x${string}`;
      if (!contractAddress) {
        throw new Error("Contract address not found");
      }

      const subscribedRooms = await this.publicClient.readContract({
        address: contractAddress,
        abi: chowliveRoomABI.abi,
        functionName: "getUserSubscribedRooms",
        args: [accounts[0] as `0x${string}`],
      });

      return (subscribedRooms as bigint[]).map((roomId) => Number(roomId));
    } catch (error) {
      console.error("Error getting user subscribed rooms:", error);
      return [];
    }
  }

  async getUserActiveSubscriptions(): Promise<number[]> {
    try {
      const accounts = await this.getAccounts();
      if (!accounts || accounts.length === 0) {
        return [];
      }

      const contractAddress = process.env
        .NEXT_PUBLIC_CHOWLIVE_ROOM as `0x${string}`;
      if (!contractAddress) {
        throw new Error("Contract address not found");
      }

      const activeSubscriptions = await this.publicClient.readContract({
        address: contractAddress,
        abi: chowliveRoomABI.abi,
        functionName: "getUserActiveSubscriptions",
        args: [accounts[0] as `0x${string}`],
      });

      return (activeSubscriptions as bigint[]).map((roomId) => Number(roomId));
    } catch (error) {
      console.error("Error getting user active subscriptions:", error);
      return [];
    }
  }

  async hasAccess(roomId: number): Promise<boolean> {
    try {
      const accounts = await this.getAccounts();
      if (!accounts || accounts.length === 0) {
        return false;
      }

      const contractAddress = process.env
        .NEXT_PUBLIC_CHOWLIVE_ROOM as `0x${string}`;
      if (!contractAddress) {
        throw new Error("Contract address not found");
      }

      const hasAccess = await this.publicClient.readContract({
        address: contractAddress,
        abi: chowliveRoomABI.abi,
        functionName: "hasAccess",
        args: [accounts[0] as `0x${string}`, BigInt(roomId)],
      });

      return hasAccess as boolean;
    } catch (error) {
      console.error("Error checking access to room:", error);
      return false;
    }
  }

  async getRoomDetails(roomId: number): Promise<any> {
    try {
      const contractAddress = process.env
        .NEXT_PUBLIC_CHOWLIVE_ROOM as `0x${string}`;
      if (!contractAddress) {
        throw new Error("Contract address not found");
      }

      const roomDetails = await this.publicClient.readContract({
        address: contractAddress,
        abi: chowliveRoomABI.abi,
        functionName: "getRoomDetails",
        args: [BigInt(roomId)],
      });

      // Format the response to be more usable
      const formattedDetails = {
        id: Number((roomDetails as any)[0]),
        isPublic: (roomDetails as any)[1],
        subscriptionFee: formatEther((roomDetails as any)[2]),
        subscriberCount: Number((roomDetails as any)[3]),
        creationTime: new Date(Number((roomDetails as any)[4]) * 1000),
      };

      return formattedDetails;
    } catch (error) {
      console.error("Error getting room details:", error);
      throw error;
    }
  }
}
