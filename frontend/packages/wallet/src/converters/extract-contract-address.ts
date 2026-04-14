import type {WalletAsset} from '@ion/identity-client';

export function extractContractAddress(asset: WalletAsset): string | null {
  if (
    asset.kind === 'Erc20' ||
    asset.kind === 'Trc20' ||
    asset.kind === 'Native' ||
    asset.kind === 'Unknown'
  ) {
    return (asset as {contract?: string}).contract ?? null;
  }
  return null;
}
