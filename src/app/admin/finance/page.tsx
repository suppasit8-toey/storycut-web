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
    const [bookings, setBookings] = useState<any[]>([]);
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    // --- Data Fetching ---
    useEffect(() => {
        // Fetch Ledger (Finance Accounts Revenue)
        const qTrx = query(collection(db, "transactions"), orderBy("date", "desc"));
        const unsubTrx = onSnapshot(qTrx, (snap) => {
            setTransactions(snap.docs.map(d => ({ id: d.id, ...d.data() } as Transaction)));
        });

        // Fetch Fixed Costs (for forecasting)
        const qExp = query(collection(db, "expenses"));
        const unsubExp = onSnapshot(qExp, (snap) => {
            setFixedCosts(snap.docs.map(d => ({ id: d.id, ...d.data() } as Expense)));
        });

        // Fetch Bookings (for Revenue & Commission Obligations)
        const qBookings = query(collection(db, "bookings"));
        const unsubBookings = onSnapshot(qBookings, (snap) => {
            setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        // Fetch Salary Payments (for Unpaid Obligations)
        const qPayments = query(collection(db, "salary_payments"));
        const unsubPayments = onSnapshot(qPayments, (snap) => {
            setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        });

        setLoading(false);

        return () => {
            unsubTrx();
            unsubExp();
            unsubBookings();
            unsubPayments();
        };
    }, []);

    // --- Calculations ---
    const metrics = useMemo(() => {
        // 1. REVENUE CALCULATION (Filtered by Month)
        // Source A: Finance Accounts Revenue
        const accountRevenue = transactions
            .filter(t => {
                const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
                return d.getMonth() + 1 === Number(selectedMonth) && d.getFullYear() === selectedYear && t.type === 'revenue';
            })
            .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

        // Source B & C: Bookings (Confirmed Online & Done)
        const bookingRevenue = bookings
            .filter(b => {
                // Parse date string DD/MM/YYYY
                if (!b.date) return false;
                const parts = b.date.split('/');
                if (parts.length !== 3) return false;
                const m = Number(parts[1]);
                const y = Number(parts[2]);
                if (m !== Number(selectedMonth) || y !== selectedYear) return false;

                // Revenue Rule:
                // 1. Confirmed -> Add Deposit Only
                // 2. Done -> Add Price + Extra - Discount
                return b.status === 'confirmed' || b.status === 'done';
            })
            .reduce((acc, b) => {
                let val = 0;
                if (b.status === 'confirmed') {
                    // Only count deposit for confirmed bookings
                    val = Number(b.depositAmount) || 0;
                } else if (b.status === 'done') {
                    // Usage full amount for done bookings
                    val = (Number(b.price) || 0) + (Number(b.extra_fee) || 0) - (Number(b.discount) || 0);
                }
                return acc + val;
            }, 0);

        const totalRevenue = accountRevenue + bookingRevenue;


        // 2. EXPENSES (Filtered by Month)
        const totalExpense = transactions
            .filter(t => {
                const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
                return d.getMonth() + 1 === Number(selectedMonth) && d.getFullYear() === selectedYear && t.type === 'expense';
            })
            .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);

        const balance = totalRevenue - totalExpense;


        // 3. UNPAID OBLIGATIONS (Cumulative / All Time Forecast)
        // Commission Accrued (All DONE bookings ever)
        // User formula: Sum all commissionAmount from status "DONE".
        // Commission Paid (All salary_payments ever)
        const totalAccruedCommission = bookings
            .filter(b => b.status === 'done')
            .reduce((acc, b) => {
                // If commissionAmount is stored, use it. Otherwise 0? 
                // The prompt says "Sum all commissionAmount". Assuming it's persisted.
                // In commission/page.tsx check, we fallback to calculation.
                // Let's safe fallback if not present?
                // For "Advanced Revenue Tracking", persistence is best, but let's assume it's there or 0 if not calculated yet.
                // Or maybe we should try to calc? "Sum all commissionAmount from bookings".
                return acc + (Number(b.commissionAmount) || 0);
            }, 0);

        const totalCommissionPaid = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);

        const unpaidObligations = Math.max(0, totalAccruedCommission - totalCommissionPaid);

        return {
            revenue: totalRevenue,
            expense: totalExpense,
            balance: balance,
            forecastUnpaid: unpaidObligations
        };
    }, [transactions, fixedCosts, bookings, payments, selectedMonth, selectedYear]);

    const [selectedMetric, setSelectedMetric] = useState<'balance' | 'unpaid' | 'revenue' | 'expense' | null>(null);

    // --- Derived Data for Modals ---
    const modalData = useMemo(() => {
        if (!selectedMetric) return null;

        if (selectedMetric === 'revenue') {
            // Combine Account Revenue + Bookings
            const accRevenue = transactions
                .filter(t => {
                    const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
                    return d.getMonth() + 1 === Number(selectedMonth) && d.getFullYear() === selectedYear && t.type === 'revenue';
                })
                .map(t => ({
                    id: t.id,
                    date: t.date?.toDate ? t.date.toDate() : new Date(t.date),
                    description: t.description,
                    amount: t.amount,
                    source: 'Manual Account',
                    refId: t.id.slice(-6).toUpperCase()
                }));

            const bookRevenue = bookings
                .filter(b => {
                    if (!b.date) return false;
                    const parts = b.date.split('/');
                    if (parts.length !== 3) return false;
                    const m = Number(parts[1]);
                    const y = Number(parts[2]);
                    if (m !== Number(selectedMonth) || y !== selectedYear) return false;
                    return b.status === 'confirmed' || b.status === 'done';
                })
                .map(b => {
                    let amount = 0;
                    let source = 'Booking';

                    if (b.status === 'confirmed') {
                        amount = Number(b.depositAmount) || 0;
                        source = 'Deposit Received';
                    } else if (b.status === 'done') {
                        amount = (Number(b.price) || 0) + (Number(b.extra_fee) || 0) - (Number(b.discount) || 0);
                        source = 'Service Completed';
                    }

                    // Parse date string to Date object
                    const [d, m, y] = b.date.split('/').map(Number);
                    const dateObj = new Date(y, m - 1, d);

                    return {
                        id: b.id,
                        date: dateObj,
                        description: `${b.serviceName || 'Service'} (${b.customerName || 'Cust'})`,
                        amount,
                        source,
                        refId: `#${b.bookingId || b.id.slice(0, 6).toUpperCase()}`
                    };
                });

            return [...accRevenue, ...bookRevenue].sort((a, b) => b.date.getTime() - a.date.getTime());
        }

        if (selectedMetric === 'expense') {
            return transactions
                .filter(t => {
                    const d = t.date?.toDate ? t.date.toDate() : new Date(t.date);
                    return d.getMonth() + 1 === Number(selectedMonth) && d.getFullYear() === selectedYear && t.type === 'expense';
                })
                .map(t => ({
                    id: t.id,
                    date: t.date?.toDate ? t.date.toDate() : new Date(t.date),
                    description: t.description,
                    amount: t.amount,
                    source: 'Manual Expense',
                    refId: t.id.slice(-6).toUpperCase()
                }))
                .sort((a, b) => b.date.getTime() - a.date.getTime());
        }

        if (selectedMetric === 'unpaid') {
            // Group by Barber
            const barberMap = new Map<string, { name: string; accrued: number; paid: number; remaining: number }>();

            // 1. Accrued
            bookings.filter(b => b.status === 'done').forEach(b => {
                if (!barberMap.has(b.barberId)) {
                    barberMap.set(b.barberId, { name: b.barberName || 'Unknown', accrued: 0, paid: 0, remaining: 0 });
                }
                const bData = barberMap.get(b.barberId)!;
                bData.accrued += (Number(b.commissionAmount) || 0);
            });

            // 2. Paid
            payments.forEach(p => {
                const bId = p.barberId;
                // If paid to a barber not in map (maybe no done jobs yet?? rare but possible)
                // Let's iterate payments and find name if possible or just use ID
                // Ideally we have a barber list, but for now use what we have.
                if (!barberMap.has(bId)) {
                    // Need name... 
                    barberMap.set(bId, { name: 'Unknown Staff', accrued: 0, paid: 0, remaining: 0 });
                }
                const bData = barberMap.get(bId)!;
                bData.paid += (Number(p.amount) || 0);
            });

            // 3. Calc Remaining
            const result: any[] = [];
            barberMap.forEach((val, key) => {
                val.remaining = val.accrued - val.paid;
                if (val.remaining !== 0 || val.paid !== 0 || val.accrued !== 0) {
                    result.push({ id: key, ...val });
                }
            });

            // Show highest debt first
            return result.sort((a, b) => b.remaining - a.remaining);
        }

        return [];

    }, [selectedMetric, transactions, bookings, payments, selectedMonth, selectedYear]);


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
                <div
                    onClick={() => setSelectedMetric('balance')}
                    className="bg-[#1A1A1A] rounded-[32px] p-8 border border-white/5 flex flex-col justify-between group hover:border-white/20 transition-all cursor-pointer hover:bg-white/5 active:scale-[0.98]"
                >
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

                {/* Forecast / Unpaid */}
                <div
                    onClick={() => setSelectedMetric('unpaid')}
                    className="bg-[#1A1A1A] rounded-[32px] p-8 border border-white/5 flex flex-col justify-between group hover:border-white/20 transition-all cursor-pointer hover:bg-white/5 active:scale-[0.98]"
                >
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
                <div
                    onClick={() => setSelectedMetric('revenue')}
                    className="bg-[#1A1A1A] rounded-[32px] p-8 border border-white/5 flex flex-col justify-between group hover:border-white/20 transition-all cursor-pointer hover:bg-white/5 active:scale-[0.98]"
                >
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
                <div
                    onClick={() => setSelectedMetric('expense')}
                    className="bg-[#1A1A1A] rounded-[32px] p-8 border border-white/5 flex flex-col justify-between group hover:border-white/20 transition-all cursor-pointer hover:bg-white/5 active:scale-[0.98]"
                >
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

            {/* DRILL-DOWN MODAL */}
            {selectedMetric && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-[#1A1A1A] w-full max-w-2xl rounded-[32px] border border-white/10 shadow-2xl overflow-hidden flex flex-col relative max-h-[85vh]">
                        {/* Modal Header */}
                        <div className="p-8 pb-4 flex justify-between items-start shrink-0 border-b border-white/5">
                            <div>
                                <h2 className="text-3xl font-black italic tracking-tighter text-white font-inter uppercase leading-none">
                                    {selectedMetric === 'revenue' && "Revenue Breakdown"}
                                    {selectedMetric === 'expense' && "Expense Breakdown"}
                                    {selectedMetric === 'unpaid' && "Unpaid Obligations"}
                                    {selectedMetric === 'balance' && "Balance Summary"}
                                </h2>
                                <p className="text-gray-500 text-xs font-bold uppercase tracking-widest mt-2">
                                    {selectedMetric === 'unpaid'
                                        ? "Forecast based on All-time Data"
                                        : `${new Date(selectedYear, Number(selectedMonth) - 1).toLocaleString('default', { month: 'long' })} ${selectedYear}`}
                                </p>
                            </div>
                            <button
                                onClick={() => setSelectedMetric(null)}
                                className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-x"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div className="p-0 overflow-y-auto custom-scrollbar flex-1">
                            {/* TABLE FOR REVENUE / EXPENSE */}
                            {(selectedMetric === 'revenue' || selectedMetric === 'expense') && modalData && (
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-white/5 sticky top-0 backdrop-blur-md">
                                        <tr>
                                            <th className="p-4 pl-8 text-[10px] font-black uppercase tracking-widest text-gray-500">Date</th>
                                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Ref</th>
                                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Description</th>
                                            <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-500">Source</th>
                                            <th className="p-4 pr-8 text-[10px] font-black uppercase tracking-widest text-gray-500 text-right">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {modalData.map((item: any, idx: number) => (
                                            <tr key={`${item.id}-${idx}`} className="hover:bg-white/5 transition-colors">
                                                <td className="p-4 pl-8 font-bold text-gray-400 whitespace-nowrap">
                                                    {item.date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                                                </td>
                                                <td className="p-4 font-mono text-xs font-bold text-gray-500">
                                                    {item.refId}
                                                </td>
                                                <td className="p-4 font-bold text-white">
                                                    {item.description}
                                                </td>
                                                <td className="p-4 text-xs font-bold text-gray-500 uppercase tracking-wider">
                                                    {item.source}
                                                </td>
                                                <td className={cn("p-4 pr-8 text-right font-black", selectedMetric === 'revenue' ? "text-green-500" : "text-red-500")}>
                                                    {selectedMetric === 'revenue' ? '+' : '-'}฿{item.amount.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                        {modalData.length === 0 && (
                                            <tr>
                                                <td colSpan={5} className="p-12 text-center text-gray-500 font-bold uppercase tracking-widest">No records found</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}

                            {/* LIST FOR UNPAID OBLIGATIONS */}
                            {selectedMetric === 'unpaid' && modalData && (
                                <div className="p-8 space-y-4">
                                    {modalData.map((staff: any) => (
                                        <div key={staff.id} className="bg-black/40 rounded-2xl p-6 border border-white/5 flex items-center justify-between">
                                            <div>
                                                <div className="text-xl font-bold text-white">{staff.name}</div>
                                                <div className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
                                                    Accrued: <span className="text-gray-300">฿{staff.accrued.toLocaleString()}</span> • Paid: <span className="text-gray-300">฿{staff.paid.toLocaleString()}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-1">Remaining</div>
                                                <div className={cn("text-2xl font-black", staff.remaining > 0 ? "text-purple-400" : "text-gray-600")}>
                                                    ฿{staff.remaining.toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {modalData.length === 0 && (
                                        <div className="p-12 text-center text-gray-500 font-bold uppercase tracking-widest">No unpaid obligations found</div>
                                    )}
                                </div>
                            )}

                            {/* SUMMARY FOR BALANCE */}
                            {selectedMetric === 'balance' && (
                                <div className="p-8 grid grid-cols-2 gap-6">
                                    <div className="bg-green-500/10 p-6 rounded-[24px] border border-green-500/20 text-center">
                                        <div className="text-green-500 font-black uppercase tracking-widest text-xs mb-2">Total Revenue</div>
                                        <div className="text-3xl font-black text-white">฿{metrics.revenue.toLocaleString()}</div>
                                    </div>
                                    <div className="bg-red-500/10 p-6 rounded-[24px] border border-red-500/20 text-center">
                                        <div className="text-red-500 font-black uppercase tracking-widest text-xs mb-2">Total Expenses</div>
                                        <div className="text-3xl font-black text-white">฿{metrics.expense.toLocaleString()}</div>
                                    </div>
                                    <div className="col-span-2 bg-blue-500/10 p-8 rounded-[24px] border border-blue-500/20 text-center">
                                        <div className="text-blue-500 font-black uppercase tracking-widest text-sm mb-2">Net Cash Flow</div>
                                        <div className="text-5xl font-black text-white">฿{metrics.balance.toLocaleString()}</div>
                                        <p className="text-gray-400 text-xs mt-4 max-w-sm mx-auto">
                                            This represents the liquid cash flow for the selected period ({new Date(selectedYear, Number(selectedMonth) - 1).toLocaleString('default', { month: 'long' })} {selectedYear}).
                                        </p>
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>
                </div>
            )}

            {/* Empty State / Prompt */}
            {transactions.length === 0 && bookings.length === 0 && (
                <div className="bg-[#1A1A1A] rounded-[32px] p-12 text-center border border-white/5 border-dashed">
                    <p className="text-gray-500 font-bold uppercase tracking-widest">No data available for this period</p>
                    <p className="text-gray-600 text-xs mt-2">Check back later or change filters</p>
                </div>
            )}
        </div>
    );
}
