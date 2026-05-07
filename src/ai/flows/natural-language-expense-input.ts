'use server';
/**
 * @fileOverview This file implements a Genkit flow for parsing natural language expense descriptions.
 *
 * - parseNaturalLanguageExpense - A function that parses a natural language expense string.
 * - NaturalLanguageExpenseInput - The input type for the parseNaturalLanguageExpense function.
 * - NaturalLanguageExpenseOutput - The return type for the parseNaturalLanguageExpense function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const NaturalLanguageExpenseInputSchema = z.object({
  expenseString: z.string().describe('The natural language description of an expense. Example: "Bob paid $50 for dinner for Alice, Charlie, and himself."'),
  groupMembers: z.array(z.string()).describe('A list of all possible group members involved in the expense. This helps in identifying participants from the expense string.'),
});
export type NaturalLanguageExpenseInput = z.infer<typeof NaturalLanguageExpenseInputSchema>;

const NaturalLanguageExpenseOutputSchema = z.object({
  description: z.string().describe('A concise description of the expense.'),
  amount: z.number().describe('The total amount of the expense.'),
  paidBy: z.string().describe('The name of the group member who paid for the expense.'),
  participants: z.array(z.string()).describe('A list of all group members involved in this expense, identified from the provided groupMembers list.'),
  customSplits: z.array(z.object({
    member: z.string().describe('The name of the group member.'),
    amount: z.number().describe('The custom amount this member owes for the expense.'),
  })).optional().describe('Optional: An array of custom amounts owed by specific members. If not provided, assume an equal split among participants.'),
}).describe('Parsed expense details from natural language input.');
export type NaturalLanguageExpenseOutput = z.infer<typeof NaturalLanguageExpenseOutputSchema>;

export async function parseNaturalLanguageExpense(input: NaturalLanguageExpenseInput): Promise<NaturalLanguageExpenseOutput> {
  return naturalLanguageExpenseFlow(input);
}

const naturalLanguageExpensePrompt = ai.definePrompt({
  name: 'naturalLanguageExpensePrompt',
  input: {schema: NaturalLanguageExpenseInputSchema},
  output: {schema: NaturalLanguageExpenseOutputSchema},
  prompt: `You are an AI assistant specialized in parsing natural language expense descriptions.
Your goal is to extract key details from a given expense string and format them into a structured JSON object.

Here is a list of known group members: {{{groupMembers}}}.
Use this list to accurately identify 'paidBy' and 'participants'. If a name is mentioned in the expense string but not in this list, do not include it in the 'paidBy' or 'participants' array.

Instructions:
1. Extract the 'description' of the expense.
2. Identify the 'amount' paid.
3. Determine who 'paidBy' the expense.
4. List all 'participants' involved in the expense. If the expense mentions 'everyone' or 'all', assume all groupMembers are participants.
5. If custom splits are explicitly mentioned (e.g., 'Alice owes $10', 'Bob pays $20'), parse them into 'customSplits' array. If no custom splits are mentioned, omit the 'customSplits' field, implying an equal split among participants.

Example 1:
Expense String: "Bob paid $50 for dinner for Alice, Charlie, and himself."
Group Members: ["Alice", "Bob", "Charlie", "David"]
Output: {"description": "dinner", "amount": 50, "paidBy": "Bob", "participants": ["Alice", "Bob", "Charlie"]}

Example 2:
Expense String: "Alice bought groceries for $100 for herself, Bob, and Charlie. Bob owes an extra $10."
Group Members: ["Alice", "Bob", "Charlie", "David"]
Output: {"description": "groceries", "amount": 100, "paidBy": "Alice", "participants": ["Alice", "Bob", "Charlie"], "customSplits": [{"member": "Bob", "amount": 10}]}

Example 3:
Expense String: "David paid $70 for the internet bill. Eve owes $20, Frank owes $30."
Group Members: ["David", "Eve", "Frank", "Grace"]
Output: {"description": "internet bill", "amount": 70, "paidBy": "David", "participants": ["David", "Eve", "Frank"], "customSplits": [{"member": "Eve", "amount": 20}, {"member": "Frank", "amount": 30}]}

Expense String: {{{expenseString}}}
`,
});

const naturalLanguageExpenseFlow = ai.defineFlow(
  {
    name: 'naturalLanguageExpenseFlow',
    inputSchema: NaturalLanguageExpenseInputSchema,
    outputSchema: NaturalLanguageExpenseOutputSchema,
  },
  async (input) => {
    const {output} = await naturalLanguageExpensePrompt(input);
    if (!output) {
      throw new Error('Failed to parse natural language expense.');
    }
    return output;
  }
);
