"use client";

import { LogOut, Wallet } from "lucide-react";
import { useConnection, useConnect, useConnectors, useDisconnect } from "wagmi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function WalletConnector() {
  const { address, chainId, isConnected } = useConnection();
  const { connect, isPending } = useConnect();
  const connectors = useConnectors();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={chainId === 43113 ? "success" : "warning"}>
          {chainId === 43113 ? "Fuji connected" : `Chain ${chainId}`}
        </Badge>
        <div className="rounded-lg border border-[var(--border)] bg-[var(--panel)] px-3 py-2 font-mono text-xs">
          {shortAddress(address)}
        </div>
        <Button variant="secondary" onClick={() => disconnect()}>
          <LogOut size={16} aria-hidden="true" />
          Disconnect
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {connectors.map((connector) => (
        <Button
          key={connector.uid}
          onClick={() => connect({ connector })}
          disabled={isPending}
        >
          <Wallet size={16} aria-hidden="true" />
          {connector.name}
        </Button>
      ))}
    </div>
  );
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
