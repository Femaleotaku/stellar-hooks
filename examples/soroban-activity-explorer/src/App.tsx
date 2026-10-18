import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  StellarProvider,
  useContractEvents,
  useStellarContext,
  validateContractId,
} from "stellar-hooks";
import { scValToNative, xdr, rpc } from "@stellar/stellar-sdk";

type NetworkType = "testnet" | "futurenet" | "standalone";

interface InvocationRecord {
  id: string;
  hash: string;
  ledger: number;
  successful: boolean;
  createdAt: string;
  feeCharged: string;
  operationCount: number;
}

// Sample contract IDs for testnet / debugging
const PRESET_CONTRACTS = [
  {
    name: "Soroban Token (SAC)",
    id: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
  },
  {
    name: "Counter Example",
    id: "CA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVWAC",
  },
];

function formatScVal(val: any): string {
  try {
    if (typeof val === "string") {
      // Try to parse base64 XDR ScVal if needed
      try {
        const parsed = xdr.ScVal.fromXDR(val, "base64");
        return JSON.stringify(scValToNative(parsed), null, 2);
      } catch {
        return val;
      }
    }
    if (val && typeof val === "object") {
      return JSON.stringify(val, null, 2);
    }
    return String(val);
  } catch {
    return JSON.stringify(val, null, 2);
  }
}

function ActivityExplorerContent({
  network,
  onNetworkChange,
}: {
  network: NetworkType;
  onNetworkChange: (net: NetworkType) => void;
}) {
  const { config } = useStellarContext();
  const [contractId, setContractId] = useState(PRESET_CONTRACTS[0].id);
  const [activeTab, setActiveTab] = useState<"events" | "invocations">("events");
  const [eventTypeFilter, setEventTypeFilter] = useState<
    "all" | "contract" | "system" | "diagnostic"
  >("all");
  const [isLivePolling, setIsLivePolling] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [invocations, setInvocations] = useState<InvocationRecord[]>([]);
  const [loadingInvocations, setLoadingInvocations] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);

  // Validate contract ID
  const isValidContract = useMemo(() => {
    try {
      validateContractId(contractId);
      return true;
    } catch {
      return false;
    }
  }, [contractId]);

  // Soroban events via hook
  const {
    events,
    isLoading: loadingEvents,
    error: eventsError,
    refetch: refetchEvents,
  } = useContractEvents({
    contractId: isValidContract ? contractId : "",
    type: eventTypeFilter === "all" ? undefined : eventTypeFilter,
    refetchInterval: isLivePolling ? 4000 : 0,
    limit: 50,
  });

  // Fetch recent transactions/invocations for contract from Horizon
  const fetchInvocations = useCallback(async () => {
    if (!isValidContract) return;
    setLoadingInvocations(true);
    try {
      const serverUrl = config.horizonUrl;
      const res = await fetch(
        `${serverUrl}/accounts/${contractId}/transactions?order=desc&limit=20`
      );
      if (res.ok) {
        const data = await res.json();
        const records: InvocationRecord[] = (data._embedded?.records || []).map(
          (tx: any) => ({
            id: tx.id,
            hash: tx.hash,
            ledger: tx.ledger,
            successful: tx.successful,
            createdAt: tx.created_at,
            feeCharged: tx.fee_charged,
            operationCount: tx.operation_count,
          })
        );
        setInvocations(records);
      } else {
        // If not found in horizon account index, try Soroban RPC getLatestLedger
        setInvocations([]);
      }
    } catch {
      setInvocations([]);
    } finally {
      setLoadingInvocations(false);
    }
  }, [contractId, isValidContract, config.horizonUrl]);

  useEffect(() => {
    if (isValidContract) {
      fetchInvocations();
    }
  }, [isValidContract, fetchInvocations]);

  const handleContractChange = (val: string) => {
    const trimmed = val.trim();
    setContractId(trimmed);
    try {
      validateContractId(trimmed);
      setInputError(null);
    } catch (e: any) {
      if (trimmed.length > 0) {
        setInputError(e?.message || "Invalid Soroban Contract ID format");
      } else {
        setInputError(null);
      }
    }
  };

  const handleRefresh = () => {
    if (activeTab === "events") {
      refetchEvents();
    } else {
      fetchInvocations();
    }
  };

  // Filter events by search query
  const filteredEvents = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(
      (e) =>
        e.id.toLowerCase().includes(q) ||
        String(e.ledger).includes(q) ||
        JSON.stringify(e.topic).toLowerCase().includes(q) ||
        JSON.stringify(e.value).toLowerCase().includes(q)
    );
  }, [events, searchQuery]);

  // Filter invocations by search query
  const filteredInvocations = useMemo(() => {
    if (!searchQuery.trim()) return invocations;
    const q = searchQuery.toLowerCase();
    return invocations.filter(
      (i) => i.hash.toLowerCase().includes(q) || String(i.ledger).includes(q)
    );
  }, [invocations, searchQuery]);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-wrapper">
          <div className="brand-icon">⚡</div>
          <div>
            <h1 className="brand-title">Soroban Activity Explorer</h1>
            <p className="brand-subtitle">
              Inspect invocations and contract events for local and testnet debugging
            </p>
          </div>
        </div>

        <div className="network-badge-group">
          <label htmlFor="network-select" className="filter-label">
            Network:
          </label>
          <select
            id="network-select"
            className="network-select"
            value={network}
            onChange={(e) => onNetworkChange(e.target.value as NetworkType)}
          >
            <option value="testnet">Stellar Testnet</option>
            <option value="futurenet">Soroban Futurenet</option>
            <option value="standalone">Local Standalone (RPC :8000)</option>
          </select>
        </div>
      </header>

      {/* Control Card */}
      <section className="control-card">
        <div className="input-group">
          <div className="input-label">
            <span>Contract Address (C...)</span>
            <div className="preset-links">
              <span style={{ color: "var(--text-muted)", fontSize: "0.75rem" }}>
                Presets:
              </span>
              {PRESET_CONTRACTS.map((preset) => (
                <button
                  key={preset.id}
                  className="preset-btn"
                  onClick={() => handleContractChange(preset.id)}
                  type="button"
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
          <div className="input-row">
            <input
              type="text"
              className="text-input"
              placeholder="e.g. CA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVWAC"
              value={contractId}
              onChange={(e) => handleContractChange(e.target.value)}
            />
            <button
              className="btn"
              onClick={handleRefresh}
              disabled={!isValidContract || loadingEvents || loadingInvocations}
              type="button"
            >
              {loadingEvents || loadingInvocations ? "Fetching..." : "Refresh"}
            </button>
          </div>
          {inputError && (
            <span style={{ color: "var(--status-error)", fontSize: "0.8125rem", marginTop: "4px" }}>
              {inputError}
            </span>
          )}
        </div>

        {/* Filter bar */}
        <div className="filter-bar">
          <div className="filter-group">
            <span className="filter-label">Event Type:</span>
            {(["all", "contract", "system", "diagnostic"] as const).map((type) => (
              <button
                key={type}
                className={`chip ${eventTypeFilter === type ? "active" : ""}`}
                onClick={() => setEventTypeFilter(type)}
                type="button"
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>

          <div className="filter-group">
            <input
              type="text"
              className="text-input"
              style={{ padding: "0.35rem 0.75rem", fontSize: "0.8125rem", width: "180px" }}
              placeholder="Search topics / hashes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <button
              className={`chip ${isLivePolling ? "active" : ""}`}
              onClick={() => setIsLivePolling(!isLivePolling)}
              type="button"
            >
              {isLivePolling ? (
                <>
                  <span className="live-indicator" style={{ marginRight: "4px" }}></span>
                  Live Polling (4s)
                </>
              ) : (
                "Polling Paused"
              )}
            </button>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <nav className="tabs-nav">
        <button
          className={`tab-btn ${activeTab === "events" ? "active" : ""}`}
          onClick={() => setActiveTab("events")}
          type="button"
        >
          Contract Events
          <span className="tab-count">{filteredEvents.length}</span>
        </button>
        <button
          className={`tab-btn ${activeTab === "invocations" ? "active" : ""}`}
          onClick={() => setActiveTab("invocations")}
          type="button"
        >
          Recent Invocations
          <span className="tab-count">{filteredInvocations.length}</span>
        </button>
      </nav>

      {/* Tab 1: Contract Events */}
      {activeTab === "events" && (
        <section className="activity-list">
          {eventsError && (
            <div
              className="activity-card"
              style={{ borderColor: "var(--status-error)", backgroundColor: "var(--status-error-bg)" }}
            >
              <p style={{ color: "var(--status-error)", fontWeight: 600 }}>
                Error fetching events: {eventsError.message}
              </p>
            </div>
          )}

          {filteredEvents.length === 0 && !loadingEvents && (
            <div className="empty-state">
              <h3 className="empty-title">No Events Observed</h3>
              <p className="empty-desc">
                {isValidContract
                  ? "No contract events matching the current filter have been published in recent ledgers."
                  : "Enter a valid Soroban Contract ID (starting with 'C') to view its events."}
              </p>
            </div>
          )}

          {filteredEvents.map((evt) => (
            <div key={evt.id} className="activity-card">
              <div className="card-top">
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span
                    className={`pill ${
                      evt.type === "system"
                        ? "pill-system"
                        : evt.type === "diagnostic"
                        ? "pill-diagnostic"
                        : "pill-contract"
                    }`}
                  >
                    {evt.type}
                  </span>
                  <span className="meta-text">Ledger #{evt.ledger}</span>
                </div>
                <span className="meta-text" style={{ fontSize: "0.75rem" }}>
                  ID: {evt.id}
                </span>
              </div>

              <div>
                <span className="card-section-label">Topics (XDR / Decoded):</span>
                <pre className="code-block">{formatScVal(evt.topic)}</pre>
              </div>

              <div>
                <span className="card-section-label">Payload Value:</span>
                <pre className="code-block">{formatScVal(evt.value)}</pre>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Tab 2: Recent Invocations */}
      {activeTab === "invocations" && (
        <section className="activity-list">
          {filteredInvocations.length === 0 && !loadingInvocations && (
            <div className="empty-state">
              <h3 className="empty-title">No Recent Invocations Found</h3>
              <p className="empty-desc">
                No Horizon transaction history found for this contract ID. In local standalone
                development, ensure transactions have been submitted to the local ledger.
              </p>
            </div>
          )}

          {filteredInvocations.map((inv) => (
            <div key={inv.id} className="activity-card">
              <div className="card-top">
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <span className={`pill ${inv.successful ? "pill-success" : "pill-error"}`}>
                    {inv.successful ? "Success" : "Failed"}
                  </span>
                  <span className="meta-text">Ledger #{inv.ledger}</span>
                </div>
                <span className="meta-text">
                  {new Date(inv.createdAt).toLocaleTimeString()} · {inv.operationCount} ops
                </span>
              </div>

              <div>
                <span className="card-section-label">Transaction Hash:</span>
                <pre className="code-block">
                  {inv.hash}{" "}
                  {network === "testnet" && (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${inv.hash}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ color: "var(--accent-primary)", marginLeft: "8px" }}
                    >
                      [View on StellarExpert ↗]
                    </a>
                  )}
                </pre>
              </div>

              <div style={{ marginTop: "0.5rem", display: "flex", gap: "1rem" }}>
                <span className="meta-text">Fee charged: {inv.feeCharged} stroops</span>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

export default function App() {
  const [network, setNetwork] = useState<NetworkType>("testnet");

  // Config mapping for networks
  const customConfig = useMemo(() => {
    if (network === "standalone") {
      return {
        sorobanRpcUrl: "http://localhost:8000/soroban/rpc",
        horizonUrl: "http://localhost:8000",
      };
    }
    return undefined;
  }, [network]);

  return (
    <StellarProvider
      network={network === "standalone" ? "testnet" : network}
      customConfig={customConfig}
    >
      <ActivityExplorerContent network={network} onNetworkChange={setNetwork} />
    </StellarProvider>
  );
}
