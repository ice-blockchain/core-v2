export function fromBlockchainUnits(input: string, decimals: number): number {
  try {
    const value = BigInt(input);
    const divisor = BigInt(10) ** BigInt(decimals);
    const integerPart = value / divisor;
    const fractionalPart = value % divisor;
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    return parseFloat(`${integerPart}.${fractionalStr}`);
  } catch {
    return 0;
  }
}
