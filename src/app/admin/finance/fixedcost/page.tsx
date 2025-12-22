"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { Plus, Trash2, Wallet, RefreshCw } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Expense {
    id: string;
    category: string;
    name: string;
    amount: number;
    isRecurring: boolean;
}

const CATEGORIES = [
    "Water", "Electricity", "Internet", "Rent", "Marketing", "Accounting", "Tax", "Others"
];

export default function FixedCostPage() {
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

    // Form Stats
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [name, setName] = useState("");
    const [amount, setAmount] = useState("");
    const [isRecurring, setIsRecurring] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "expenses"), orderBy("category"));
        const unsub = onSnapshot(q, (snap) => {
            setExpenses(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name || !amount) return;

        try {
            await addDoc(collection(db, "expenses"), {
                category,
                name,
                amount: parseFloat(amount),
                isRecurring,
                createdAt: serverTimestamp()
            });
            // Reset
            setName("");
            setAmount("");
            setIsRecurring(true);
        } catch (err) {
            console.error(err);
            alert("Failed to add expense");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this fixed cost?")) return;
        await deleteDoc(doc(db, "expenses", id));
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black italic tracking-tighter text-white mb-2 font-inter uppercase">Fixed Costs</h1>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">Manage Recurring Expenses</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Form */}
                <div className="bg-[#1A1A1A] rounded-[32px] p-8 border border-white/5 h-fit">
                    <h2 className="text-xl font-black text-white italic tracking-tight mb-6 flex items-center gap-2">
                        <Plus className="w-5 h-5 text-green-500" /> Add New cost
                    </h2>

                    <form onSubmit={handleAdd} className="space-y-5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Category</label>
                            <select
                                value={category}
                                onChange={e => setCategory(e.target.value)}
                                className="w-full bg-black text-white font-bold text-sm px-4 py-3 rounded-xl border border-white/10 outline-none focus:border-white/30"
                            >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-500">Item Name</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="e.g. Monthly Rent"
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

                        <div className="flex items-center gap-3 py-2">
                            <button
                                type="button"
                                onClick={() => setIsRecurring(!isRecurring)}
                                className={cn(
                                    "w-12 h-6 rounded-full relative transition-colors border",
                                    isRecurring ? "bg-green-500/20 border-green-500" : "bg-gray-800 border-white/10"
                                )}
                            >
                                <div className={cn(
                                    "w-4 h-4 rounded-full bg-white absolute top-1/2 -translate-y-1/2 transition-all",
                                    isRecurring ? "left-7 bg-green-500" : "left-1 bg-gray-500"
                                )} />
                            </button>
                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Monthly Payment</span>
                        </div>

                        <button
                            type="submit"
                            className="w-full bg-white text-black font-black uppercase tracking-widest py-4 rounded-xl hover:bg-gray-200 transition-colors shadow-lg shadow-white/10"
                        >
                            Save Cost
                        </button>
                    </form>
                </div>

                {/* List */}
                <div className="lg:col-span-2 space-y-4">
                    {loading ? (
                        <div className="text-center py-20 text-gray-500 font-bold animate-pulse">Loading...</div>
                    ) : expenses.length === 0 ? (
                        <div className="text-center py-20 bg-[#1A1A1A] rounded-[32px] border border-white/5 border-dashed">
                            <p className="text-gray-500 font-bold uppercase tracking-widest">No fixed costs added</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {expenses.map(item => (
                                <div key={item.id} className="bg-[#1A1A1A] p-6 rounded-[24px] border border-white/5 flex flex-col justify-between group hover:border-white/20 transition-all">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <div className="text-[10px] font-black uppercase tracking-widest text-[#404040] mb-1">{item.category}</div>
                                            <div className="text-xl font-bold text-white leading-tight">{item.name}</div>
                                        </div>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="w-10 h-10 flex items-center justify-center rounded-full bg-black border border-white/5 text-gray-600 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <div className="flex items-end justify-between">
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                            {item.isRecurring && <RefreshCw className="w-3 h-3 text-green-500" />}
                                            {item.isRecurring ? "Monthly" : "One-time"}
                                        </div>
                                        <div className="text-2xl font-black text-white">฿{item.amount.toLocaleString()}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
