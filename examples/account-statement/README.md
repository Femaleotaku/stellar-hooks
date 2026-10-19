# Account statement

Choose a start and end date, then download the account's activity as a CSV file.
`StatementPage.tsx` combines `useOperations` with the history export helpers
(`normalizeOperation`, `filterHistory`, `historyToCsv`; `historyToJson` for JSON).
