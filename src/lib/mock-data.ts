import { User, Group, Expense, Settlement } from './types';

export const currentUser: User = {
  id: 'u1',
  name: 'Alex Johnson',
  email: 'alex@example.com'
};

export const mockUsers: User[] = [
  currentUser,
  { id: 'u2', name: 'Priya Sharma', email: 'priya@example.com' },
  { id: 'u3', name: 'Marcus Chen', email: 'marcus@example.com' },
  { id: 'u4', name: 'Sarah Miller', email: 'sarah@example.com' },
];

export const mockGroups: Group[] = [
  {
    id: 'g1',
    name: 'Vacation Crew 2024',
    members: [mockUsers[0], mockUsers[1], mockUsers[2]],
    createdAt: new Date().toISOString()
  },
  {
    id: 'g2',
    name: 'Housemates',
    members: [mockUsers[0], mockUsers[3]],
    createdAt: new Date().toISOString()
  }
];

export const mockExpenses: Expense[] = [
  {
    id: 'e1',
    groupId: 'g1',
    description: 'Groceries',
    amount: 120,
    paidBy: 'u1',
    participants: [
      { userId: 'u1', amount: 40 },
      { userId: 'u2', amount: 40 },
      { userId: 'u3', amount: 40 },
    ],
    date: '2024-03-20T10:00:00Z'
  },
  {
    id: 'e2',
    groupId: 'g1',
    description: 'Car Rental',
    amount: 300,
    paidBy: 'u2',
    participants: [
      { userId: 'u1', amount: 100 },
      { userId: 'u2', amount: 100 },
      { userId: 'u3', amount: 100 },
    ],
    date: '2024-03-21T15:00:00Z'
  }
];

export const mockSettlements: Settlement[] = [];