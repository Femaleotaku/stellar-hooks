import React from "react";
import {
  StellarProvider,
  useFreighter,
  useStellarAccount,
  useStellarBalance,
} from "stellar-hooks";
import { BalanceHistoryChart } from "./components/BalanceHistoryChart";

function ConnectionIndicator({ isConnected }: { isConnected: boolean }) {
  return (
    <span
      className={`connection-indicator ${isConnected ? "connected" : ""}`}
      title={isConnected ? "Wallet connected" : "Wallet disconnected"}
    />
  );
}

function PortfolioHeader() {
  const { isConnected, publicKey, isLoading, connect, disconnect } = useFreighter();

  return (
    <header className="portfolio-header card">
      <div className="header-brand">
        <div className="brand-logo">✦</div>
        <div>
          <h1>Stellar Portfolio</h1>
          <p className="brand-subtitle">Asset holdings & balance history visualization</p>
        </div>
      </div>

      <div className="header-actions">
        <div className="wallet-status">
          <ConnectionIndicator isConnected={isConnected} />
          <span className="status-text">
            {isLoading ? "Connecting..." : isConnected ? "Freighter Connected" : "Wallet Disconnected"}
          </span>
        </div>

        {isConnected && publicKey ? (
          <div className="connected-badge">
            <code className="public-key">{`${publicKey.slice(0, 6)}...${publicKey.slice(-6)}`}</code>
            <button className="button button-danger-sm" onClick={disconnect}>
              Disconnect
            </button>
          </div>
        ) : (
          <button className="button button-primary" onClick={connect} disabled={isLoading}>
            Connect Freighter
          </button>
        )}
      </div>
    </header>
  );
}

function PortfolioOverview({ publicKey }: { publicKey: string }) {
  const { xlmBalance, isLoading: balanceLoading } = useStellarBalance(publicKey);
  const { account, isLoading: accountLoading } = useStellarAccount(publicKey);

  return (
    <div className="portfolio-grid">
      <div className="card overview-card">
        <h3>Total Portfolio Value</h3>
        {balanceLoading ? (
          <div className="skeleton skeleton-text large" style={{ width: "60%" }} />
        ) : (
          <div className="balance-highlight">
            <span className="amount">{xlmBalance?.balance || "0.00"}</span>
            <span className="currency">XLM</span>
          </div>
        )}
        <p className="overview-meta">
          Last modified ledger: {account?.lastModifiedLedger ?? "—"}
        </p>
      </div>

      <div className="card overview-card">
        <h3>Account Sequence</h3>
        {accountLoading ? (
          <div className="skeleton skeleton-text" style={{ width: "50%" }} />
        ) : (
          <div className="sequence-highlight">{account?.sequence ?? "—"}</div>
        )}
        <p className="overview-meta">Subentry count: {account?.subentryCount ?? 0}</p>
      </div>

      <div className="card overview-card">
        <h3>Network & Status</h3>
        <div className="network-highlight">Stellar Testnet</div>
        <p className="overview-meta">
          Low: {account?.thresholds.lowThreshold ?? 0} / Med: {account?.thresholds.medThreshold ?? 0} / High:{" "}
          {account?.thresholds.highThreshold ?? 0}
        </p>
      </div>
    </div>
  );
}

function PortfolioDashboard() {
  const { isConnected, publicKey } = useFreighter();
  const { xlmBalance } = useStellarBalance(publicKey || "");

  if (!isConnected) {
    return (
      <div className="container">
        <PortfolioHeader />
        <div className="card welcome-card">
          <h2>Welcome to Stellar Portfolio</h2>
          <p>Connect your wallet to analyze your asset balances and track historical performance.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <PortfolioHeader />
      {publicKey && (
        <>
          <PortfolioOverview publicKey={publicKey} />
          <BalanceHistoryChart currentBalance={xlmBalance?.balance} publicKey={publicKey} />
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <StellarProvider network="testnet">
      <PortfolioDashboard />
    </StellarProvider>
  );
}
