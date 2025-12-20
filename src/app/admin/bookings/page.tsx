"use client";

import { useState, useEffect, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, getDocs, orderBy, doc, updateDoc, Timestamp } from "firebase/firestore";
import {
    ChevronLeft,
    ChevronRight,
    Calendar as CalendarIcon,
    List as ListIcon,
    Search,
    Filter,
    Clock,
    User,
    Scissors,
    CheckCircle2,
    XCircle,
    MoreHorizontal,
    Plus,
    Phone
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- Types ---
interface Barber {
    id: string;
    nickname: string;
    profile_image?: string;
}

interface Booking {
    id: string;
    customerName: string;
    customerPhone?: string; // Should be fetched/stored
    phone?: string; // Alternate field mapping
    serviceName: string;
    barberId: string;
    barberName: string;
    date: string; // DD/MM/YYYY
    time: string; // HH:mm
    duration?: number; // hours
    duration_min?: number;
    price: number;
    status: "pending" | "confirmed" | "rejected" | "in_progress" | "done" | "cancelled";
    slipUrl?: string;
}

export default function AdminBookingsPage() {
    const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
    const [currentDate, setCurrentDate] = useState(new Date());
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [selectedBarberId, setSelectedBarberId] = useState<string>("all");
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<"all" | "morning" | "afternoon" | "evening">("all");
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

    // --- Data Fetching ---
    useEffect(() => {
        const fetchBarbers = async () => {
            const snap = await getDocs(collection(db, "barbers"));
            setBarbers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Barber)));
        };
        fetchBarbers();
    }, []);

    useEffect(() => {
        const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snap) => {
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));
            setBookings(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // --- Logic & Memoization ---
    const formatDate = (date: Date) => date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }); // DD/MM/YYYY

    const filteredBookings = useMemo(() => {
        return bookings.filter(b => {
            // 1. Barber Filter
            if (selectedBarberId !== "all" && b.barberId !== selectedBarberId) return false;

            // 2. Time Slot Filter
            if (selectedTimeSlot !== "all") {
                const [h] = b.time.split(':').map(Number);
                if (selectedTimeSlot === "morning" && h >= 13) return false;
                if (selectedTimeSlot === "afternoon" && (h < 13 || h >= 17)) return false;
                if (selectedTimeSlot === "evening" && h < 17) return false;
            }

            return true;
        });
    }, [bookings, selectedBarberId, selectedTimeSlot]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'confirmed': return "bg-green-500 text-white";
            case 'in_progress': return "bg-blue-500 text-white";
            case 'done': return "bg-gray-800 text-white";
            case 'pending': return "bg-amber-500 text-white";
            case 'rejected': case 'cancelled': return "bg-red-500 text-white";
            default: return "bg-gray-500 text-white";
        }
    };

    // --- Renderers ---

    const renderCalendarView = () => {
        const hours = Array.from({ length: 12 }, (_, i) => i + 10);
        const dateStr = formatDate(currentDate);

        // Filter bookings for THIS day
        const dayBookings = filteredBookings.filter(b => b.date === dateStr);

        // Group by Barber
        const activeBarbers = selectedBarberId === "all" ? barbers : barbers.filter(b => b.id === selectedBarberId);

        return (
            <div className="bg-[#1A1A1A] rounded-[32px] border border-white/5 overflow-hidden flex flex-col h-[600px] shadow-2xl">
                {/* Header timeline */}
                <div className="flex border-b border-white/5 bg-black/40">
                    <div className="w-20 shrink-0 border-r border-white/5 p-4 flex items-center justify-center text-xs font-black text-gray-500">
                        TIME
                    </div>
                    <div className="flex-1 flex overflow-x-auto scrollbar-hide">
                        {activeBarbers.map(barber => (
                            <div key={barber.id} className="min-w-[150px] flex-1 border-r border-white/5 p-4 flex items-center justify-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-white/10 overflow-hidden">
                                    {barber.profile_image ? (
                                        <img src={barber.profile_image} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white">{barber.nickname?.[0]}</div>
                                    )}
                                </div>
                                <span className="text-sm font-bold text-white">{barber.nickname}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Grid Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                    <div className="flex relative min-h-[1440px]"> {/* 12 hours * 120px */}
                        {/* Time Column */}
                        <div className="w-20 shrink-0 border-r border-white/5 bg-black/20 z-10 sticky left-0 text-right pr-4 pt-2">
                            {hours.map(h => (
                                <div key={h} className="h-[120px] text-xs font-bold text-gray-600 relative">
                                    <span className="-top-3 relative">{h}:00</span>
                                </div>
                            ))}
                        </div>

                        {/* Barber Columns */}
                        <div className="flex-1 flex bg-grid-white/[0.02]">
                            {activeBarbers.map((barber) => {
                                const bBookings = dayBookings.filter(b => b.barberId === barber.id);
                                return (
                                    <div key={barber.id} className="flex-1 min-w-[150px] border-r border-white/5 relative">
                                        {/* Horizontal Lines */}
                                        {hours.map(h => (
                                            <div key={h} className="absolute w-full border-t border-white/5" style={{ top: `${(h - 10) * 120}px` }} />
                                        ))}

                                        {/* Bookings */}
                                        {bBookings.map(booking => {
                                            const [h, m] = booking.time.split(':').map(Number);
                                            const startMin = (h - 10) * 60 + m;
                                            const durationMin = booking.duration_min || (booking.duration || 1) * 60;
                                            const height = (durationMin / 60) * 120;
                                            const top = (startMin / 60) * 120;

                                            return (
                                                <button
                                                    key={booking.id}
                                                    onClick={() => { setSelectedBooking(booking); setShowModal(true); }}
                                                    className={cn(
                                                        "absolute left-1 right-1 rounded-xl p-2 text-left border overflow-hidden transition-all hover:z-20 hover:scale-[1.02]",
                                                        getStatusColor(booking.status),
                                                        "border-white/10"
                                                    )}
                                                    style={{ top: `${top}px`, height: `${height}px` }}
                                                >
                                                    <div className="text-[10px] font-black uppercase tracking-wider opacity-80 mb-0.5">{booking.time}</div>
                                                    <div className="font-bold text-xs truncate leading-tight">{booking.serviceName}</div>
                                                    <div className="text-[10px] font-medium truncate opacity-70 mt-1">{booking.customerName}</div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderListView = () => (
        <div className="space-y-4">
            {filteredBookings.length === 0 ? (
                <div className="text-center py-20 bg-[#1A1A1A] rounded-[32px] text-gray-500 font-bold">No bookings found</div>
            ) : filteredBookings.map(booking => (
                <div key={booking.id} className="bg-[#1A1A1A] p-6 rounded-[24px] border border-white/5 flex items-center justify-between hover:border-white/20 transition-all cursor-pointer"
                    onClick={() => { setSelectedBooking(booking); setShowModal(true); }}>
                    <div className="flex items-center gap-6">
                        <div className="w-16 text-center">
                            <div className="text-sm font-black text-gray-500 uppercase">{booking.time}</div>
                            <div className="text-xs font-bold text-white/20">{booking.date}</div>
                        </div>
                        <div>
                            <h4 className="font-bold text-lg text-white mb-1">{booking.serviceName}</h4>
                            <div className="flex items-center gap-4 text-xs font-medium text-gray-400">
                                <span className="flex items-center gap-1"><User className="w-3 h-3" /> {booking.customerName}</span>
                                <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {booking.customerPhone || booking.phone || "-"}</span>
                                <span className="flex items-center gap-1"><Scissors className="w-3 h-3" /> {booking.barberName}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className={cn("px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest", getStatusColor(booking.status).replace('bg-', 'text-').replace('text-white', ''))}>
                            {booking.status}
                        </div>
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                    </div>
                </div>
            ))}
        </div>
    );

    const updateStatus = async (status: string) => {
        if (!selectedBooking) return;
        try {
            await updateDoc(doc(db, "bookings", selectedBooking.id), { status });
            setShowModal(false);
        } catch (e) {
            console.error(e);
            alert("Error updating status");
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header / Controls */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black italic tracking-tighter text-white mb-1">Bookings</h1>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Master Calendar Control</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    {/* View Switch */}
                    <div className="bg-[#1A1A1A] p-1 rounded-xl flex gap-1 border border-white/5">
                        <button onClick={() => setViewMode('calendar')} className={cn("p-2 rounded-lg transition-all", viewMode === 'calendar' ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-white")}>
                            <CalendarIcon className="w-5 h-5" />
                        </button>
                        <button onClick={() => setViewMode('list')} className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? "bg-white text-black shadow-sm" : "text-gray-400 hover:text-white")}>
                            <ListIcon className="w-5 h-5" />
                        </button>
                    </div>
                    {/* Date Navigation */}
                    <div className="bg-[#1A1A1A] p-1 rounded-xl flex items-center gap-2 border border-white/5 px-2">
                        <button onClick={() => setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; })} className="p-1 hover:bg-white/10 rounded-lg text-white"><ChevronLeft className="w-5 h-5" /></button>
                        <div className="text-sm font-bold text-white min-w-[100px] text-center">
                            {currentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        <button onClick={() => setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })} className="p-1 hover:bg-white/10 rounded-lg text-white"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                    {/* Barber Filter */}
                    <select
                        value={selectedBarberId}
                        onChange={(e) => setSelectedBarberId(e.target.value)}
                        className="bg-[#1A1A1A] text-white text-sm font-bold rounded-xl border border-white/5 px-4 py-3 outline-none focus:border-white/20"
                    >
                        <option value="all">All Barbers</option>
                        {barbers.map(b => <option key={b.id} value={b.id}>{b.nickname}</option>)}
                    </select>
                    {/* Time Slot Filter */}
                    <select
                        value={selectedTimeSlot}
                        onChange={(e) => setSelectedTimeSlot(e.target.value as any)}
                        className="bg-[#1A1A1A] text-white text-sm font-bold rounded-xl border border-white/5 px-4 py-3 outline-none focus:border-white/20"
                    >
                        <option value="all">All Times</option>
                        <option value="morning">Morning (10-13)</option>
                        <option value="afternoon">Afternoon (13-17)</option>
                        <option value="evening">Evening (17-21)</option>
                    </select>
                </div>
            </div>

            {/* Main Content */}
            {loading ? (
                <div className="text-white text-center py-20 font-bold tracking-widest uppercase">Loading Schedule...</div>
            ) : viewMode === 'calendar' ? renderCalendarView() : renderListView()}

            {/* Booking Modal */}
            {showModal && selectedBooking && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-[#1A1A1A] w-full max-w-lg rounded-[40px] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 pb-0 flex justify-between items-start">
                            <div>
                                <div className="text-xs font-black uppercase tracking-widest text-[#404040] mb-2">Booking ID: {selectedBooking.id.slice(-6)}</div>
                                <h2 className="text-3xl font-black italic tracking-tighter text-white">{selectedBooking.serviceName}</h2>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Customer</div>
                                    <div className="text-lg font-bold text-white leading-tight">{selectedBooking.customerName}</div>
                                    <div className="text-xs text-gray-400 mt-1 flex items-center gap-1"><Phone className="w-3 h-3" /> {selectedBooking.customerPhone || selectedBooking.phone || '-'}</div>
                                </div>
                                <div className="bg-black/30 p-4 rounded-2xl border border-white/5">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Barber</div>
                                    <div className="text-lg font-bold text-white leading-tight">{selectedBooking.barberName}</div>
                                </div>
                            </div>

                            <div className="bg-white/5 p-6 rounded-3xl flex justify-between items-center border border-white/5">
                                <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Date & Time</div>
                                    <div className="text-xl font-black text-white">{selectedBooking.date} / {selectedBooking.time}</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1">Price</div>
                                    <div className="text-2xl font-black text-white">฿{selectedBooking.price}</div>
                                </div>
                            </div>

                            {selectedBooking.slipUrl && (
                                <div className="rounded-2xl overflow-hidden border border-white/10">
                                    <img src={selectedBooking.slipUrl} className="w-full object-cover max-h-[200px]" alt="slip" />
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                {selectedBooking.status === 'pending' && (
                                    <>
                                        <button onClick={() => updateStatus('confirmed')} className="bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all">Approve</button>
                                        <button onClick={() => updateStatus('rejected')} className="bg-red-500/10 text-red-500 py-4 rounded-2xl font-black uppercase tracking-widest border border-red-500/20 hover:bg-red-500/20 transition-all">Reject</button>
                                    </>
                                )}
                                {selectedBooking.status === 'confirmed' && (
                                    <button onClick={() => updateStatus('cancelled')} className="col-span-2 bg-red-500/10 text-red-500 py-4 rounded-2xl font-black uppercase tracking-widest border border-red-500/20 hover:bg-red-500/20 transition-all">Cancel Booking</button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
