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
    createdAt?: any;
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

    // Entry Modal State
    const [showEntryModal, setShowEntryModal] = useState(false);
    const [entryMode, setEntryMode] = useState<'manual' | 'fixed'>('manual');

    // Form
    const [type, setType] = useState<'revenue' | 'expense'>('expense');
    const [description, setDescription] = useState("");
    const [amount, setAmount] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [note, setNote] = useState("");

    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

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
                category: entryMode === 'fixed' ? 'Fixed Cost' : 'Manual',
                createdAt: Timestamp.now()
            });
            // Reset & Close
            setDescription("");
            setAmount("");
            setNote("");
            setDate(new Date().toISOString().split('T')[0]);
            setShowEntryModal(false);
        } catch (err) {
            console.error(err);
            alert("Failed to add transaction");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this transaction?")) return;
        await deleteDoc(doc(db, "transactions", id));
        setSelectedTransaction(null);
    };

    const handleFixedCostSelect = (expense: Expense) => {
        setType('expense');
        setDescription(expense.name);
        setAmount(expense.amount.toString());
        setEntryMode('manual'); // Switch to manual view to review/edit before saving
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative font-inter">
            {/* Header */}
            <div className="flex flex-row justify-between items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black italic tracking-tighter text-white mb-2 uppercase">FINANCE</h1>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">ACCOUNTS</p>
                </div>
                <button
                    onClick={() => {
                        setEntryMode('manual');
                        setShowEntryModal(true);
                    }}
                    className="h-12 px-6 bg-white text-black rounded-full font-black uppercase tracking-widest text-xs hover:bg-gray-200 transition-colors shadow-lg shadow-white/10 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> New Entry
                </button>
            </div>

            {/* Ledger List */}
            <div className="space-y-4">
                {loading ? (
                    <div className="text-center py-20 text-gray-500 font-bold animate-pulse">Loading ledger...</div>
                ) : transactions.length === 0 ? (
                    <div className="text-center py-20 bg-[#1A1A1A] rounded-[32px] border border-white/5 border-dashed">
                        <p className="text-gray-500 font-bold uppercase tracking-widest">No transactions recorded</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {transactions.map((t) => {
                            const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
                            const created = t.createdAt?.toDate ? t.createdAt.toDate() : d; // Fallback
                            return (
                                <div
                                    key={t.id}
                                    onClick={() => setSelectedTransaction(t)}
                                    className="bg-[#1A1A1A] p-6 rounded-[32px] border border-white/5 flex flex-col md:flex-row items-start md:items-center justify-between group hover:border-white/20 transition-all cursor-pointer hover:bg-white/5 active:scale-[0.99] gap-4"
                                >
                                    <div className="flex items-start md:items-center gap-6 w-full md:w-auto">
                                        <div className={cn(
                                            "w-12 h-12 rounded-2xl flex items-center justify-center border shrink-0",
                                            t.type === 'revenue' ? "bg-green-500/10 border-green-500/20 text-green-500" : "bg-red-500/10 border-red-500/20 text-red-500"
                                        )}>
                                            {t.type === 'revenue' ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">
                                                <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {d.toLocaleDateString('en-GB')}</span>
                                                <span className="w-1 h-1 rounded-full bg-gray-700" />
                                                <span>{created.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div className="text-lg font-bold text-white truncate">{t.description}</div>
                                            {t.note && (
                                                <div className="text-xs text-gray-500 font-medium mt-1 truncate max-w-[200px] md:max-w-[400px]">
                                                    {t.note}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between w-full md:w-auto gap-6 pl-[72px] md:pl-0">
                                        <div className={cn("text-xl font-black", t.type === 'revenue' ? "text-green-500" : "text-white")}>
                                            {t.type === 'revenue' ? '+' : '-'}฿{t.amount.toLocaleString()}
                                        </div>
                                        <div className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-gray-400 opacity-0 group-hover:opacity-100 transition-all">
                                            <Plus className="w-4 h-4 rotate-45" />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* NEW ENTRY MODAL */}
            {showEntryModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-[#1A1A1A] w-full max-w-lg rounded-[32px] border border-white/10 shadow-2xl overflow-hidden flex flex-col relative max-h-[90vh]">
                        {/* Modal Header */}
                        <div className="p-8 pb-4 flex justify-between items-start shrink-0">
                            <div>
                                <h2 className="text-3xl font-black italic tracking-tighter text-white font-inter uppercase leading-none">NEW ENTRY</h2>
                            </div>
                            <button
                                onClick={() => setShowEntryModal(false)}
                                className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all"
                            >
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        {/* Mode Toggle */}
                        <div className="px-8 pb-4 shrink-0">
                            <div className="bg-black p-1 rounded-xl flex gap-1 border border-white/10">
                                <button
                                    onClick={() => setEntryMode('manual')}
                                    className={cn(
                                        "flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                                        entryMode === 'manual' ? "bg-[#1A1A1A] text-white shadow-lg border border-white/10" : "text-gray-500 hover:text-gray-300"
                                    )}
                                >
                                    Manual Entry
                                </button>
                                <button
                                    onClick={() => setEntryMode('fixed')}
                                    className={cn(
                                        "flex-1 py-3 rounded-lg text-xs font-black uppercase tracking-widest transition-all",
                                        entryMode === 'fixed' ? "bg-[#1A1A1A] text-white shadow-lg border border-white/10" : "text-gray-500 hover:text-gray-300"
                                    )}
                                >
                                    Fixed Cost
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-8 pt-0 overflow-y-auto custom-scrollbar">
                            {entryMode === 'fixed' ? (
                                <div className="space-y-4">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Select Item to Auto-fill</div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {fixedCosts.map(fc => (
                                            <button
                                                key={fc.id}
                                                onClick={() => handleFixedCostSelect(fc)}
                                                className="bg-black border border-white/10 hover:border-white/30 p-4 rounded-2xl text-left transition-all group flex items-center justify-between"
                                            >
                                                <div>
                                                    <div className="font-bold text-white group-hover:text-amber-400 transition-colors">{fc.name}</div>
                                                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">{fc.category}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-black text-white">฿{fc.amount.toLocaleString()}</div>
                                                    <div className="text-[10px] text-gray-600">Click to add</div>
                                                </div>
                                            </button>
                                        ))}
                                        {fixedCosts.length === 0 && (
                                            <div className="text-center py-10 text-gray-600 text-xs font-bold uppercase tracking-widest">No fixed costs defined</div>
                                        )}
                                    </div>
                                </div>
                            ) : (
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
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* TRANSACTION DETAILS MODAL */}
            {selectedTransaction && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-[#1A1A1A] w-full max-w-lg rounded-[32px] border border-white/10 shadow-2xl overflow-hidden flex flex-col relative">
                        {/* Header */}
                        <div className="p-8 pb-4 flex justify-between items-start">
                            <div>
                                <div className="text-[10px] font-black uppercase tracking-[0.2em] text-[#404040] mb-2">ID: {selectedTransaction.id.slice(-6)}</div>
                                <h2 className="text-3xl font-black italic tracking-tighter text-white font-inter uppercase leading-none">TRANSACTION<br />DETAILS</h2>
                            </div>
                            <button
                                onClick={() => setSelectedTransaction(null)}
                                className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all"
                            >
                                <Plus className="w-6 h-6 rotate-45" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-8 pt-4 space-y-6">
                            {/* Main Amount Card */}
                            <div className={cn(
                                "p-6 rounded-[24px] border flex items-center justify-between",
                                selectedTransaction.type === 'revenue'
                                    ? "bg-green-500/10 border-green-500/20"
                                    : "bg-red-500/10 border-red-500/20"
                            )}>
                                <div>
                                    <div className={cn("text-[10px] font-black uppercase tracking-widest mb-1", selectedTransaction.type === 'revenue' ? "text-green-500" : "text-red-500")}>
                                        {selectedTransaction.type}
                                    </div>
                                    <div className="text-3xl font-black text-white italic tracking-tight">
                                        {selectedTransaction.type === 'revenue' ? '+' : '-'}฿{selectedTransaction.amount.toLocaleString()}
                                    </div>
                                </div>
                                <div className={cn(
                                    "w-12 h-12 rounded-full flex items-center justify-center",
                                    selectedTransaction.type === 'revenue' ? "bg-green-500 text-white" : "bg-red-500 text-white"
                                )}>
                                    {selectedTransaction.type === 'revenue' ? <ArrowUpCircle className="w-6 h-6" /> : <ArrowDownCircle className="w-6 h-6" />}
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 gap-4">
                                <div className="bg-black/40 p-5 rounded-[24px] border border-white/5">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Item Name</div>
                                    <div className="text-lg font-bold text-white leading-tight">{selectedTransaction.description}</div>
                                </div>

                                <div className="bg-black/40 p-5 rounded-[24px] border border-white/5">
                                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Note</div>
                                    <div className={cn("text-sm font-medium leading-relaxed whitespace-pre-wrap", selectedTransaction.note ? "text-gray-300" : "text-gray-600 italic")}>
                                        {selectedTransaction.note || "No notes added"}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-black/40 p-5 rounded-[24px] border border-white/5">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Transaction Date</div>
                                        <div className="text-base font-bold text-white">
                                            {(selectedTransaction.date?.toDate ? selectedTransaction.date.toDate() : new Date(selectedTransaction.date)).toLocaleDateString('en-GB')}
                                        </div>
                                    </div>
                                    <div className="bg-black/40 p-5 rounded-[24px] border border-white/5">
                                        <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Source</div>
                                        <div className="text-base font-bold text-white flex items-center gap-2">
                                            <Wallet className="w-4 h-4 text-gray-500" />
                                            Manual
                                        </div>
                                    </div>
                                    {selectedTransaction.createdAt && (
                                        <div className="col-span-2 bg-black/40 p-5 rounded-[24px] border border-white/5">
                                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-2">Created At</div>
                                            <div className="text-sm font-bold text-gray-400">
                                                {(selectedTransaction.createdAt?.toDate ? selectedTransaction.createdAt.toDate() : new Date()).toLocaleString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="pt-4 flex gap-4">
                                <button
                                    onClick={() => handleDelete(selectedTransaction.id)}
                                    className="flex-1 py-4 rounded-xl bg-red-500/10 text-red-500 font-black uppercase tracking-widest text-xs border border-red-500/20 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                                >
                                    <Trash2 className="w-4 h-4" /> Delete Transaction
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
