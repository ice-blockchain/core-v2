import type { SaveSelectedLanguagesInput } from "./types";

// TODO: replace with real API call
export async function saveSelectedLanguages(input: SaveSelectedLanguagesInput): Promise<void> {
  void input;
  await new Promise((resolve) => setTimeout(resolve, 300));
}
