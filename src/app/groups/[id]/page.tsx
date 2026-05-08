"use client";

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { ExpenseForm } from '@/components/ExpenseForm';
import { AIExpenseForm } from '@/components/AIExpenseForm';
import { AddMemberDialog } from '@/components/AddMemberDialog';
import { BalanceView } from '@/components/BalanceView';
import { getGroupBalances } from '@/lib/debt-simplifier';
import { History, LayoutDashboard, ArrowLeft, ArrowUpDown, Calendar, DollarSign, User as UserIcon, Plus, Loader2, LogOut, Trash2 } from 'lucide-react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, query, orderBy, serverTimestamp, setDoc, updateDoc, deleteField, deleteDoc, getDocs, writeBatch } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function GroupPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const [isLeavingPage, setIsLeavingPage] = useState(false);
  
  const groupRef = useMemoFirebase(() => db && id && !isLeavingPage ? doc(db, 'groups', id as string) : null, [db, id, isLeavingPage]);
  const { data: group, isLoading: isGroupLoading } = useDoc(groupRef);

  const membersRef = useMemoFirebase(() => db && id && !isLeavingPage ? collection(db, 'groups', id as string, 'members') : null, [db, id, isLeavingPage]);
  const { data: members, isLoading: isMembersLoading } = useCollection(membersRef);

  const expensesRef = useMemoFirebase(() => db && id && !isLeavingPage ? query(collection(db, 'groups', id as string, 'expenses'), orderBy('expenseDate', 'desc')) : null, [db, id, isLeavingPage]);
  const { data: expenses, isLoading: isExpensesLoading } = useCollection(expensesRef);

  const settlementsRef = useMemoFirebase(() => db && id && !isLeavingPage ? query(collection(db, 'groups', id as string, 'settlements'), orderBy('settlementDate', 'desc')) : null, [db, id, isLeavingPage]);
  const { data: settlements, isLoading: isSettlementsLoading } = useCollection(settlementsRef);

  const [sortBy, setSortBy] = useState<'date' | 'amount' | 'payer'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [isExiting, setIsExiting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const balances = useMemo(() => {
    if (!members) return [];
    // Map members to a stable list for balance calculation
    const memberList = (members || []).map(m => ({ 
      id: m.userId || m.id, 
      name: m.nickname || 'Unknown Member' 
    }));
    return getGroupBalances(memberList, expenses || [], settlements || []);
  }, [members, expenses, settlements]);

  if (isGroupLoading || isMembersLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center space-y-4">
        <h1 className="text-2xl font-bold">Group not found</h1>
        <Button onClick={() => router.push('/dashboard')}>Back to Dashboard</Button>
      </div>
    );
  }

  const handleRecordSettlement = (tx: any) => {
    if (!db || !id) return;

    const settlementId = doc(collection(db, 'groups', id as string, 'settlements')).id;
    const settlementRef = doc(db, 'groups', id as string, 'settlements', settlementId);

    const settlementData = {
      id: settlementId,
      groupId: id,
      payerId: tx.from,
      receiverId: tx.to,
      from: tx.from,
      to: tx.to,
      amount: tx.amount,
      settlementDate: new Date().toISOString(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      groupMembers: group.members
    };

    setDoc(settlementRef, settlementData).catch(async (err) => {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: settlementRef.path,
        operation: 'create',
        requestResourceData: settlementData
      }));
    });

    toast({ title: 'Settlement recorded!', description: `${tx.fromName} paid ${tx.toName} $${tx.amount.toFixed(2)}` });
  };

  const sortedExpenses = [...(expenses || [])].sort((a, b) => {
    let comparison = 0;
    if (sortBy === 'date') comparison = new Date(a.expenseDate || a.date).getTime() - new Date(b.expenseDate || b.date).getTime();
    else if (sortBy === 'amount') comparison = (a.totalAmount || a.amount) - (b.totalAmount || b.amount);
    else if (sortBy === 'payer') {
      const payerA = members?.find(m => m.userId === a.paidById || m.userId === a.paidBy)?.nickname || '';
      const payerB = members?.find(m => m.userId === b.paidById || m.userId === b.paidBy)?.nickname || '';
      comparison = payerA.localeCompare(payerB);
    }
    return sortOrder === 'asc' ? comparison : -comparison;
  });

  const toggleSort = (field: 'date' | 'amount' | 'payer') => {
    if (sortBy === field) setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const isCreator = !!(user?.uid && group?.creatorId === user.uid);

  const handleExitGroup = async () => {
    if (!db || !id || !user?.uid || isCreator) return;
    setIsExiting(true);
    setIsLeavingPage(true);
    try {
      const groupRef = doc(db, 'groups', id as string);
      const memberRef = doc(db, 'groups', id as string, 'members', user.uid);

      await Promise.all([
        updateDoc(groupRef, {
          [`members.${user.uid}`]: deleteField(),
          updatedAt: serverTimestamp(),
        }),
        deleteDoc(memberRef),
      ]);

      toast({ title: 'Exited group', description: 'You have left this group.' });
      router.push('/dashboard');
    } catch (error: any) {
      setIsLeavingPage(false);
      toast({
        variant: 'destructive',
        title: 'Failed to exit group',
        description: error?.message || 'Please try again.',
      });
    } finally {
      setIsExiting(false);
    }
  };

  const handleDeleteGroup = async () => {
    if (!db || !id || !isCreator) return;
    setIsDeleting(true);
    setIsLeavingPage(true);
    try {
      const groupId = id as string;
      const groupRef = doc(db, 'groups', groupId);
      const subcollections = ['members', 'expenses', 'settlements'];

      for (const subcollection of subcollections) {
        const snapshot = await getDocs(collection(db, 'groups', groupId, subcollection));
        if (!snapshot.empty) {
          const batch = writeBatch(db);
          snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
          await batch.commit();
        }
      }

      await deleteDoc(groupRef);
      toast({ title: 'Group deleted', description: 'The group and related records were removed.' });
      router.push('/dashboard');
    } catch (error: any) {
      setIsLeavingPage(false);
      toast({
        variant: 'destructive',
        title: 'Failed to delete group',
        description: error?.message || 'Please try again.',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1 container mx-auto px-4 py-8 space-y-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-headline font-bold">{group.name}</h1>
              <p className="text-muted-foreground text-sm">
                {members?.length || 0} members &bull; {expenses?.length || 0} expenses
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {isCreator ? (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" className="gap-2" disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    Delete Group
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete this group?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently remove the group, all expenses, settlements, and members. This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive hover:bg-destructive/90">
                      Yes, Delete Group
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            ) : (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="gap-2" disabled={isExiting}>
                    {isExiting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                    Exit Group
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Exit this group?</AlertDialogTitle>
                    <AlertDialogDescription>
                      You will lose access to this group unless another member invites you again.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleExitGroup}>Yes, Exit Group</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <AddMemberDialog groupId={group.id} groupName={group.name} currentMembers={group.members} />
            {members && <AIExpenseForm group={group} members={members} />}
            {members && <ExpenseForm group={group} members={members} currentUser={user} />}
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="bg-card/50 border h-12">
            <TabsTrigger value="overview" className="gap-2 px-6"><LayoutDashboard className="h-4 w-4" /> Overview</TabsTrigger>
            <TabsTrigger value="history" className="gap-2 px-6"><History className="h-4 w-4" /> History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <BalanceView balances={balances} onSettle={handleRecordSettlement} />
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="flex items-center justify-between bg-card/40 border p-3 rounded-xl">
              <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground px-2">Sort By</span>
              <div className="flex gap-2 overflow-x-auto">
                <Button variant={sortBy === 'date' ? 'secondary' : 'ghost'} size="sm" onClick={() => toggleSort('date')} className="h-8 gap-2 whitespace-nowrap">
                  <Calendar className="h-3.5 w-3.5" /> Date
                  {sortBy === 'date' && <ArrowUpDown className="h-3 w-3" />}
                </Button>
                <Button variant={sortBy === 'amount' ? 'secondary' : 'ghost'} size="sm" onClick={() => toggleSort('amount')} className="h-8 gap-2 whitespace-nowrap">
                  <DollarSign className="h-3.5 w-3.5" /> Amount
                  {sortBy === 'amount' && <ArrowUpDown className="h-3 w-3" />}
                </Button>
                <Button variant={sortBy === 'payer' ? 'secondary' : 'ghost'} size="sm" onClick={() => toggleSort('payer')} className="h-8 gap-2 whitespace-nowrap">
                  <UserIcon className="h-3.5 w-3.5" /> Payer
                  {sortBy === 'payer' && <ArrowUpDown className="h-3 w-3" />}
                </Button>
              </div>
            </div>

            <div className="space-y-3">
              {sortedExpenses.length > 0 ? (
                sortedExpenses.map(exp => (
                  <div key={exp.id} className="glass-card p-4 rounded-2xl flex items-center justify-between hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-white/5 flex flex-col items-center justify-center border border-white/5">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">
                          {new Date(exp.expenseDate || exp.date).toLocaleDateString('en-US', { month: 'short' })}
                        </span>
                        <span className="text-lg font-bold leading-none">
                          {new Date(exp.expenseDate || exp.date).getDate()}
                        </span>
                      </div>
                      <div>
                        <h4 className="font-bold">{exp.description}</h4>
                        <p className="text-xs text-muted-foreground">
                          Paid by <span className="text-foreground font-medium">
                            {members?.find(m => m.userId === (exp.paidById || exp.paidBy))?.nickname || 'Unknown'}
                          </span> &bull; 
                          Split with {exp.participants?.length || 0} people
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-headline font-bold">
                        ${(exp.totalAmount || exp.amount || 0).toFixed(2)}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-widest">Total Amount</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-20 text-muted-foreground">
                  <Plus className="h-12 w-12 mx-auto mb-4 opacity-10" />
                  <p>No expenses recorded yet.</p>
                </div>
              )}

              {(settlements || []).map(set => (
                <div key={set.id} className="p-4 rounded-2xl border border-dashed border-accent/20 bg-accent/5 flex items-center justify-between opacity-80">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">Settlement Recorded</h4>
                      <p className="text-xs text-muted-foreground">
                        {members?.find(m => m.userId === set.payerId)?.nickname} paid {members?.find(m => m.userId === set.receiverId)?.nickname}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-accent">${(set.amount || 0).toFixed(2)}</div>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
