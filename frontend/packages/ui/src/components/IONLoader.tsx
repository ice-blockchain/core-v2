import type { IONLoaderProps } from "./IONLoaderTypes";

export function IONLoader(_props: IONLoaderProps): React.ReactElement {
  throw new Error(
    "IONLoader: platform implementation not resolved. " +
      "Bundler should resolve .native.tsx or .web.tsx instead.",
  );
}
