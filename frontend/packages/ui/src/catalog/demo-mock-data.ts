export interface MockCoin {
  name: string;
  ticker: string;
  amount: string;
  dollarValue: string;
  color: string;
  initial: string;
}

export interface MockNetwork {
  name: string;
  ticker: string;
  amount: string;
  dollarValue: string;
  networkLabel: string;
  networkColor: string;
}

export const MOCK_COINS: MockCoin[] = [
  { name: "Bitcoin", ticker: "BTC", amount: "0.52", dollarValue: "$14,589.42", color: "#F7931A", initial: "B" },
  { name: "ice Network", ticker: "ION", amount: "10,000.00", dollarValue: "$9,500.00", color: "#0F0137", initial: "I" },
  { name: "Ethereum", ticker: "ETH", amount: "1.17", dollarValue: "$2,010.42", color: "#627EEA", initial: "E" },
  { name: "TetherUS", ticker: "USDT", amount: "100.00", dollarValue: "$99.99", color: "#26A17B", initial: "T" },
];

const ALL_NETWORKS: MockNetwork[] = [
  { name: "TetherUS", ticker: "USDT", amount: "0.00", dollarValue: "$0.00", networkLabel: "Arbitrum", networkColor: "#2D374B" },
  { name: "TetherUS", ticker: "USDT", amount: "0.00", dollarValue: "$0.00", networkLabel: "BNB Smart Chain", networkColor: "#F3BA2F" },
  { name: "TetherUS", ticker: "USDT", amount: "0.00", dollarValue: "$0.00", networkLabel: "Ethereum", networkColor: "#627EEA" },
  { name: "TetherUS", ticker: "USDT", amount: "0.00", dollarValue: "$0.00", networkLabel: "Solana", networkColor: "#252A34" },
  { name: "TetherUS", ticker: "USDT", amount: "0.00", dollarValue: "$0.00", networkLabel: "Matic", networkColor: "#8247E5" },
  { name: "TetherUS", ticker: "USDT", amount: "0.00", dollarValue: "$0.00", networkLabel: "Cosmos", networkColor: "#2F3146" },
  { name: "TetherUS", ticker: "USDT", amount: "0.00", dollarValue: "$0.00", networkLabel: "Tron", networkColor: "#FF060A" },
  { name: "TetherUS", ticker: "USDT", amount: "0.00", dollarValue: "$0.00", networkLabel: "Avalanche", networkColor: "#E84142" },
  { name: "TetherUS", ticker: "USDT", amount: "0.00", dollarValue: "$0.00", networkLabel: "Optimism", networkColor: "#FF0420" },
  { name: "TetherUS", ticker: "USDT", amount: "0.00", dollarValue: "$0.00", networkLabel: "Base", networkColor: "#0052FF" },
];

export function getRandomNetworks(): MockNetwork[] {
  const count = 1 + Math.floor(Math.random() * 10);
  const shuffled = [...ALL_NETWORKS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
