"use client";

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BrainCircuit, Loader2, Wand2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser } from '@/firebase';
import { collection, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

interface AIExpenseFormProps {
  group: any;
  members: any[];
}

interface ParsedExpense {
  description: string;
  amount: number;
  paidBy: string;
  participants: string[];
  customSplits?: Array<{ member: string; amount: number }>;
}

const normalizeName = (value: string) => value.trim().toLowerCase();
const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const deriveDescriptionFromInput = (text: string): string => {
  const normalized = text.trim();
  const forMatch = normalized.match(/\bfor\s+([^,.]+)(?:\s+for\s+|\s+split\s+|\s+among\s+|\s+between\s+|$)/i);
  if (forMatch?.[1]) {
    const candidate = forMatch[1].trim();
    if (candidate.length >= 2) return candidate;
  }

  const cleaned = normalized
    .replace(/\b(i|we)\s+(have\s+)?(paid|spent)\b/i, '')
    .replace(/(?:rs\.?|inr|\$)\s*\d+(?:\.\d+)?/ig, '')
    .replace(/\b(split|among|between|for|with|and)\b.*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();

  return cleaned.length > 1 ? cleaned : 'Expense';
};

const parseCustomSplitsFromText = (
  rawInput: string,
  members: any[]
): Map<string, number> => {
  const splitMap = new Map<string, number>();

  for (const member of members) {
    const nickname = (member.nickname || '').trim();
    if (!nickname) continue;
    const escaped = escapeRegExp(nickname);

    const patterns = [
      // "$80 for test1"
      new RegExp(`(?:rs\\.?|inr|\\$)\\s*(\\d+(?:\\.\\d+)?)\\s*(?:for|to|by)?\\s*${escaped}\\b`, 'ig'),
      // "test1 owes $80" / "test1 paid 80"
      new RegExp(`${escaped}\\b\\s*(?:owes|pays|paid)\\s*(?:rs\\.?|inr|\\$)?\\s*(\\d+(?:\\.\\d+)?)`, 'ig'),
      // "test1: 80" / "test1 = 80"
      new RegExp(`${escaped}\\b\\s*[:=-]\\s*(?:rs\\.?|inr|\\$)?\\s*(\\d+(?:\\.\\d+)?)`, 'ig'),
    ];

    for (const pattern of patterns) {
      let match: RegExpExecArray | null = null;
      while ((match = pattern.exec(rawInput)) !== null) {
        const amount = Number(match[1]);
        if (Number.isFinite(amount) && amount >= 0) {
          splitMap.set(member.userId, amount);
        }
      }
    }
  }

  return splitMap;
};

export function AIExpenseForm({ group, members }: AIExpenseFormProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [savedApiKey, setSavedApiKey] = useState('');
  const [showApiKeySetup, setShowApiKeySetup] = useState(true);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const db = useFirestore();
  const { user } = useUser();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const existingKey = localStorage.getItem('gemini_api_key') || '';
    setSavedApiKey(existingKey);
    setApiKeyInput(existingKey);
    setShowApiKeySetup(!existingKey);
  }, []);

  const handleSaveApiKey = () => {
    const key = apiKeyInput.trim();
    if (!key) {
      toast({
        variant: 'destructive',
        title: 'API key required',
        description: 'Paste your Gemini API key, then click Save Key.'
      });
      return;
    }
    localStorage.setItem('gemini_api_key', key);
    setSavedApiKey(key);
    setShowApiKeySetup(false);
    toast({ title: 'API key saved', description: 'Quick AI Add is now ready to use.' });
  };

  const handleEditApiKey = () => {
    setShowApiKeySetup(true);
  };

  const handleAIParse = async () => {
    if (!input || !db || !user) return;
    setLoading(true);
    try {
      const currentUserMember = members.find(m => m.userId === user.uid);
      const currentUserName = currentUserMember?.nickname || user.displayName || 'Me';

      const localApiKey = (typeof window !== 'undefined' ? localStorage.getItem('gemini_api_key') : '') || '';
      if (!localApiKey) {
        throw new Error('Please save your Gemini API key once in the field above.');
      }

      const response = await fetch('/api/ai/parse-expense', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(localApiKey ? { 'x-gemini-api-key': localApiKey } : {}),
        },
        body: JSON.stringify({
          expenseString: input,
          groupMembers: members.map(m => m.nickname || 'Unknown'),
          currentUserName
        }),
      });
      const responseData = await response.json();
      if (!response.ok) {
        throw new Error(responseData?.error || 'AI parsing failed.');
      }
      const result = responseData.data as ParsedExpense;
      const finalDescription =
        result.description && normalizeName(result.description) !== 'expense'
          ? result.description
          : deriveDescriptionFromInput(input);

      const payer = members.find(m => normalizeName(m.nickname || '') === normalizeName(result.paidBy || ''));
      if (!payer) throw new Error(`Could not find member matching: ${result.paidBy}`);

      const participantMembers = result.participants
        .map((name) => members.find((m) => normalizeName(m.nickname || '') === normalizeName(name || '')))
        .filter((member): member is (typeof members)[number] => !!member);

      const customSplitMap = new Map<string, number>();
      for (const split of result.customSplits || []) {
        const member = members.find((m) => normalizeName(m.nickname || '') === normalizeName(split.member || ''));
        if (member && Number.isFinite(split.amount) && split.amount >= 0) {
          customSplitMap.set(member.userId, split.amount);
        }
      }

      // Deterministic fallback: if model misses custom splits, parse user text directly.
      if (customSplitMap.size === 0) {
        const parsedFromText = parseCustomSplitsFromText(input, members);
        parsedFromText.forEach((value, key) => customSplitMap.set(key, value));
      }

      if (customSplitMap.size > 0) {
        // Ensure participants include all custom-specified members.
        for (const member of members) {
          if (customSplitMap.has(member.userId) && !participantMembers.some((p) => p.userId === member.userId)) {
            participantMembers.push(member);
          }
        }
      }
      let participants: Array<{ userId: string; amount: number }> = [];
      const customTotal = round2(Array.from(customSplitMap.values()).reduce((sum, value) => sum + value, 0));

      if (customSplitMap.size > 0 && customTotal <= result.amount + 0.01) {
        // If custom splits are provided, treat unspecified remainder as payer's own share.
        const hasPayer = participantMembers.some((p) => p.userId === payer.userId);
        if (!hasPayer) participantMembers.push(payer);

        const payerExplicitAmount = customSplitMap.get(payer.userId);
        if (payerExplicitAmount === undefined) {
          const payerShare = round2(Math.max(0, result.amount - customTotal));
          customSplitMap.set(payer.userId, payerShare);
        }

        participants = participantMembers.map((member) => ({
          userId: member.userId,
          amount: round2(customSplitMap.get(member.userId) ?? 0),
        }));
      } else {
        const participantsWithoutCustom = participantMembers.filter((m) => !customSplitMap.has(m.userId));
        const remainingAmount = Math.max(0, result.amount - customTotal);
        const equalFallbackShare =
          participantsWithoutCustom.length > 0 ? remainingAmount / participantsWithoutCustom.length : 0;

        participants = participantMembers.map((member) => ({
          userId: member.userId,
          amount: round2(customSplitMap.get(member.userId) ?? equalFallbackShare),
        }));
      }

      // Keep participant sum exactly aligned with total amount.
      const allocated = round2(participants.reduce((sum, p) => sum + p.amount, 0));
      const diff = round2(result.amount - allocated);
      if (Math.abs(diff) > 0.001 && participants.length > 0) {
        const payerIdx = participants.findIndex((p) => p.userId === payer.userId);
        const idx = payerIdx >= 0 ? payerIdx : 0;
        participants[idx] = {
          ...participants[idx],
          amount: round2(Math.max(0, participants[idx].amount + diff)),
        };
      }

      if (participants.length === 0) {
        throw new Error("No valid group members identified as participants.");
      }

      const expenseId = doc(collection(db, 'groups', group.id, 'expenses')).id;
      const expenseRef = doc(db, 'groups', group.id, 'expenses', expenseId);

      const expenseData = {
        id: expenseId,
        groupId: group.id,
        description: finalDescription,
        totalAmount: result.amount,
        amount: result.amount,
        paidById: payer.userId,
        paidBy: payer.userId,
        expenseDate: new Date().toISOString(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        participants,
        groupMembers: group.members
      };

      setDoc(expenseRef, expenseData).catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: expenseRef.path,
          operation: 'create',
          requestResourceData: expenseData
        }));
      });

      toast({ title: 'AI successfully parsed expense!', description: `Recorded "${finalDescription}" for $${result.amount}` });
      setOpen(false);
      setInput('');
    } catch (err: any) {
      toast({ 
        variant: 'destructive', 
        title: 'Magic Parse Failed', 
        description: err.message || 'Check your Gemini API Key or try a clearer description.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-accent/50 text-accent hover:bg-accent/10">
          <BrainCircuit className="h-4 w-4" /> Quick AI Add
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-card border shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl font-headline">
            <BrainCircuit className="text-accent" /> AI Assistant
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {showApiKeySetup ? (
            <div className="space-y-2 rounded-lg border p-3 bg-muted/20">
              <Label htmlFor="gemini-api-key">Gemini API Key (one-time setup)</Label>
              <div className="flex gap-2">
                <Input
                  id="gemini-api-key"
                  type="password"
                  placeholder="Paste your API key here"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                />
                <Button type="button" variant="secondary" onClick={handleSaveApiKey}>
                  Save Key
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Get key from https://aistudio.google.com/app/apikey and save it once.
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between rounded-lg border p-3 bg-muted/20">
              <p className="text-xs text-muted-foreground">
                Gemini API key already saved for this browser.
              </p>
              <Button type="button" variant="ghost" size="sm" onClick={handleEditApiKey}>
                Change API Key
              </Button>
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            Just describe what happened. Example: "I paid $45 for pizza for Sarah and Priya."
          </p>
          <Textarea 
            placeholder="Type your expense details..." 
            className="min-h-[120px] bg-muted/20 border-accent/20 focus:border-accent"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleAIParse} disabled={loading || !input} className="bg-accent text-accent-foreground hover:bg-accent/90">
            {loading ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Wand2 className="mr-2 h-4 w-4" />}
            Magic Parse
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
