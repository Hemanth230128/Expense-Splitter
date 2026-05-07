import { NetBalance, SuggestedTransaction } from './types';

export function calculateSimplifiedDebts(balances: NetBalance[]): SuggestedTransaction[] {
  // Filter out zero balances
  const creditors = balances
    .filter((b) => b.balance > 0.01)
    .sort((a, b) => b.balance - a.balance);
  const debtors = balances
    .filter((b) => b.balance < -0.01)
    .sort((a, b) => a.balance - b.balance);

  const transactions: SuggestedTransaction[] = [];
  
  let creditorIdx = 0;
  let debtorIdx = 0;

  // Clone to avoid mutating original objects if they were passed by ref
  const cBalances = creditors.map(c => ({ ...c }));
  const dBalances = debtors.map(d => ({ ...d }));

  while (creditorIdx < cBalances.length && debtorIdx < dBalances.length) {
    const creditor = cBalances[creditorIdx];
    const debtor = dBalances[debtorIdx];
    
    const amount = Math.min(creditor.balance, Math.abs(debtor.balance));
    
    transactions.push({
      from: debtor.userId,
      fromName: debtor.userName,
      to: creditor.userId,
      toName: creditor.userName,
      amount: Number(amount.toFixed(2))
    });

    creditor.balance -= amount;
    debtor.balance += amount;

    if (Math.abs(creditor.balance) < 0.01) creditorIdx++;
    if (Math.abs(debtor.balance) < 0.01) debtorIdx++;
  }

  return transactions;
}

export function getGroupBalances(members: any[], expenses: any[], settlements: any[]): NetBalance[] {
  const balanceMap = new Map<string, number>();
  
  members.forEach(m => balanceMap.set(m.id, 0));

  expenses.forEach(exp => {
    // Payer is owed the total minus their own share
    const payerBalance = balanceMap.get(exp.paidBy) || 0;
    balanceMap.set(exp.paidBy, payerBalance + exp.amount);

    // Participants owe their share
    exp.participants.forEach((p: any) => {
      const current = balanceMap.get(p.userId) || 0;
      balanceMap.set(p.userId, current - p.amount);
    });
  });

  settlements.forEach(set => {
    // 'From' paid 'To', so 'From' is less in debt, 'To' is less owed
    const fromBal = balanceMap.get(set.from) || 0;
    balanceMap.set(set.from, fromBal + set.amount);

    const toBal = balanceMap.get(set.to) || 0;
    balanceMap.set(set.to, toBal - set.amount);
  });

  return Array.from(balanceMap.entries()).map(([userId, balance]) => ({
    userId,
    userName: members.find(m => m.id === userId)?.name || 'Unknown',
    balance: Number(balance.toFixed(2))
  }));
}