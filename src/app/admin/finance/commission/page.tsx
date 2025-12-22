"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, where, serverTimestamp } from "firebase/firestore";
import { Search, Loader2, DollarSign, CheckCircle2, AlertCircle, Clock, Plus, History, X, ChevronRight, Calculator } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Booking {
    id: string;
    barberId: string;
    barberName: string;
    price: number;
    status: string;
    date: string; // DD/MM/YYYY
    serviceId?: string;
    serviceName?: string; // Often useful if serviceId is missing or for display
    customerName?: string;
    startTime?: string;
    commissionAmount?: number; // Persisted commission value
}

interface PaymentLog {
    id: string;
    barberId: string;
    amount: number;
    date: any;
    note?: string;
    monthKey: string; // e.g., "12-2025"
}

interface BarberServiceConfig {
    barber_id: string;
    service_id: string;
    commission_fixed: number;
    enabled: boolean;
}

interface Barber {
    id: string;
    nickname: string;
    profile_image: string;
}

export default function CommissionPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [payments, setPayments] = useState<PaymentLog[]>([]);
    const [serviceConfigs, setServiceConfigs] = useState<BarberServiceConfig[]>([]);
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [loading, setLoading] = useState(true);

    const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1));
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

    // --- Detail & Payment Modal State ---
    const [selectedBarberId, setSelectedBarberId] = useState<string | null>(null);
    const [showPayModal, setShowPayModal] = useState(false);
    const [payAmount, setPayAmount] = useState("");

    const monthKey = `${selectedMonth}-${selectedYear}`;

    // --- Data Fetching ---
    useEffect(() => {
        const qB = query(collection(db, "bookings"));
        const unsubB = onSnapshot(qB, (snap) => setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking))));

        const qP = query(collection(db, "salary_payments"), orderBy("date", "desc"));
        const unsubP = onSnapshot(qP, (snap) => setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() } as PaymentLog))));

        const qC = query(collection(db, "barberServices"));
        const unsubC = onSnapshot(qC, (snap) => setServiceConfigs(snap.docs.map(d => d.data() as BarberServiceConfig)));

        const qBarb = query(collection(db, "barbers"));
        const unsubBarb = onSnapshot(qBarb, (snap) => setBarbers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Barber))));

        setLoading(false);
        return () => { unsubB(); unsubP(); unsubC(); unsubBarb(); };
    }, []);

    // --- Helper: Get Month Name ---
    const currentMonthName = useMemo(() => {
        return new Date(selectedYear, Number(selectedMonth) - 1).toLocaleString('default', { month: 'long', year: 'numeric' });
    }, [selectedMonth, selectedYear]);

    // --- Main Aggregation ---
    const barberStats = useMemo(() => {
        const stats = new Map<string, {
            name: string;
            totalEarning: number;
            bookingCount: number;
            totalCommission: number;
            totalPaid: number;
            avatar: string;
            jobs: Array<Booking & { commission: number }>; // Store processed jobs
        }>();

        const configMap = new Map<string, number>();
        serviceConfigs.forEach(c => {
            if (c.enabled) {
                configMap.set(`${c.barber_id}_${c.service_id}`, Number(c.commission_fixed) || 0);
            }
        });

        const barberMap = new Map<string, Barber>();
        barbers.forEach(b => barberMap.set(b.id, b));

        // 1. Process Bookings
        bookings.forEach(b => {
            let m, y;
            if (b.date) {
                const parts = b.date.split('/');
                if (parts.length === 3) {
                    m = Number(parts[1]);
                    y = Number(parts[2]);
                }
            }

            if (m !== Number(selectedMonth) || y !== selectedYear) return;

            // STRICT STATUS FILTER
            if (b.status !== 'done') return;

            if (!stats.has(b.barberId)) {
                const barberInfo = barberMap.get(b.barberId);
                stats.set(b.barberId, {
                    name: barberInfo ? barberInfo.nickname : b.barberName,
                    totalEarning: 0,
                    bookingCount: 0,
                    totalCommission: 0,
                    totalPaid: 0,
                    avatar: barberInfo?.profile_image || "",
                    jobs: []
                });
            }

            const s = stats.get(b.barberId)!;

            // Calculate Commission for this specific job
            let commission = 0;

            if (typeof b.commissionAmount === 'number') {
                commission = b.commissionAmount;
            } else if (b.serviceId) {
                const key = `${b.barberId}_${b.serviceId}`;
                commission = configMap.get(key) || 0;
            }

            s.bookingCount += 1;
            s.totalEarning += (Number(b.price) || 0);
            s.totalCommission += commission;

            s.jobs.push({
                ...b,
                commission
            });
        });

        // 2. Process Payments
        payments.forEach(p => {
            if (p.monthKey !== monthKey) return;
            if (stats.has(p.barberId)) {
                stats.get(p.barberId)!.totalPaid += (Number(p.amount) || 0);
            }
        });

        return Array.from(stats.entries()).map(([id, data]) => ({
            id,
            ...data,
            remaining: data.totalCommission - data.totalPaid
        }));

    }, [bookings, payments, serviceConfigs, barbers, selectedMonth, selectedYear, monthKey]);

    // --- Derived State for Selected Barber ---
    const activeBarberData = useMemo(() => {
        return barberStats.find(b => b.id === selectedBarberId) || null;
    }, [selectedBarberId, barberStats]);

    const activeBarberPayments = useMemo(() => {
        if (!selectedBarberId) return [];
        return payments.filter(p => p.barberId === selectedBarberId && p.monthKey === monthKey);
    }, [selectedBarberId, payments, monthKey]);


    // --- Actions ---
    const handlePay = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBarberId || !payAmount) return;

        try {
            await addDoc(collection(db, "salary_payments"), {
                barberId: selectedBarberId,
                amount: parseFloat(payAmount),
                date: serverTimestamp(),
                monthKey,
                note: "Partial Payout"
            });
            setShowPayModal(false);
            setPayAmount("");
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20 relative">
            {/* Header & Filters */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl font-black italic tracking-tighter text-white mb-2 font-inter uppercase">Commission</h1>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">Staff Profit Share</p>
                </div>

                <div className="flex items-center gap-4 bg-[#1A1A1A] p-2 rounded-2xl border border-white/5">
                    <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(e.target.value)}
                        className="bg-black text-white font-bold text-sm px-4 py-2 rounded-xl border border-white/10 outline-none focus:border-white/30"
                    >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                            <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}</option>
                        ))}
                    </select>
                    <select
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="bg-black text-white font-bold text-sm px-4 py-2 rounded-xl border border-white/10 outline-none focus:border-white/30"
                    >
                        {[2024, 2025].map(y => (
                            <option key={y} value={y}>{y}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="grid grid-cols-1 gap-4">
                {loading ? (
                    <div className="text-center py-20 text-gray-500 font-bold animate-pulse">Loading commissions...</div>
                ) : barberStats.length === 0 ? (
                    <div className="bg-[#1A1A1A] rounded-[32px] p-20 text-center border border-white/5 border-dashed">
                        <p className="text-gray-500 font-bold uppercase tracking-widest">No 'DONE' bookings found for this period</p>
                    </div>
                ) : (
                    barberStats.map(stat => {
                        const status = stat.remaining <= 0 ? 'paid' : stat.totalPaid > 0 ? 'partial' : 'pending';
                        return (
                            <div
                                key={stat.id}
                                onClick={() => setSelectedBarberId(stat.id)}
                                className="bg-[#1A1A1A] p-6 lg:p-8 rounded-[32px] border border-white/5 hover:border-white/20 transition-all group cursor-pointer active:scale-[0.99]"
                            >
                                <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-8">
                                    <div className="flex items-center gap-6">
                                        <div className="w-20 h-20 rounded-full bg-gray-800 border-2 border-white/10 overflow-hidden relative shadow-2xl shrink-0">
                                            {stat.avatar ? (
                                                <img src={stat.avatar} alt={stat.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-xl font-black text-gray-600">
                                                    {stat.name[0]}
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <h3 className="text-3xl font-black text-white italic uppercase tracking-tighter group-hover:text-amber-500 transition-colors">{stat.name}</h3>
                                            <div className="text-xs font-bold text-gray-400 uppercase tracking-widest flex flex-wrap items-center gap-3 mt-2">
                                                <span className="bg-white/10 px-3 py-1 rounded-full text-white">{stat.bookingCount} Jobs</span>
                                                <span className="w-1 h-1 bg-gray-600 rounded-full hidden md:block" />
                                                <span className="hidden md:inline">Rev: ฿{stat.totalEarning.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stats Summary */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1 xl:max-w-4xl">
                                        <div className="bg-black/40 p-5 rounded-[24px] border border-white/5 flex flex-col justify-center">
                                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Total Commission</div>
                                            <div className="text-2xl font-black text-white tracking-tight">฿{stat.totalCommission.toLocaleString()}</div>
                                        </div>
                                        <div className="bg-black/40 p-5 rounded-[24px] border border-white/5 flex flex-col justify-center">
                                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Paid</div>
                                            <div className="text-xl font-black text-green-500 tracking-tight">฿{stat.totalPaid.toLocaleString()}</div>
                                        </div>
                                        <div className="bg-black/40 p-5 rounded-[24px] border border-white/5 flex flex-col justify-center">
                                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-500 mb-1">Remaining</div>
                                            <div className="text-xl font-black text-red-500 tracking-tight">฿{Math.max(0, stat.remaining).toLocaleString()}</div>
                                        </div>
                                        <div className="flex items-center justify-center">
                                            {status === 'paid' ? (
                                                <div className="w-full py-4 rounded-[24px] bg-green-500/20 text-green-400 text-sm font-black italic uppercase tracking-wider border border-green-500/20 flex flex-col items-center justify-center gap-1">
                                                    <CheckCircle2 className="w-5 h-5 mb-1" />
                                                    <span>Paid</span>
                                                </div>
                                            ) : (
                                                <div className={cn(
                                                    "w-full h-full py-4 rounded-[24px] font-black uppercase tracking-wider transition-all shadow-lg flex flex-col items-center justify-center gap-1",
                                                    status === 'partial'
                                                        ? "bg-amber-500/20 text-amber-500 border border-amber-500/20"
                                                        : "bg-white/10 text-gray-400 border border-white/10"
                                                )}>
                                                    <div className="text-[10px]">{status}</div>
                                                    <div className="text-xs">Tap to Details</div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>

            {/* --- DETAIL MODAL (Refined) --- */}
            {selectedBarberId && activeBarberData && (
                <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/90 backdrop-blur-xl p-0 sm:p-4 animate-in fade-in duration-300">
                    <div className="bg-[#121212] w-full max-w-4xl h-[90vh] sm:h-[85vh] rounded-t-[40px] sm:rounded-[40px] border border-white/10 flex flex-col shadow-2xl relative overflow-hidden">

                        {/* Close Button */}
                        <button
                            onClick={() => setSelectedBarberId(null)}
                            className="absolute top-6 right-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white transition-colors z-10"
                        >
                            <X className="w-6 h-6" />
                        </button>

                        {/* Modal Header */}
                        <div className="p-8 pb-6 border-b border-white/5 bg-[#121212]">
                            <div className="flex items-center gap-6">
                                <div className="w-16 h-16 rounded-full bg-gray-800 border-2 border-white/10 overflow-hidden relative shadow-2xl shrink-0">
                                    {activeBarberData.avatar ? (
                                        <img src={activeBarberData.avatar} alt={activeBarberData.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-xl font-black text-gray-600">
                                            {activeBarberData.name[0]}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter">Commission Details</h2>
                                    <div className="flex items-center gap-3 mt-1">
                                        <span className="text-lg font-bold text-amber-500 uppercase tracking-widest">{activeBarberData.name}</span>
                                        <span className="w-1 h-1 bg-gray-600 rounded-full" />
                                        <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">{currentMonthName}</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Modal Content: Scrollable */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            <div className="p-8 pt-0 space-y-8">

                                {/* 1. Job Breakdown Table */}
                                <div>
                                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 mt-8 flex items-center gap-2">
                                        <Calculator className="w-4 h-4" /> Job Breakdown ({activeBarberData.jobs.length})
                                    </h3>
                                    <div className="bg-white/5 rounded-3xl overflow-hidden border border-white/5">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="bg-white/5 border-b border-white/5">
                                                    <th className="p-4 pl-6 text-[10px] font-black uppercase tracking-widest text-gray-400">Date/Time</th>
                                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Customer</th>
                                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Service</th>
                                                    <th className="p-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Revenue</th>
                                                    <th className="p-4 pr-6 text-[10px] font-black uppercase tracking-widest text-amber-500 text-right">Commission</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-white/5">
                                                {activeBarberData.jobs.sort((a, b) => b.id.localeCompare(a.id)).map((job) => (
                                                    <tr key={job.id} className="hover:bg-white/5 transition-colors">
                                                        <td className="p-4 pl-6 font-bold text-gray-300">
                                                            {job.date}
                                                            {job.startTime && <span className="block text-[10px] text-gray-500 font-medium">{job.startTime}</span>}
                                                        </td>
                                                        <td className="p-4 font-medium text-gray-400">{job.customerName || "-"}</td>
                                                        <td className="p-4 font-medium text-gray-400">{job.serviceName || "Standard Service"}</td>
                                                        <td className="p-4 text-right font-bold text-gray-300">฿{job.price.toLocaleString()}</td>
                                                        <td className="p-4 pr-6 text-right font-black italic text-amber-500">฿{job.commission.toLocaleString()}</td>
                                                    </tr>
                                                ))}
                                                {activeBarberData.jobs.length === 0 && (
                                                    <tr>
                                                        <td colSpan={5} className="p-8 text-center text-gray-500 font-bold uppercase tracking-widest text-xs">No jobs found</td>
                                                    </tr>
                                                )}
                                            </tbody>
                                            {/* Summary Row */}
                                            <tfoot className="bg-white/5 border-t border-white/5">
                                                <tr>
                                                    <td colSpan={3} className="p-4 pl-6 text-xs font-black uppercase tracking-widest text-right text-gray-400">Totals</td>
                                                    <td className="p-4 text-right font-black text-white">฿{activeBarberData.totalEarning.toLocaleString()}</td>
                                                    <td className="p-4 pr-6 text-right font-black italic text-amber-500 text-lg">฿{activeBarberData.totalCommission.toLocaleString()}</td>
                                                </tr>
                                            </tfoot>
                                        </table>
                                    </div>
                                </div>

                                {/* 2. Payment History */}
                                <div>
                                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                                        <History className="w-4 h-4" /> Payment History
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {activeBarberPayments.map(p => (
                                            <div key={p.id} className="bg-green-900/10 p-4 rounded-2xl flex justify-between items-center border border-green-500/20">
                                                <div>
                                                    <div className="text-green-400 font-black text-lg">฿{Number(p.amount).toLocaleString()}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">
                                                        {p.date ? new Date(p.date.seconds * 1000).toLocaleString() : 'Just now'}
                                                    </div>
                                                </div>
                                                <div className="bg-green-500/20 p-2 rounded-full">
                                                    <CheckCircle2 className="w-4 h-4 text-green-500" />
                                                </div>
                                            </div>
                                        ))}
                                        {activeBarberPayments.length === 0 && (
                                            <div className="col-span-2 p-6 rounded-2xl border border-white/5 border-dashed text-center">
                                                <p className="text-gray-600 font-bold text-xs uppercase tracking-widest">No payments recorded</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sticky Footer: Actions */}
                        <div className="p-6 border-t border-white/5 bg-[#1A1A1A] flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-start">
                                <div>
                                    <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Total Paid</div>
                                    <div className="text-2xl font-black text-green-500">฿{activeBarberData.totalPaid.toLocaleString()}</div>
                                </div>
                                <div className="w-px h-8 bg-white/10 hidden md:block" />
                                <div>
                                    <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest">Remaining</div>
                                    <div className="text-2xl font-black text-red-500">฿{Math.max(0, activeBarberData.remaining).toLocaleString()}</div>
                                </div>
                            </div>

                            {activeBarberData.remaining > 0 ? (
                                <button
                                    onClick={() => { setPayAmount(Math.max(0, activeBarberData.remaining).toString()); setShowPayModal(true); }}
                                    className="w-full md:w-auto px-8 py-4 bg-white text-black rounded-xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center justify-center gap-2 shadow-lg shadow-white/5 active:scale-95"
                                >
                                    <DollarSign className="w-5 h-5" /> Record Payment
                                </button>
                            ) : (
                                <div className="px-8 py-4 bg-green-500/20 text-green-500 rounded-xl font-black uppercase tracking-widest border border-green-500/20 flex items-center gap-2">
                                    <CheckCircle2 className="w-5 h-5" /> All Paid
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* --- RECORD PAYMENT MODAL (Nested) --- */}
            {showPayModal && selectedBarberId && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-[#0A0A0A] w-full max-w-sm rounded-[32px] border border-white/20 p-6 shadow-2xl">
                        <h3 className="text-lg font-black text-white uppercase italic tracking-tighter mb-4">Record Payout</h3>
                        <form onSubmit={handlePay}>
                            <div className="bg-[#1A1A1A] p-4 rounded-2xl border border-white/5 mb-4">
                                <label className="text-[9px] font-black uppercase tracking-widest text-gray-500 block mb-2 pl-1">Amount</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-black">฿</span>
                                    <input
                                        type="number"
                                        value={payAmount}
                                        onChange={e => setPayAmount(e.target.value)}
                                        className="w-full bg-black text-white font-black text-xl pl-8 pr-4 py-3 rounded-xl outline-none focus:ring-1 focus:ring-amber-500 transition-all"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => setShowPayModal(false)} className="py-3 rounded-xl border border-white/10 text-gray-400 font-bold text-xs hover:bg-white/5 uppercase tracking-wide">Cancel</button>
                                <button type="submit" className="py-3 rounded-xl bg-amber-500 text-black font-black text-xs hover:bg-amber-400 uppercase tracking-wide">Confirm</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

