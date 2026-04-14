import { Logger } from "@ion/diagnostics";

export function fromBlockchainUnits(input: string, decimals: number): number {
  try {
    const value = BigInt(input);
    const divisor = BigInt(10) ** BigInt(decimals);
    const integerPart = value / divisor;
    const fractionalPart = value % divisor;
    const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
    return parseFloat(`${integerPart}.${fractionalStr}`);
  } catch (error) {
    Logger.error("Failed to parse blockchain units", {
      tag: "wallet",
      error: error instanceof Error ? error : new Error(String(error)),
      data: { input, decimals },
    });
    return 0;
  }
}
