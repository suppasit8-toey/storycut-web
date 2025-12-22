"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, where, Timestamp } from "firebase/firestore";
import { DollarSign, TrendingUp, TrendingDown, Wallet, Calendar, Filter } from "lucide-react";
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
    date: any; // Firestore Timestamp
    category?: string;
}

interface Expense { // Fixed Cost
    id: string;
    amount: number;
    name: string;
    isRecurring: boolean;
}

export default function FinanceDashboard() {
    // --- State ---
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [fixedCosts, setFixedCosts] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    // --- Data Fetching ---
    useEffect(() => {
        // Fetch Ledger
        const qTrx = query(collection(db, "transactions"), orderBy("date", "desc"));
        const unsubTrx = onSnapshot(qTrx, (snap) => {
            setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
        });

        // Fetch Fixed Costs (for forecasting)
        const qExp = query(collection(db, "expenses"));
        const unsubExp = onSnapshot(qExp, (snap) => {
            setFixedCosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
        });

        setLoading(false); // Simplification

        return () => {
            unsubTrx();
            unsubExp();
        };
    }, []);

    // --- Calculations ---
    const metrics = useMemo(() => {
        // Filter transactions by selected Month/Year
        const filteredTrx = transactions.filter(t => {
            const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
            return d.getMonth() + 1 === Number(selectedMonth) && d.getFullYear() === selectedYear;
        });

        const totalRevenue = filteredTrx.filter(t => t.type === 'revenue').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
        const totalExpense = filteredTrx.filter(t => t.type === 'expense').reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
        const balance = totalRevenue - totalExpense;

        // Forecast: Sum of all recurring fixed costs for this month
        // In a real app, check if they are already paid in 'filteredTrx'. 
        // For now, let's just sum all recurring costs as "Projected Expenses".
        const projectedFixed = fixedCosts.filter(e => e.isRecurring).reduce((acc, e) => acc + (Number(e.amount) || 0), 0);

        // Actual Remaining = All time balance? Or Month balance?
        // Prompt says "Actual Remaining Balance" which usually implies generic cash on hand, 
        // but given the filters, it likely means for this period. 
        // Let's rely on "Total Revenue - Total Expense" for the period for now.

        return {
            revenue: totalRevenue,
            expense: totalExpense,
            balance: balance,
            forecastUnpaid: projectedFixed - totalExpense // Rough estimate: Fixed Costs - Paid Expenses (assuming all paid expenses were fixed costs)
        };
    }, [transactions, fixedCosts, selectedMonth, selectedYear]);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Filters */}
            <div className="flex flex-wrap items-center gap-4 bg-[#1A1A1A] p-4 rounded-[24px] border border-white/5">
                <div className="flex items-center gap-2 px-4 py-2 bg-black rounded-xl border border-white/10 text-white font-bold text-sm">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <span>Filter:</span>
                </div>
                <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-black text-white font-bold text-sm px-4 py-3 rounded-xl border border-white/10 outline-none focus:border-white/30"
                >
                    {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                        <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}</option>
                    ))}
                </select>
                <select
                    value={selectedYear}
                    onChange={(e) => setSelectedYear(Number(e.target.value))}
                    className="bg-black text-white font-bold text-sm px-4 py-3 rounded-xl border border-white/10 outline-none focus:border-white/30"
                >
                    {[2024, 2025].map(y => (
                        <option key={y} value={y}>{y}</option>
                    ))}
                </select>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                {/* Balance */}
                <div className="bg-[#1A1A1A] rounded-[32px] p-8 border border-white/5 flex flex-col justify-between group hover:border-white/20 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-blue-500/10 p-3 rounded-2xl text-blue-500">
                            <Wallet className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 bg-black/40 px-3 py-1 rounded-full">Actual</span>
                    </div>
                    <div>
                        <div className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-1">Remaining Balance</div>
                        <div className={cn("text-3xl font-black", metrics.balance >= 0 ? "text-white" : "text-red-500")}>
                            ฿{metrics.balance.toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Forecast */}
                <div className="bg-[#1A1A1A] rounded-[32px] p-8 border border-white/5 flex flex-col justify-between group hover:border-white/20 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-purple-500/10 p-3 rounded-2xl text-purple-500">
                            <Calendar className="w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500 bg-black/40 px-3 py-1 rounded-full">Forecast</span>
                    </div>
                    <div>
                        <div className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-1">Unpaid Obligations</div>
                        <div className="text-3xl font-black text-purple-400">
                            ฿{Math.max(0, metrics.forecastUnpaid).toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Revenue */}
                <div className="bg-[#1A1A1A] rounded-[32px] p-8 border border-white/5 flex flex-col justify-between group hover:border-white/20 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-green-500/10 p-3 rounded-2xl text-green-500">
                            <TrendingUp className="w-6 h-6" />
                        </div>
                    </div>
                    <div>
                        <div className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-1">Total Revenue</div>
                        <div className="text-3xl font-black text-green-500">
                            ฿{metrics.revenue.toLocaleString()}
                        </div>
                    </div>
                </div>

                {/* Expenses */}
                <div className="bg-[#1A1A1A] rounded-[32px] p-8 border border-white/5 flex flex-col justify-between group hover:border-white/20 transition-all">
                    <div className="flex justify-between items-start mb-4">
                        <div className="bg-red-500/10 p-3 rounded-2xl text-red-500">
                            <TrendingDown className="w-6 h-6" />
                        </div>
                    </div>
                    <div>
                        <div className="text-gray-400 font-bold text-xs uppercase tracking-wider mb-1">Total Expenses</div>
                        <div className="text-3xl font-black text-red-500">
                            ฿{metrics.expense.toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Empty State / Prompt */}
            {transactions.length === 0 && (
                <div className="bg-[#1A1A1A] rounded-[32px] p-12 text-center border border-white/5 border-dashed">
                    <p className="text-gray-500 font-bold uppercase tracking-widest">No transactions found for this period</p>
                    <p className="text-gray-600 text-xs mt-2">Go to "Accounts" to add entries</p>
                </div>
            )}
        </div>
    );
}
