import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { Button } from '@/components/ui/button';
import { Wallet, AlertCircle } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';

export function ConnectWallet() {
  const { address, isConnected } = useAccount();
  const { connect, connectors, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  // Check if there are any available connectors
  const hasConnectors = connectors && connectors.length > 0;
  const injectedConnector = connectors?.find((c) => c.name === 'Injected');
  const otherConnectors = connectors?.filter((c) => c.name !== 'Injected') || [];

  if (!isConnected) {
    // No connectors available
    if (!hasConnectors) {
      return (
        <Button
          disabled
          variant="outline"
          className="gap-2"
          title="No wallet extension detected. Install MetaMask or another Web3 wallet."
        >
          <AlertCircle className="h-4 w-4" />
          <span className="hidden sm:inline">No Wallet</span>
        </Button>
      );
    }

    // Single connector - show as button
    if (connectors.length === 1) {
      return (
        <Button
          onClick={() => connect({ connector: connectors[0] })}
          disabled={isPending}
          variant="outline"
          className="gap-2"
        >
          <Wallet className="h-4 w-4" />
          {isPending ? 'Connecting...' : `Connect ${connectors[0].name}`}
        </Button>
      );
    }

    // Multiple connectors - show dropdown menu
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2">
            <Wallet className="h-4 w-4" />
            <span className="hidden sm:inline">Connect Wallet</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {injectedConnector && (
            <>
              <DropdownMenuItem
                onClick={() => connect({ connector: injectedConnector })}
                disabled={isPending}
                className="cursor-pointer"
              >
                {isPending ? 'Connecting...' : injectedConnector.name}
              </DropdownMenuItem>
              {otherConnectors.length > 0 && <DropdownMenuSeparator />}
            </>
          )}
          {otherConnectors.map((connector) => (
            <DropdownMenuItem
              key={connector.uid}
              onClick={() => connect({ connector })}
              disabled={isPending}
              className="cursor-pointer"
            >
              {isPending ? 'Connecting...' : connector.name}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Connected state
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-lg border border-border bg-secondary/50 px-3 py-2">
        <p className="text-sm font-medium">
          {address?.slice(0, 6)}...{address?.slice(-4)}
        </p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => disconnect()}
      >
        Disconnect
      </Button>
    </div>
  );
}
