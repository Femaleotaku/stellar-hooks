import { useState } from "react";
import { filterHistory, historyToCsv, normalizeOperation, useOperations } from "stellar-hooks";

/** Pick a date range, then download the account's activity as CSV. */
export function StatementPage({ publicKey }: { publicKey: string }) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const { operations, isLoading } = useOperations({ accountId: publicKey, limit: 200 });

  const download = () => {
    const rows = filterHistory(operations.map(normalizeOperation), {
      startDate: start || undefined,
      endDate: end || undefined,
    });
    const url = URL.createObjectURL(new Blob([historyToCsv(rows)], { type: "text/csv" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `statement-${publicKey.slice(0, 6)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <label>From <input type="date" value={start} onChange={(e) => setStart(e.target.value)} /></label>
      <label>To <input type="date" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
      <button onClick={download} disabled={isLoading}>Download CSV</button>
    </div>
  );
}
