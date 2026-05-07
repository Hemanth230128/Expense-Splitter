export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Group {
  id: string;
  name: string;
  members: User[];
  createdAt: string;
}

export interface ExpenseParticipant {
  userId: string;
  amount: number;
}

export interface Expense {
  id: string;
  groupId: string;
  description: string;
  amount: number;
  paidBy: string; // userId
  participants: ExpenseParticipant[];
  date: string;
}

export interface Settlement {
  id: string;
  groupId: string;
  from: string; // userId
  to: string; // userId
  amount: number;
  date: string;
}

export interface NetBalance {
  userId: string;
  userName: string;
  balance: number; // Positive means they are owed money, negative means they owe money
}

export interface SuggestedTransaction {
  from: string; // userId
  fromName: string;
  to: string; // userId
  toName: string;
  amount: number;
}