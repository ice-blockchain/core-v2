const BAG_ID_PATTERN = /^[0-9a-fA-F]{64}$/;

export function validateBagId(bagId: string): void {
  if (!BAG_ID_PATTERN.test(bagId)) {
    throw new Error(`Invalid bag ID: must be a 64-character hex string`);
  }
}
