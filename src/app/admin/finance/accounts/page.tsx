"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { Plus, Trash2, ArrowUpCircle, ArrowDownCircle, Wallet, Calendar } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Transaction {
    id: string;
    type: 'revenue' | 'expense';
    amount: number;
    description: string;
    date: any;
    note?: string;
    category?: string;
}

interface Expense {
    id: string;
    name: string;
    amount: number;
    category: string;
}

export default function AccountsPage() {
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [fixedCosts, setFixedCosts] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

    // Form
    const [type, setType] = useState<'revenue' | 'expense'>('expense');
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [note, setNote] = useState("");

    useEffect(() => {
        // Fetch Ledger
        const qTrx = query(collection(db, "transactions"), orderBy("date", "desc"));
        const unsubTrx = onSnapshot(qTrx, (snap) => {
            setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
            setLoading(false);
        });

        // Fetch Fixed Costs for quick select
        const qExp = query(collection(db, "expenses"));
        const unsubExp = onSnapshot(qExp, (snap) => {
            setFixedCosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
        });

        return () => { unsubTrx(); unsubExp(); };
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!description || !amount) return;

        try {
            await addDoc(collection(db, "transactions"), {
                type,
                description,
                amount: parseFloat(amount),
                date: Timestamp.fromDate(new Date(date)),
                note,
                createdAt: Timestamp.now()
            });
            // Reset
            setDescription("");
            setAmount("");
            setNote("");
            setDate(new Date().toISOString().split('T')[0]);
        } catch (err) {
            console.error(err);
            alert("Failed to add transaction");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this transaction?")) return;
        await deleteDoc(doc(db, "transactions", id));
    };

    const handleQuickSelect = (expense: Expense) => {
        setType('expense');
        setDescription(expense.name);
        setAmount(expense.amount.toString());
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black italic tracking-tighter text-white mb-2 font-inter uppercase">Accounts</h1>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">General Ledger</p>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Form */}
                <div className="space-y-6">
                    <div className="bg-[#1A1A1A] rounded-[32px] p-8 border border-white/5">
                        <h2 className="text-xl font-black text-white italic tracking-tight mb-6 flex items-center gap-2">
                            New Entry
                        </h2>

                        <form onSubmit={handleAdd} className="space-y-5">
                            <div className="grid grid-cols-2 gap-4">
                                <button type="button" onClick={() => setType('revenue')} className={cn("py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all border", type === 'revenue' ? "bg-green-500 text-white border-green-500 shadow-lg shadow-green-500/20" : "bg-black border-white/10 text-gray-500")}>Revenue</button>
                                <button type="button" onClick={() => setType('expense')} className={cn("py-3 rounded-xl font-black uppercase tracking-widest text-xs transition-all border", type === 'expense' ? "bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/20" : "bg-black border-white/10 text-gray-500")}>Expense</button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Item Name</label>
                                <input
                                    type="text"
                                    value={description}
                                    onChange={e => setDescription(e.target.value)}
                                    placeholder="Transaction description"
                                    className="w-full bg-black text-white font-bold text-sm px-4 py-3 rounded-xl border border-white/10 outline-none focus:border-white/30"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Amount (฿)</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    className="w-full bg-black text-white font-bold text-sm px-4 py-3 rounded-xl border border-white/10 outline-none focus:border-white/30"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Date</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full bg-black text-white font-bold text-sm px-4 py-3 rounded-xl border border-white/10 outline-none focus:border-white/30 [color-scheme:dark]"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Note (Optional)</label>
                                <textarea
                                    value={note}
                                    onChange={e => setNote(e.target.value)}
                                    rows={2}
                                    className="w-full bg-black text-white font-bold text-sm px-4 py-3 rounded-xl border border-white/10 outline-none focus:border-white/30 resize-none"
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-white text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-gray-200 transition-colors shadow-lg shadow-white/10"
                            >
                                Save Record
                            </button>
                        </form>
                    </div>

                    {/* Quick Select Fixed Costs */}
                    {fixedCosts.length > 0 && (
                        <div className="bg-[#1A1A1A] rounded-[32px] p-8 border border-white/5">
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                                <Wallet className="w-3 h-3" /> Quick Add: Fixed Costs
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {fixedCosts.map(fc => (
                                    <button
                                        key={fc.id}
                                        onClick={() => handleQuickSelect(fc)}
                                        className="bg-black border border-white/10 hover:border-white/30 px-3 py-2 rounded-lg text-xs font-bold text-gray-400 hover:text-white transition-all text-left"
                                    >
                                        <div className="truncate max-w-[120px]">{fc.name}</div>
                                        <div className="text-[10px] text-gray-600">฿{fc.amount}</div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Ledger List */}
                <div className="xl:col-span-2 space-y-4">
                    {loading ? (
                        <div className="text-center py-20 text-gray-500 font-bold animate-pulse">Loading ledger...</div>
                    ) : transactions.length === 0 ? (
                        <div className="text-center py-20 bg-[#1A1A1A] rounded-[32px] border border-white/5 border-dashed">
                            <p className="text-gray-500 font-bold uppercase tracking-widest">No transactions recorded</p>
                        </div>
                    ) : (
                        transactions.map((t, i) => {
                            const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
                            return (
                                <div key={t.id} className="bg-[#1A1A1A] p-6 rounded-[24px] border border-white/5 flex items-center justify-between group hover:border-white/20 transition-all">
                                    <div className="flex items-center gap-6">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center border",
                                            t.type === 'revenue' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                                        )}>
                                            {t.type === 'revenue' ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                                                <Calendar className="w-3 h-3" /> {d.toLocaleDateString('en-GB')}
                                            </div>
                                            <div className="text-lg font-bold text-white">{t.description}</div>
                                            {t.note && <div className="text-xs text-gray-600 font-medium mt-1">{t.note}</div>}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6">
                                        <div className={cn("text-xl font-black", t.type === 'revenue' ? "text-green-500" : "text-white")}>
                                            {t.type === 'revenue' ? '+' : '-'}฿{t.amount.toLocaleString()}
                                        </div>
                                        <button
                                            onClick={() => handleDelete(t.id)}
                                            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-red-500/10 text-gray-600 hover:text-red-500 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>
        </div>
    );
}
