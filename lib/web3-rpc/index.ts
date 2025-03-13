import {
  createPublicClient,
  custom,
  formatEther,
  parseEther,
  Chain,
  Address,
  encodeFunctionData,
  http,
  PublicClient,
} from 'viem';
import { sepolia, avalancheFuji, baseSepolia, optimismSepolia } from 'viem/chains';
import {
  createBundlerClient,
  toCoinbaseSmartAccount,
  createPaymasterClient,
} from 'viem/account-abstraction';
import { privateKeyToAccount } from 'viem/accounts';
import chowliveRoomABI from '@/utils/helpers/abis/ChowliveRoom.json';

import type { IProvider } from '@web3auth/base';
import { parseCreateRoomEvents } from '@/utils';

export default class EthereumRpc {
  private provider: IProvider;
  private chainConfigs: { [key: string]: Chain };
  private publicClient: PublicClient;

  constructor(provider: IProvider) {
    this.provider = provider;
    this.chainConfigs = {
      '0x14a33': baseSepolia,
      '0xaa36a7': sepolia,
      '0xaa37dc': optimismSepolia,
      '0xa869': avalancheFuji,
    };
    this.publicClient = createPublicClient({
      chain: this.getViewChain(),
      transport: custom(this.provider),
    });
  }

  getViewChain(): Chain {
    const chainId = this.provider.chainId as keyof typeof this.chainConfigs;
    return this.chainConfigs[chainId] || baseSepolia;
  }

  async getChainId(): Promise<string> {
    try {
      const chainId = await this.publicClient.getChainId();
      return `0x${chainId.toString(16)}`;
    } catch (error) {
      console.error('Error getting chain ID:', error);
      throw error;
    }
  }

  async getSmartAccount() {
    const privateKey = await this.getPrivateKey();
    const owner = privateKeyToAccount(`0x${privateKey}`);
    const account = await toCoinbaseSmartAccount({
      client: this.publicClient,
      owners: [owner],
    });

    return account;
  }

  async getAddresses(): Promise<`0x${string}` | undefined> {
    try {
      const account = await this.getSmartAccount();
      return account.address;
    } catch (error) {
      console.error('Error getting addresses:', error);
      return undefined;
    }
  }

  async getAccounts(): Promise<`0x${string}` | undefined> {
    if (!this.provider) {
      return;
    }
    return this.getAddresses();
  }

  async getPrivateKey(): Promise<any> {
    try {
      const privateKey = await this.provider.request({
        method: 'eth_private_key',
      });
      return privateKey;
    } catch (error) {
      return error as string;
    }
  }

  async getBalance(): Promise<string> {
    try {
      const address = await this.getAccounts();
      if (!address) {
        console.log('no account yet for balance retrieval');
        return '0';
      }
      this.publicClient = createPublicClient({
        chain: this.getViewChain(),
        transport: custom(this.provider),
      });
      const balance = await this.publicClient.getBalance({ address });
      return formatEther(balance);
    } catch (error) {
      return error as string;
    }
  }

  async createRoom(
    isPublic: boolean,
    subscriptionFee: bigint | number,
    tokenAddress: Address
  ): Promise<{ hash: any; roomId: bigint }> {
    try {
      const account = await this.getSmartAccount();

      const paymasterClient = createPaymasterClient({
        transport: http(
          `https://api.developer.coinbase.com/rpc/v1/base-sepolia/${process.env.NEXT_PUBLIC_COINBASE_RPC}`
        ),
      });

      const bundlerClient = createBundlerClient({
        chain: baseSepolia,
        paymaster: paymasterClient,
        transport: http(
          `https://api.developer.coinbase.com/rpc/v1/base-sepolia/${process.env.NEXT_PUBLIC_COINBASE_RPC}`
        ),
      });

      const contractAddress = process.env.NEXT_PUBLIC_CHOWLIVE_ROOM as `0x${string}`;

      const data = encodeFunctionData({
        abi: chowliveRoomABI.abi,
        functionName: 'createRoom',
        args: [
          isPublic,
          !isPublic ? 0 : subscriptionFee,
          !isPublic ? '0x0000000000000000000000000000000000000000' : tokenAddress,
        ],
      });
      const userOpHash = await bundlerClient.sendUserOperation({
        account,
        calls: [
          {
            to: contractAddress,
            data,
            value: parseEther('0'),
          },
        ],
      });
      console.log('UserOp Hash:', userOpHash);
      const transactionH = await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash });
      const x = await parseCreateRoomEvents(transactionH.receipt);
      return { hash: x?.hash, roomId: x?.roomId as any };
    } catch (error) {
      console.error('Error creating room:', error);
      throw error;
    }
  }

  async subscribe(
    isBased = true,
    nftId: number,
    subscriptionFee: any
  ): Promise<string | undefined> {
    try {
      const chain = isBased ? baseSepolia : sepolia;
      const account = await this.getSmartAccount();

      const contractAddress = isBased
        ? process.env.NEXT_PUBLIC_CHOWLIVE_ROOM
        : process.env.NEXT_PUBLIC_CHOWLIVE_ROUTER;

      if (!contractAddress) throw new Error('Contract address not found');

      //Note: If subscription fee is > 0 grant erc20 approval permision.
      // for client demo subscription fees are always set at 0

      const data = encodeFunctionData({
        abi: chowliveRoomABI.abi,
        functionName: isBased ? 'subscribeToRoom' : 'subscribeToCrossChainRoom',
        args: isBased ? [account.address, nftId] : [account.address, nftId],
      });

      if (isBased) {
        // Gasless transaction for BaseSepolia
        const paymasterClient = createPaymasterClient({
          transport: http(
            'https://api.developer.coinbase.com/rpc/v1/base-sepolia/ETbUiI4nKwRzdh60GHlCC3GdBSXOai5n'
          ),
        });

        const bundlerClient = createBundlerClient({
          chain: baseSepolia,
          paymaster: paymasterClient,
          transport: http(
            'https://api.developer.coinbase.com/rpc/v1/base-sepolia/ETbUiI4nKwRzdh60GHlCC3GdBSXOai5n'
          ),
        });

        const userOpHash = await bundlerClient.sendUserOperation({
          account,
          calls: [
            {
              to: contractAddress as `0x${string}`,
              data,
            },
          ],
        });

        console.log('UserOp Hash:', userOpHash);

        const transactionHash = await bundlerClient.waitForUserOperationReceipt({
          hash: userOpHash,
        });
        console.log('Transaction Hash:', transactionHash);

        return transactionHash.userOpHash;
      } else {
        // Regular transaction for other chains
        const bundlerClient = createBundlerClient({
          chain,
          transport: http(
            `https://bundler.biconomy.io/api/v2/${chain.id}/${process.env.NEXT_PUBLIC_BUNDLER_ID}`
          ),
        });

        const userOpHash = await bundlerClient.sendUserOperation({
          account,
          calls: [
            {
              to: contractAddress as `0x${string}`,
              data,
            },
          ],
        });

        console.log('UserOp Hash:', userOpHash);

        const transactionHash = await bundlerClient.waitForUserOperationReceipt({
          hash: userOpHash,
        });
        console.log('Transaction Hash:', transactionHash);
        return transactionHash.userOpHash;
      }
    } catch (error) {
      console.error('Error subscribing:', error);
      throw error;
    }
  }
}
