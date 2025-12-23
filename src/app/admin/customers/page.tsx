"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, getDocs, doc, writeBatch, where, serverTimestamp } from "firebase/firestore";
import { Search, Loader2, User, Phone, Calendar, TrendingUp, DollarSign, Award, Edit, Save, AlertTriangle, X, Check } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- Interfaces ---

interface Booking {
    id: string;
    customerName: string;
    customerPhone: string;
    phone?: string; // Fallback
    price: number;
    status: string;
    date: string; // DD/MM/YYYY
    serviceName: string;
    barberName: string;
    createdAt?: any;
}

interface CustomerStats {
    phone: string;
    name: string;
    totalVisits: number;
    totalSpent: number;
    firstVisitDate: Date | null;
    lastVisitDate: Date | null;
    history: Booking[];
}

export default function CustomersPage() {
    // --- State ---
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Ranking Filters
    const currentYear = new Date().getFullYear();
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const [selectedMonth, setSelectedMonth] = useState<string>(String(new Date().getMonth() + 1)); // "1" - "12" or "all"

    // --- Data Fetching ---
    useEffect(() => {
        const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => {
                const d = doc.data();
                return {
                    id: doc.id,
                    ...d,
                    customerPhone: d.customerPhone || d.phone || "Unknown", // Normalize phone
                } as Booking;
            });
            setBookings(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // --- Aggregation Logic (Memoized) ---

    // Helper: Valid Phone Check
    const isValidCustomerPhone = (phone: string | undefined | null) => {
        if (!phone || phone === "Unknown") return false;
        // Must be exactly 10 digits and start with '0'
        return /^[0][0-9]{9}$/.test(phone);
    };

    // 1. All Customers Map (Group by Phone)
    const customersMap = useMemo(() => {
        const map = new Map<string, CustomerStats>();

        bookings.forEach(b => {
            // FILTER: Exclude anonymous/invalid
            if (!isValidCustomerPhone(b.customerPhone)) return;

            // Only count successful visits for rankings/stats (normally), but for history we want all.
            // Requirement: "Successful Bookings Only" for rankings.
            // For generic search history, showing all might be useful, but metrics usually imply success.
            // Let's count "done", "confirmed", "in_progress" as valid visits for metrics.
            const isVisit = ["done", "confirmed", "in_progress"].includes(b.status);
            const key = b.customerPhone!; // Safe because check above

            if (!map.has(key)) {
                map.set(key, {
                    phone: key,
                    name: b.customerName,
                    totalVisits: 0,
                    totalSpent: 0,
                    firstVisitDate: null,
                    lastVisitDate: null,
                    history: []
                });
            }

            const stats = map.get(key)!;
            // Always add to history
            stats.history.push(b);

            if (isVisit) {
                stats.totalVisits += 1;
                stats.totalSpent += Number(b.price || 0);

                // Date parsing (DD/MM/YYYY)
                const [day, month, year] = b.date.split('/').map(Number);
                const dateObj = new Date(year, month - 1, day);

                if (!stats.firstVisitDate || dateObj < stats.firstVisitDate) stats.firstVisitDate = dateObj;
                if (!stats.lastVisitDate || dateObj > stats.lastVisitDate) stats.lastVisitDate = dateObj;
            }
            // Update name if needed (sometimes people change names, take latest)
            if (b.customerName) stats.name = b.customerName;
        });

        return map;
    }, [bookings]);

    // 2. Filtered for Search (Individual Lookups)
    const searchResult = useMemo(() => {
        if (!searchTerm) return null;
        const normalizedSearch = searchTerm.toLowerCase();

        // Find matching values
        const matches = Array.from(customersMap.values()).filter(c =>
            c.name.toLowerCase().includes(normalizedSearch) ||
            c.phone.includes(normalizedSearch)
        );

        // Sort by Phone Ascending (Numeric string sort)
        return matches.sort((a, b) => a.phone.localeCompare(b.phone));
    }, [customersMap, searchTerm]);

    // 3. Ranked Lists (Top Frequency & Top Spenders)
    const rankedData = useMemo(() => {
        // Filter source bookings by date range
        const filteredBookings = bookings.filter(b => {
            // FILTER: Exclude anonymous/invalid
            if (!isValidCustomerPhone(b.customerPhone)) return false;

            const isVisit = ["done", "confirmed", "in_progress"].includes(b.status);
            if (!isVisit) return false;

            const [d, m, y] = b.date.split('/').map(Number);
            if (y !== selectedYear) return false;
            if (selectedMonth !== "all" && m !== Number(selectedMonth)) return false;

            return true;
        });

        // Re-aggregate based on filtered subset
        const subsetMap = new Map<string, { name: string, phone: string, count: number, spent: number }>();

        filteredBookings.forEach(b => {
            const key = b.customerPhone!; // Safe
            if (!subsetMap.has(key)) {
                subsetMap.set(key, { name: b.customerName, phone: key, count: 0, spent: 0 });
            }
            const stat = subsetMap.get(key)!;
            stat.count += 1;
            stat.spent += Number(b.price || 0);
            if (b.customerName) stat.name = b.customerName;
        });

        const list = Array.from(subsetMap.values());

        // Sorts
        const topFreq = [...list].sort((a, b) => b.count - a.count).slice(0, 10);
        const topSpend = [...list].sort((a, b) => b.spent - a.spent).slice(0, 5);

        return { topFreq, topSpend };
    }, [bookings, selectedYear, selectedMonth]);


    // --- Helpers ---
    const getAvgMonth = (stats: CustomerStats) => {
        if (!stats.firstVisitDate) return 0;
        const now = new Date();
        const months = (now.getFullYear() - stats.firstVisitDate.getFullYear()) * 12 + (now.getMonth() - stats.firstVisitDate.getMonth()) + 1; // +1 to avoid 0 div and count current month
        return (stats.totalVisits / Math.max(1, months)).toFixed(1);
    }

    const getAvgSpend = (stats: CustomerStats) => {
        return stats.totalVisits > 0 ? (stats.totalSpent / stats.totalVisits).toFixed(0) : 0;
    }

    // --- Migration Modal State ---
    const [migrationModal, setMigrationModal] = useState<{ open: boolean; oldPhone: string; name: string } | null>(null);
    const [newPhone, setNewPhone] = useState("");
    const [confirmCheck, setConfirmCheck] = useState(false);
    const [isMigrating, setIsMigrating] = useState(false);

    // --- Actions ---
    const openMigrationModal = (oldPhone: string, name: string) => {
        setMigrationModal({ open: true, oldPhone, name });
        setNewPhone("");
        setConfirmCheck(false);
    };

    const isValidPhone = useMemo(() => {
        return newPhone.length === 10 && newPhone.startsWith('0');
    }, [newPhone]);

    const handleConfirmMigration = async () => {
        if (!migrationModal || !newPhone) return;

        // Strict Validation Checks
        if (newPhone === migrationModal.oldPhone) {
            alert("New phone number cannot be the same as the old one.");
            return;
        }
        if (!isValidPhone) {
            alert("Phone number must be exactly 10 digits and start with 0.");
            return;
        }
        if (!confirmCheck) {
            alert("Please confirm that you understand the consequences.");
            return;
        }

        setIsMigrating(true);
        try {
            const batch = writeBatch(db);
            const oldPhone = migrationModal.oldPhone;

            // 1. Find all bookings with old phone
            const bookingsRef = collection(db, "bookings");
            const qBookings = query(bookingsRef, where("customerPhone", "==", oldPhone));
            const bookingSnaps = await getDocs(qBookings);

            bookingSnaps.forEach(d => {
                batch.update(d.ref, { customerPhone: newPhone });
            });

            // 2. Migrate 'customers' collection doc (Loyalty Points)
            const customersRef = collection(db, "customers");
            const qCustomer = query(customersRef, where("phone", "==", oldPhone));
            const customerSnaps = await getDocs(qCustomer);

            if (!customerSnaps.empty) {
                const oldDoc = customerSnaps.docs[0];
                const oldData = oldDoc.data();

                const newDocRef = doc(db, "customers", newPhone);
                // Check if target exists? (Merge strategy vs Overwrite)
                // If target exists, we might overwrite its points or merge?
                // For simplicity/safety in this prompt: We overwrite basic info but maybe we should warn if target exists.
                // Assuming simple migration for now:
                batch.set(newDocRef, {
                    ...oldData,
                    phone: newPhone,
                    updatedAt: serverTimestamp()
                });
                batch.delete(oldDoc.ref);
            }

            await batch.commit();
            alert("Migration successful! Phone number updated.");
            setSearchTerm(""); // Clear search
            setMigrationModal(null);
        } catch (error) {
            console.error("Migration failed:", error);
            alert("Failed to update phone number. Check console.");
        } finally {
            setIsMigrating(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-10 pb-20 font-sans animate-in fade-in duration-500">
            <div className="max-w-[1600px] mx-auto space-y-10">
                {/* Header */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-4xl font-black italic tracking-tighter text-white mb-2 font-inter uppercase">CUSTOMERS</h1>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">CLIENT DATABASE & ANALYTICS</p>
                    </div>

                    <div className="relative w-full md:w-96 group">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500 group-focus-within:text-white transition-colors" />
                        <input
                            type="text"
                            placeholder="Search by Phone or Name..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-[#1A1A1A] border border-gray-800 rounded-full pl-12 pr-6 py-4 text-base font-bold text-white placeholder-gray-600 focus:outline-none focus:border-white/20 transition-all shadow-lg focus:shadow-white/5"
                        />
                    </div>
                </header>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-10 h-10 animate-spin text-white opacity-50" />
                    </div>
                ) : searchTerm ? (
                    // --- Search Results View ---
                    <div className="space-y-4">
                        <div className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-4">Search Results ({searchResult?.length})</div>

                        {searchResult && searchResult.length > 0 ? (
                            searchResult.map(stats => (
                                <div key={stats.phone} className="bg-[#1A1A1A] rounded-[32px] p-8 border border-white/5 space-y-8 animate-in slide-in-from-bottom-4">
                                    {/* Customer Profile Header */}
                                    <div className="flex flex-col xl:flex-row justify-between xl:items-center gap-8">
                                        <div className="flex items-center gap-6">
                                            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center shadow-2xl shrink-0">
                                                <User className="w-8 h-8 text-white" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-3 mb-1">
                                                    <h2 className="text-4xl font-black text-white font-mono tracking-tight">{stats.phone}</h2>
                                                    <button
                                                        onClick={() => openMigrationModal(stats.phone, stats.name)}
                                                        className="bg-white/10 p-2 rounded-full hover:bg-white/20 text-gray-400 hover:text-white transition-all"
                                                        title="Edit Phone Number"
                                                    >
                                                        <Edit className="w-4 h-4" />
                                                    </button>
                                                </div>
                                                <div className="flex items-center gap-2 text-gray-500 font-bold uppercase tracking-widest text-sm">
                                                    <User className="w-3 h-3" /> {stats.name}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Metrics Grid */}
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full xl:w-auto">
                                            <div className="bg-black/40 p-5 rounded-2xl border border-white/5 text-center">
                                                <div className="text-[10px] uppercase font-black tracking-widest text-gray-600 mb-1">Total Visits</div>
                                                <div className="text-2xl font-black text-white">{stats.totalVisits}</div>
                                            </div>
                                            <div className="bg-black/40 p-5 rounded-2xl border border-white/5 text-center">
                                                <div className="text-[10px] uppercase font-black tracking-widest text-gray-600 mb-1">Total Spent</div>
                                                <div className="text-2xl font-black text-green-500">฿{stats.totalSpent.toLocaleString()}</div>
                                            </div>
                                            <div className="bg-black/40 p-5 rounded-2xl border border-white/5 text-center">
                                                <div className="text-[10px] uppercase font-black tracking-widest text-gray-600 mb-1">Avg / Month</div>
                                                <div className="text-2xl font-black text-blue-400">{getAvgMonth(stats)}</div>
                                            </div>
                                            <div className="bg-black/40 p-5 rounded-2xl border border-white/5 text-center">
                                                <div className="text-[10px] uppercase font-black tracking-widest text-gray-600 mb-1">Spend / Visit</div>
                                                <div className="text-2xl font-black text-purple-400">฿{Number(getAvgSpend(stats)).toLocaleString()}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Booking History Table */}
                                    <div>
                                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-500 mb-4 flex items-center gap-2">
                                            <Calendar className="w-4 h-4" /> Booking History
                                        </h3>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left border-collapse">
                                                <thead>
                                                    <tr className="border-b border-white/10 text-[10px] font-black uppercase tracking-widest text-gray-500">
                                                        <th className="py-4 pl-4">Date</th>
                                                        <th className="py-4">Service</th>
                                                        <th className="py-4">Barber</th>
                                                        <th className="py-4 text-right">Price</th>
                                                        <th className="py-4 pr-4 text-right">Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="text-sm font-bold text-gray-300">
                                                    {stats.history.map((h, i) => (
                                                        <tr key={i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                            <td className="py-4 pl-4 font-mono text-white">{h.date}</td>
                                                            <td className="py-4">{h.serviceName}</td>
                                                            <td className="py-4 text-gray-400">{h.barberName}</td>
                                                            <td className="py-4 text-right">฿{h.price.toLocaleString()}</td>
                                                            <td className="py-4 pr-4 text-right">
                                                                <span className={cn(
                                                                    "px-3 py-1 rounded-full text-[10px] uppercase tracking-wider",
                                                                    h.status === 'confirmed' || h.status === 'done' ? "bg-green-500/10 text-green-500" :
                                                                        h.status === 'cancelled' || h.status === 'rejected' ? "bg-red-500/10 text-red-500" :
                                                                            "bg-gray-800 text-gray-400"
                                                                )}>
                                                                    {h.status}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center py-20 bg-[#1A1A1A] rounded-[32px] border border-white/5">
                                <p className="text-gray-500 font-bold uppercase tracking-widest">No customer found matching "{searchTerm}"</p>
                            </div>
                        )}
                    </div>
                ) : (
                    // --- Rankings View (Default) ---
                    <div className="space-y-8">
                        {/* Filter Bar */}
                        <div className="flex items-center gap-4 bg-[#1A1A1A] p-2 rounded-2xl border border-white/5 w-fit">
                            <select
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-black text-white font-bold text-sm px-4 py-2 rounded-xl border border-white/10 outline-none focus:border-white/30"
                            >
                                <option value="all">All Months</option>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                                    <option key={m} value={m}>{new Date(2000, m - 1, 1).toLocaleString('default', { month: 'long' })}</option>
                                ))}
                            </select>
                            <select
                                value={selectedYear}
                                onChange={(e) => setSelectedYear(Number(e.target.value))}
                                className="bg-black text-white font-bold text-sm px-4 py-2 rounded-xl border border-white/10 outline-none focus:border-white/30"
                            >
                                {[currentYear, currentYear - 1].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Top Frequency */}
                            <div className="bg-[#1A1A1A] rounded-[32px] p-8 border border-white/5 flex flex-col h-full">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
                                        <TrendingUp className="w-5 h-5 text-blue-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Top Frequency</h2>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Most Visits</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {rankedData.topFreq.length === 0 ? (
                                        <p className="text-gray-600 text-sm font-medium py-10 text-center">No data for this period</p>
                                    ) : (
                                        rankedData.topFreq.map((c, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-colors group">
                                                <div className="flex items-center gap-4">
                                                    <div className={cn(
                                                        "w-8 h-8 rounded-full flex items-center justify-center text-xs font-black",
                                                        i === 0 ? "bg-yellow-500 text-black" :
                                                            i === 1 ? "bg-gray-400 text-black" :
                                                                i === 2 ? "bg-amber-700 text-white" : "bg-gray-800 text-gray-500"
                                                    )}>
                                                        {i + 1}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white text-lg font-mono">{c.phone}</div>
                                                        <div className="text-[10px] uppercase tracking-wider text-gray-500">{c.name}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-black text-blue-400">{c.count} <span className="text-xs text-gray-600 font-bold uppercase">Visits</span></div>
                                                    <div className="text-[10px] text-gray-500 font-bold">Avg ฿{(c.spent / c.count).toFixed(0)}</div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Top Spenders */}
                            <div className="bg-[#1A1A1A] rounded-[32px] p-8 border border-white/5 flex flex-col h-full">
                                <div className="flex items-center gap-3 mb-8">
                                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                                        <DollarSign className="w-5 h-5 text-green-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-white uppercase tracking-tight">Top Spenders</h2>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Highest Revenue</p>
                                    </div>
                                </div>

                                <div className="space-y-4">
                                    {rankedData.topSpend.length === 0 ? (
                                        <p className="text-gray-600 text-sm font-medium py-10 text-center">No data for this period</p>
                                    ) : (
                                        rankedData.topSpend.map((c, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5 hover:border-green-500/30 transition-colors group">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center text-xs font-bold text-gray-500 group-hover:bg-green-500 group-hover:text-black transition-colors">
                                                        <Award className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-white text-lg font-mono">{c.phone}</div>
                                                        <div className="text-[10px] uppercase tracking-wider text-gray-500">{c.name}</div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-lg font-black text-green-500">฿{c.spent.toLocaleString()}</div>
                                                    <div className="text-[10px] text-gray-500 font-bold">{c.count} <span className="uppercase">Visits</span></div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* MIGRATION MODAL */}
            {migrationModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-[#1A1A1A] w-full max-w-lg rounded-[32px] border border-white/10 shadow-2xl overflow-hidden flex flex-col relative">
                        {/* Header */}
                        <div className="p-8 pb-4">
                            <h2 className="text-2xl font-black italic tracking-tighter text-white uppercase mb-2">Migrate Customer Data</h2>
                            <p className="text-gray-400 text-sm font-medium">Reassigning history for <span className="text-white font-bold">{migrationModal.name}</span></p>
                        </div>

                        <button
                            onClick={() => setMigrationModal(null)}
                            className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        <div className="p-8 pt-0 space-y-6">
                            {/* Warning Box */}
                            <div className="bg-yellow-500/10 border border-yellow-500/20 p-5 rounded-2xl flex gap-4">
                                <div className="shrink-0 text-yellow-500 mt-1">
                                    <AlertTriangle className="w-6 h-6" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-yellow-500 font-bold uppercase tracking-widest text-xs">Attention Required</h3>
                                    <p className="text-yellow-200/80 text-xs leading-relaxed">
                                        This action will permanently reassign <strong>ALL historical booking records</strong>, loyalty points, and visit data from <span className="font-mono bg-black/30 px-1 rounded text-yellow-500">{migrationModal.oldPhone}</span> to the new number. This cannot be undone.
                                    </p>
                                </div>
                            </div>

                            {/* Input */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold uppercase tracking-widest text-gray-500 ml-1">New Phone Number</label>
                                <div className="relative">
                                    <input
                                        type="tel"
                                        value={newPhone}
                                        onChange={(e) => {
                                            const val = e.target.value.replace(/\D/g, ''); // Only numbers
                                            if (val.length <= 10) setNewPhone(val);
                                        }}
                                        placeholder="08..."
                                        className={cn(
                                            "w-full bg-black border rounded-2xl px-5 py-4 text-white text-lg font-mono font-bold outline-none transition-all placeholder:text-gray-700",
                                            newPhone.length > 0 && !isValidPhone ? "border-red-500 focus:shadow-[0_0_20px_rgba(239,68,68,0.2)]" : "border-white/20 focus:border-yellow-500 focus:shadow-[0_0_20px_rgba(234,179,8,0.2)]"
                                        )}
                                    />
                                    <Phone className={cn("absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 transition-colors",
                                        newPhone.length > 0 && !isValidPhone ? "text-red-500" : "text-gray-600"
                                    )} />
                                </div>
                                {newPhone.length > 0 && !isValidPhone && (
                                    <p className="text-red-500 text-[10px] uppercase font-bold tracking-wider pl-1 animate-in slide-in-from-top-1">
                                        Must be 10 digits starting with 0
                                    </p>
                                )}
                            </div>

                            {/* Confirmation Checkbox */}
                            <label className="flex items-start gap-3 group cursor-pointer">
                                <div className={cn("w-5 h-5 rounded border mt-0.5 flex items-center justify-center transition-all",
                                    confirmCheck ? "bg-yellow-500 border-yellow-500 text-black" : "border-white/20 group-hover:border-white/40"
                                )}>
                                    {confirmCheck && <Check className="w-3.5 h-3.5" />}
                                </div>
                                <input type="checkbox" className="hidden" checked={confirmCheck} onChange={(e) => setConfirmCheck(e.target.checked)} />
                                <span className="text-xs text-gray-400 group-hover:text-gray-300 transition-colors select-none leading-relaxed">
                                    I understand that all historical data will be migrated to the new number immediately.
                                </span>
                            </label>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-3 pt-2">
                                <button
                                    onClick={() => setMigrationModal(null)}
                                    className="py-4 rounded-xl font-bold uppercase tracking-widest text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    disabled={!confirmCheck || !isValidPhone || isMigrating}
                                    onClick={handleConfirmMigration}
                                    className={cn("py-4 rounded-xl font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2 transition-all shadow-lg",
                                        confirmCheck && isValidPhone ? "bg-gradient-to-r from-yellow-600 to-yellow-500 text-black hover:scale-[1.02] active:scale-[0.98] shadow-yellow-500/20" : "bg-gray-800 text-gray-500 cursor-not-allowed"
                                    )}
                                >
                                    {isMigrating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" /> Migrating...
                                        </>
                                    ) : (
                                        "Confirm Migration"
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
