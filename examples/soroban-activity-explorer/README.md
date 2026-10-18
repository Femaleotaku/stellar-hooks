# Soroban Contract Activity Explorer

A developer tool and example app for monitoring recent Soroban smart contract events and invocations.

Built with **`stellar-hooks`** and **React + Vite**.

## Features

- **Contract Event Stream**: Live polling of Soroban contract events using `useContractEvents`.
- **Event Filter**: Filter events by event type (`contract`, `system`, `diagnostic`, or `all`).
- **Decoded Topics & Payloads**: Automatically parses and formats ScVal topics and payload values.
- **Recent Invocations**: Track recent transactions and execution statuses for the target contract.
- **Multi-network Debugging**: Supports Stellar Testnet, Futurenet, and local Standalone environments (`http://localhost:8000/soroban/rpc`).
- **Presets & Search**: Includes standard contract presets and topic search filtering.

## Quick Start

### 1. Install dependencies

```bash
cd examples/soroban-activity-explorer
npm install
```

### 2. Run the development server

```bash
npm run dev
```

Open `http://localhost:3002` in your browser.

## How It Works

### Provider Setup

The app wraps the explorer in `StellarProvider` with dynamic network and RPC configuration:

```tsx
<StellarProvider
  network={network === "standalone" ? "testnet" : network}
  customConfig={customConfig}
>
  <ActivityExplorerContent />
</StellarProvider>
```

### Polling Contract Events

The `useContractEvents` hook continuously queries the Soroban RPC endpoint for newly emitted events:

```tsx
const { events, isLoading, error, refetch } = useContractEvents({
  contractId,
  type: eventTypeFilter === "all" ? undefined : eventTypeFilter,
  refetchInterval: isLivePolling ? 4000 : 0,
  limit: 50,
});
```

## License

MIT
