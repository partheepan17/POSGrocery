export type StatementLine = { at: string; description: string; amount: number };

export function formatStatement(customerName: string, lines: StatementLine[]) {
  const header = `STATEMENT\nCustomer: ${customerName}`;
  const body = lines.map(l => `${new Date(l.at).toISOString().slice(0,10)}  ${l.description}\n  ${l.amount.toFixed(2)}`).join('\n');
  const balance = lines.reduce((s, l) => s + Number(l.amount || 0), 0);
  return `${header}\n${body}\nBALANCE: ${balance.toFixed(2)}`;
}










