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
  groupMembers: z.array(z.string()).describe('A list of all possible group members involved in the expense.'),
  currentUserName: z.string().describe('The name of the user who is currently speaking or typing the input.'),
});
export type NaturalLanguageExpenseInput = z.infer<typeof NaturalLanguageExpenseInputSchema>;

const NaturalLanguageExpenseOutputSchema = z.object({
  description: z.string().describe('A concise description of the expense.'),
  amount: z.number().describe('The total amount of the expense.'),
  paidBy: z.string().describe('The name of the group member who paid for the expense.'),
  participants: z.array(z.string()).describe('A list of all group members involved in this expense.'),
  customSplits: z.array(z.object({
    member: z.string().describe('The name of the group member.'),
    amount: z.number().describe('The custom amount this member owes for the expense.'),
  })).optional().describe('Optional: An array of custom amounts owed by specific members.'),
}).describe('Parsed expense details from natural language input.');
export type NaturalLanguageExpenseOutput = z.infer<typeof NaturalLanguageExpenseOutputSchema>;

export async function parseNaturalLanguageExpense(input: NaturalLanguageExpenseInput): Promise<NaturalLanguageExpenseOutput> {
  return naturalLanguageExpenseFlow(input);
}

const naturalLanguageExpensePrompt = ai.definePrompt({
  name: 'naturalLanguageExpensePrompt',
  input: {schema: NaturalLanguageExpenseInputSchema},
  output: {schema: NaturalLanguageExpenseOutputSchema},
  prompt: `You are an AI assistant specialized in parsing natural language expense descriptions into structured JSON.

Context:
- Known group members: {{#each groupMembers}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}.
- The speaker ("I", "me", "my", "myself") is: {{{currentUserName}}}.

Instructions:
1. Extract the 'description' of the expense.
2. Identify the 'amount' paid.
3. Determine who 'paidBy' the expense. If the user says "I", "me", or "myself", use "{{{currentUserName}}}".
4. List all 'participants' involved. If the user says "everyone" or "all", include all group members. If the user says "and myself" or implies they were part of it, include "{{{currentUserName}}}".
5. Use only names from the known group members list.
6. If custom splits are mentioned (e.g., 'Alice owes $10'), include them in 'customSplits'.

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
