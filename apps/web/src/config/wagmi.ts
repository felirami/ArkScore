import { createConfig, http, injected } from "wagmi";
import { avalancheFuji } from "./chains";

export const wagmiConfig = createConfig({
  chains: [avalancheFuji],
  connectors: [injected()],
  transports: {
    [avalancheFuji.id]: http(
      process.env.NEXT_PUBLIC_AVALANCHE_FUJI_RPC_URL ??
        "https://api.avax-test.network/ext/bc/C/rpc"
    )
  }
});

declare module "wagmi" {
  interface Register {
    config: typeof wagmiConfig;
  }
}
