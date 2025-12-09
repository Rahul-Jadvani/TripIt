import { http, createConfig } from 'wagmi';
import { mainnet, sepolia, baseSepolia, base, localhost } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

// Kaia Testnet (Kairos) configuration - Legacy 0xCert
const kaiaTestnet = {
  id: 1001,
  name: 'Kaia Testnet (Kairos)',
  nativeCurrency: { name: 'KAIA', symbol: 'KAIA', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://public-en-kairos.node.kaia.io'] },
  },
  blockExplorers: {
    default: { name: 'Kaia Testnet Explorer', url: 'https://kairos.kaiascan.io' },
  },
};

const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '00000000000000000000000000000000';

export const wagmiConfig = createConfig({
  chains: [
    baseSepolia,  // Primary for SBT system
    localhost,    // Hardhat local testing
    base,         // Base Mainnet (future)
    kaiaTestnet,  // Legacy 0xCert
    mainnet,
    sepolia,
  ],
  connectors: [
    injected(),
    ...(projectId !== '00000000000000000000000000000000'
      ? [walletConnect({ projectId })]
      : []
    ),
  ],
  transports: {
    [baseSepolia.id]: http('https://sepolia.base.org'),
    [base.id]: http('https://mainnet.base.org'),
    [localhost.id]: http('http://localhost:8545'),  // Hardhat local
    [kaiaTestnet.id]: http(import.meta.env.VITE_KAIA_KAIROS_RPC || 'https://public-en-kairos.node.kaia.io'),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
});
