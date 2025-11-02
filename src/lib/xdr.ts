import * as StellarSdk from '@stellar/stellar-sdk';

const DEFAULT_HORIZON_URL = 'https://horizon-testnet.stellar.org';

const HORIZON_URL =
  process.env.HORIZON_URL ||
  process.env.NEXT_PUBLIC_HORIZON_URL ||
  DEFAULT_HORIZON_URL;

const NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_NETWORK === 'public'
    ? StellarSdk.Networks.PUBLIC
    : StellarSdk.Networks.TESTNET;

const server = new StellarSdk.Horizon.Server(HORIZON_URL);

export interface BuildPaymentParams {
  source: string;
  destination: string;
  amount: string;
  assetCode?: string;
  assetIssuer?: string;
  memo?: string;
}

export async function buildMedThresholdPayment(params: BuildPaymentParams): Promise<string> {
  const account = await server.loadAccount(params.source);
  const fee = await server.fetchBaseFee();

  const asset =
    params.assetCode && params.assetIssuer
      ? new StellarSdk.Asset(params.assetCode, params.assetIssuer)
      : StellarSdk.Asset.native();

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: String(fee),
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      StellarSdk.Operation.payment({
        destination: params.destination,
        asset,
        amount: params.amount,
      })
    )
    .setTimeout(300);

  if (params.memo) {
    tx.addMemo(StellarSdk.Memo.text(params.memo));
  }

  const built = tx.build();
  // Transaction is already unsigned when built
  return built.toXDR();
}

