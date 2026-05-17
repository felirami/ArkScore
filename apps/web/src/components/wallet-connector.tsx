"use client";

import { LogOut, Wallet } from "lucide-react";
import { useConnection, useConnect, useConnectors, useDisconnect } from "wagmi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { pick, useLanguage } from "@/lib/language";

export function WalletConnector() {
  const { language } = useLanguage();
  const { address, chainId, isConnected } = useConnection();
  const { connect, isPending } = useConnect();
  const connectors = useConnectors();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={chainId === 43113 ? "success" : "warning"}>
          {chainId === 43113
            ? pick(language, "Fuji conectado", "Fuji connected")
            : pick(language, `Red ${chainId}`, `Chain ${chainId}`)}
        </Badge>
        <div className="rounded-full border border-[var(--border)] bg-[var(--panel-raised)] px-3 py-2 font-mono text-xs text-[var(--foreground)]">
          {shortAddress(address)}
        </div>
        <Button variant="secondary" onClick={() => disconnect()}>
          <LogOut size={16} aria-hidden="true" />
          {pick(language, "Desconectar", "Disconnect")}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {connectors.map((connector) => (
        <Button
          key={connector.uid}
          onClick={() => connect({ connector })}
          disabled={isPending}
          className="h-12 px-5"
        >
          <Wallet size={16} aria-hidden="true" />
          <span className="hidden sm:inline">
            {pick(language, "Conectar wallet", "Connect wallet")}
          </span>
        </Button>
      ))}
    </div>
  );
}

function shortAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
