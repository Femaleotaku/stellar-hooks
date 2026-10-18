import { useState, useCallback } from 'react';
import { SorobanRpc, Server, xdr } from 'soroban-client';
import { Contract } from 'stellar-sdk';

interface OracleHistoryRecord {
  ledger: number;
  price: string;
  timestamp: number;
}

interface UseOracleHistoryOptions {
  contractId: string;
  startLedger?: number;
  endLedger?: number;
  pageSize?: number;
  rpcUrl?: string;
}

/**
 * Hook to fetch historical price records from a Soroban oracle contract.
 * It pages through the contract's `price_history` method.
 *
 * @param options - Oracle contract address and pagination options
 *
 * @example
 * ```tsx
 * const { records, loading, error, fetchPage, hasMore } = useOracleHistory({
 *   contractId: "CA7QY...",
 *   pageSize: 50,
 * });
 *
 * return (
 *   <div>
 *     <h3>Oracle Price History</h3>
 *     {records.map(r => (
 *       <div key={r.ledger}>Ledger {r.ledger}: {r.price}</div>
 *     ))}
 *     {hasMore && <button onClick={fetchPage} disabled={loading}>Load More</button>}
 *   </div>
 * );
 * ```
 *
 * @see [Soroban Contracts Guide](/guide/soroban)
 */
export function useOracleHistory({
  contractId,
  startLedger,
  endLedger,
  pageSize = 100,
  rpcUrl = 'https://rpc.stellar.org',
}: UseOracleHistoryOptions) {
  const [records, setRecords] = useState<OracleHistoryRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [cursor, setCursor] = useState<number | null>(startLedger ?? null);
  const server = new Server(rpcUrl);

  const fetchPage = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const args = [
        contractId,
        cursor ?? 0,
        pageSize,
        endLedger ?? 0,
      ];
      // Assuming the contract exposes a method `price_history` that returns
      // an array of (ledger, price, timestamp) tuples.
      const response = await server.callContractFunction('price_history', ...args);
      // The response format depends on the contract; adapt as needed.
      const fetched: OracleHistoryRecord[] = (response as any).map(
        ([ledger, price, timestamp]: [number, string, number]) => ({
          ledger,
          price,
          timestamp,
        })
      );
      setRecords(prev => [...prev, ...fetched]);
      if (fetched.length < pageSize) {
        // No more data.
        setCursor(null);
      } else {
        const lastLedger = fetched[fetched.length - 1].ledger;
        setCursor(lastLedger + 1);
      }
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [contractId, cursor, pageSize, endLedger, rpcUrl, loading]);

  // Initial load
  useCallback(() => {
    if (records.length === 0 && cursor !== null) {
      fetchPage();
    }
  }, [records, cursor, fetchPage])();

  return {
    records,
    loading,
    error,
    fetchNextPage: fetchPage,
    hasMore: cursor !== null,
  };
}
