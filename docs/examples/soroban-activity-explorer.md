# Soroban Contract Activity Explorer

Example app listing recent invocations and events for a given contract ID, aimed at contract developers debugging locally.

## Features

- **Event Monitoring**: Inspect real-time Soroban contract events using `useContractEvents`
- **Invocation & Transaction History**: View recent invocations, status, fees, and ledger sequences
- **Local & Testnet Debugging**: Seamlessly switch between local standalone network, testnet, and futurenet
- **Decoded Topics & Values**: Inspect decoded XDR topics and return values
- **Live Polling**: Configurable polling intervals for monitoring local contract testing

## Code Example

```tsx
import { useState } from 'react'
import { StellarProvider, useContractEvents } from 'stellar-hooks'

function ContractActivityExplorer() {
  const [contractId, setContractId] = useState('CA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVWAC')
  const [filterType, setFilterType] = useState<'all' | 'contract' | 'system' | 'diagnostic'>('contract')
  
  const { events, isLoading, error, refetch } = useContractEvents({
    contractId,
    type: filterType === 'all' ? undefined : filterType,
    refetchInterval: 3000,
  })

  return (
    <div className="activity-explorer">
      <div className="explorer-header">
        <input
          type="text"
          value={contractId}
          onChange={(e) => setContractId(e.target.value)}
          placeholder="Contract ID (C...)"
        />
        <select value={filterType} onChange={(e: any) => setFilterType(e.target.value)}>
          <option value="all">All Events</option>
          <option value="contract">Contract</option>
          <option value="system">System</option>
          <option value="diagnostic">Diagnostic</option>
        </select>
        <button onClick={refetch} disabled={isLoading}>
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="events-list">
        {events.length === 0 ? (
          <p>No recent events found for this contract.</p>
        ) : (
          events.map((event) => (
            <div key={event.id} className="event-card">
              <div className="event-meta">
                <span className="badge">Ledger #{event.ledger}</span>
                <span className="badge-type">{event.type}</span>
              </div>
              <pre className="event-topics">
                Topics: {JSON.stringify(event.topic)}
              </pre>
              <pre className="event-value">
                Value: {JSON.stringify(event.value)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function App() {
  return (
    <StellarProvider network="testnet">
      <ContractActivityExplorer />
    </StellarProvider>
  )
}
```

## Running the Example App

You can run the full example app locally:

```bash
cd examples/soroban-activity-explorer
npm install
npm run dev
```

## Related

- [useContractEvents](/hooks/use-contract-events) - Contract events polling hook
- [useSorobanContract](/hooks/use-soroban-contract) - Contract call and invoke hook
- [Soroban Guide](/guide/soroban) - Soroban development guide
