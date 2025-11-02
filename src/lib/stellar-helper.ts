"use client";

/* eslint-disable @typescript-eslint/no-require-imports, @typescript-eslint/no-explicit-any */

import * as StellarSdk from "@stellar/stellar-sdk";

type NonNativeBalance = {
  asset_type: string;
  asset_code?: string;
  asset_issuer?: string;
  balance: string;
};

type PaymentRecord = {
  id: string;
  type: string;
  amount: string;
  asset_type: string;
  asset_code?: string;
  from?: string;
  to?: string;
  created_at: string;
  transaction_hash: string;
};

interface WalletKitModule {
  StellarWalletsKit: any;
  WalletNetwork: any;
  allowAllModules: () => unknown;
  FREIGHTER_ID: string;
}

let walletKitModule: WalletKitModule | null = null;

function loadWalletKit(): WalletKitModule {
  if (!walletKitModule) {
    walletKitModule = require("@creit.tech/stellar-wallets-kit") as WalletKitModule;
  }
  return walletKitModule;
}

export class StellarHelper {
  private server: StellarSdk.Horizon.Server;
  private networkPassphrase: string;
  private kit: any;
  private network: any;
  private publicKey: string | null = null;

  constructor(network: "testnet" | "mainnet" = "testnet") {
    const { StellarWalletsKit, WalletNetwork, allowAllModules, FREIGHTER_ID } = loadWalletKit();

    this.server = new StellarSdk.Horizon.Server(
      network === "testnet"
        ? "https://horizon-testnet.stellar.org"
        : "https://horizon.stellar.org",
    );
    this.networkPassphrase =
      network === "testnet"
        ? StellarSdk.Networks.TESTNET
        : StellarSdk.Networks.PUBLIC;

    this.network = network === "testnet"
      ? WalletNetwork.TESTNET
      : WalletNetwork.PUBLIC;

    this.kit = new StellarWalletsKit({
      network: this.network,
      selectedWalletId: FREIGHTER_ID,
      modules: allowAllModules(),
    });
  }

  isFreighterInstalled(): boolean {
    return true;
  }

  async connectWallet(): Promise<string> {
    try {
      await this.kit.openModal({
        onWalletSelected: async (option: { id: string }) => {
          this.kit.setWallet(option.id);
        },
      });

      const { address } = await this.kit.getAddress();

      if (!address) {
        throw new Error("Wallet connection failed");
      }

      this.publicKey = address;
      return address;
    } catch (error: unknown) {
      console.error("Wallet connection error:", error);
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Wallet connection failed: ${message}`);
    }
  }

  async getBalance(publicKey: string): Promise<{
    xlm: string;
    assets: Array<{ code: string; issuer: string; balance: string }>;
  }> {
  let account;
    try {
      account = await this.server.loadAccount(publicKey);
    } catch (error) {
      const maybeStatus = (error as { response?: { status?: number } })?.response?.status;

      if (
        maybeStatus === 404 ||
        error instanceof StellarSdk.NotFoundError ||
        (error instanceof Error && error.message.toLowerCase().includes("not found"))
      ) {
        const notFoundError = new Error("ACCOUNT_NOT_FOUND");
        (notFoundError as { code?: string }).code = "ACCOUNT_NOT_FOUND";
        throw notFoundError;
      }

      if (error instanceof Error) {
        throw error;
      }

      throw new Error("Failed to load balance");
    }

    const xlmBalance = account.balances.find(
      (balance: any) => balance.asset_type === "native",
    );

    const assets = account.balances
      .filter((balance: any) => balance.asset_type !== "native")
      .map((balance: any) => ({
        code: balance.asset_code ?? "UNKNOWN",
        issuer: balance.asset_issuer ?? "",
        balance: balance.balance,
      }));

    return {
      xlm: xlmBalance && "balance" in xlmBalance ? xlmBalance.balance : "0",
      assets,
    };
  }

  async sendPayment(params: {
    from: string;
    to: string;
    amount: string;
    memo?: string;
  }): Promise<{ hash: string; success: boolean }> {
    const account = await this.server.loadAccount(params.from);

    const transactionBuilder = new StellarSdk.TransactionBuilder(account, {
      fee: StellarSdk.BASE_FEE,
      networkPassphrase: this.networkPassphrase,
    }).addOperation(
      StellarSdk.Operation.payment({
        destination: params.to,
        asset: StellarSdk.Asset.native(),
        amount: params.amount,
      }),
    );

    if (params.memo) {
      transactionBuilder.addMemo(StellarSdk.Memo.text(params.memo));
    }

    const transaction = transactionBuilder.setTimeout(180).build();

    const { signedTxXdr } = await this.kit.signTransaction(transaction.toXDR(), {
      networkPassphrase: this.networkPassphrase,
    });

    const transactionToSubmit = StellarSdk.TransactionBuilder.fromXDR(
      signedTxXdr,
      this.networkPassphrase,
    );

    try {
      const result = await this.server.submitTransaction(
        transactionToSubmit as StellarSdk.Transaction,
      );

      return {
        hash: result.hash,
        success: result.successful,
      };
    } catch (error) {
      const badResponse = error as {
        response?: {
          data?: {
            extras?: {
              result_codes?: {
                transaction?: string;
                operations?: string[];
              };
              envelope_xdr?: string;
              result_xdr?: string;
            };
          };
        };
        message?: string;
      };

      const extras = badResponse.response?.data?.extras;
      const codes = extras?.result_codes;
      const txCode = codes?.transaction;
      const operationCode = codes?.operations?.[0];
      const reason = [txCode, operationCode]
        .filter(Boolean)
        .join(" / ");

      const detailMessage = reason
        ? `Stellar submission failed (${reason}).`
        : badResponse.message || "Stellar submission failed.";

      const enrichedError = new Error(detailMessage) as Error & {
        extras?: typeof extras;
      };
      enrichedError.extras = extras;
      throw enrichedError;
    }
  }

  async signAndSubmitXDR(xdr: string): Promise<{ hash: string; success: boolean }> {
    try {
      // Sign the transaction with the user's wallet
      const { signedTxXdr } = await this.kit.signTransaction(xdr, {
        networkPassphrase: this.networkPassphrase,
      });

      // Submit to Horizon
      const transactionToSubmit = StellarSdk.TransactionBuilder.fromXDR(
        signedTxXdr,
        this.networkPassphrase,
      );

      const result = await this.server.submitTransaction(
        transactionToSubmit as StellarSdk.Transaction,
      );

      return {
        hash: result.hash,
        success: result.successful,
      };
    } catch (error) {
      console.error('Sign and submit XDR error:', error);
      throw error;
    }
  }

  async getRecentTransactions(
    publicKey: string,
    limit = 10,
  ): Promise<Array<{
    id: string;
    type: string;
    amount?: string;
    asset?: string;
    from?: string;
    to?: string;
    createdAt: string;
    hash: string;
  }>> {
    let payments;
    try {
      payments = await this.server
        .payments()
        .forAccount(publicKey)
        .order("desc")
        .limit(limit)
        .call();
    } catch (error) {
      if (
        error instanceof StellarSdk.NotFoundError ||
        (error instanceof Error && error.message.toLowerCase().includes("not found"))
      ) {
        return [];
      }
      throw error;
    }

    return payments.records.map((payment: any) => ({
      id: payment.id,
      type: payment.type,
      amount: payment.amount,
      asset: payment.asset_type === "native" ? "XLM" : payment.asset_code,
      from: payment.from,
      to: payment.to,
      createdAt: payment.created_at,
      hash: payment.transaction_hash,
    }));
  }

  getExplorerLink(hash: string, type: "tx" | "account" = "tx"): string {
    const network = this.networkPassphrase === StellarSdk.Networks.TESTNET ? "testnet" : "public";
    return `https://stellar.expert/explorer/${network}/${type}/${hash}`;
  }

  formatAddress(address: string, startChars = 4, endChars = 4): string {
    if (address.length <= startChars + endChars) {
      return address;
    }
    return `${address.slice(0, startChars)}...${address.slice(-endChars)}`;
  }

  disconnect() {
    this.publicKey = null;
    return true;
  }
}

let cachedHelper: StellarHelper | null = null;

export function getStellarHelper(): StellarHelper {
  if (typeof window === "undefined") {
    throw new Error("Stellar helper is only available in the browser environment.");
  }

  if (!cachedHelper) {
    cachedHelper = new StellarHelper("testnet");
  }

  return cachedHelper;
}
