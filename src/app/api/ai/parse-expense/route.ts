import { NextResponse } from 'next/server';
import { z } from 'zod';
import { parseNaturalLanguageExpense } from '@/ai/flows/natural-language-expense-input';

const ParseExpenseRequestSchema = z.object({
  expenseString: z.string().min(1, 'Expense description is required.'),
  groupMembers: z.array(z.string()).min(1, 'At least one group member is required.'),
  currentUserName: z.string().min(1, 'Current user name is required.'),
});

type ParseExpenseInput = z.infer<typeof ParseExpenseRequestSchema>;

const normalize = (value: string) => value.toLowerCase().trim();

const extractAmount = (text: string): number => {
  const match = text.match(/(?:rs\.?|inr|\$)?\s*(\d+(?:\.\d+)?)/i);
  return match ? Number(match[1]) : 0;
};

const extractDescription = (text: string): string => {
  const cleaned = text
    .replace(/i\s+(have\s+)?paid\s+(?:rs\.?|inr|\$)?\s*\d+(?:\.\d+)?/i, '')
    .replace(/\s+for\s+[a-z0-9 ,&]+$/i, '')
    .trim();
  return cleaned || 'Expense';
};

const inferPaidBy = (input: ParseExpenseInput): string => {
  const text = normalize(input.expenseString);
  if (/\b(i|me|myself)\b/.test(text)) return input.currentUserName;

  const memberMatch = input.groupMembers.find((m) => text.includes(normalize(m)));
  return memberMatch || input.currentUserName;
};

const inferParticipants = (input: ParseExpenseInput): string[] => {
  const text = normalize(input.expenseString);
  if (/\b(all|everyone|everybody)\b/.test(text)) return input.groupMembers;

  const matched = input.groupMembers.filter((m) => text.includes(normalize(m)));
  if (matched.length > 0) return matched;
  return [input.currentUserName];
};

const fallbackParseExpense = (input: ParseExpenseInput) => {
  const amount = extractAmount(input.expenseString);
  const participants = inferParticipants(input);
  return {
    description: extractDescription(input.expenseString),
    amount: amount > 0 ? amount : 0,
    paidBy: inferPaidBy(input),
    participants,
    customSplits: participants.map((member) => ({
      member,
      amount: amount > 0 ? Number((amount / participants.length).toFixed(2)) : 0,
    })),
  };
};

export async function POST(request: Request) {
  try {
    const headerApiKey = request.headers.get('x-gemini-api-key')?.trim();
    const apiKey =
      process.env.GOOGLE_API_KEY ||
      process.env.GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GOOGLE_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      headerApiKey;
    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            'Missing Gemini API key. Add GOOGLE_API_KEY (or GEMINI_API_KEY) to .env.local and restart the dev server.',
        },
        { status: 500 }
      );
    }
    // Genkit Google plugin reads GOOGLE_API_KEY; map GEMINI_API_KEY for compatibility.
    process.env.GOOGLE_API_KEY = apiKey;

    const body = await request.json();
    const parsed = ParseExpenseRequestSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Invalid request payload.' },
        { status: 400 }
      );
    }

    let data;
    try {
      data = await parseNaturalLanguageExpense(parsed.data);
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      const isQuotaError =
        message.includes('429') ||
        message.toLowerCase().includes('quota') ||
        message.toLowerCase().includes('resource_exhausted');
      if (!isQuotaError) throw error;

      // Fallback for free-tier quota/rate-limit windows so user flow keeps working.
      data = fallbackParseExpense(parsed.data);
    }

    return NextResponse.json({ data });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to parse natural language expense.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
