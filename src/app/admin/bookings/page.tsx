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
    customerPhone?: string;
    phone?: string;
    serviceId: string;
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
    commissionAmount?: number;
}

interface BarberServiceConfig {
    barber_id: string;
    service_id: string;
    commission_fixed: number;
    enabled: boolean;
}

export default function AdminBookingsPage() {
    const [viewMode, setViewMode] = useState<"calendar" | "card">("calendar");
    const [currentDate, setCurrentDate] = useState(new Date());
    const [barbers, setBarbers] = useState<Barber[]>([]);

    // Filters
    const [selectedBarberId, setSelectedBarberId] = useState<string>("all");
    const [selectedTimeSlot, setSelectedTimeSlot] = useState<"all" | "morning" | "afternoon" | "evening">("all");
    const [selectedStatus, setSelectedStatus] = useState<string>("all");

    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [serviceConfigs, setServiceConfigs] = useState<BarberServiceConfig[]>([]);
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

    useEffect(() => {
        const q = query(collection(db, "barberServices"));
        const unsubscribe = onSnapshot(q, (snap) => {
            setServiceConfigs(snap.docs.map(d => d.data() as BarberServiceConfig));
        });
        return () => unsubscribe();
    }, []);

    // --- Logic & Memoization ---
    const formatDate = (date: Date) => date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }); // DD/MM/YYYY

    const filteredBookings = useMemo(() => {
        return bookings.filter(b => {
            // Common Filter: Date (Only for Calendar View primarily, but let's keep it consistent or strictly separate if needed)
            // Requirement says: 
            // Calendar View Filters: Date, Barber
            // Card View Filters: Date, Barber, Time Slot, Status

            // NOTE: The current date state is a single day picker. 
            // For "Card View", usually users might want to see a list for that specific day too? 
            // The prompt says "Filter Logic per View... 1. Date (วันที่)". So both views filter by the selected date.
            const dateStr = formatDate(currentDate);
            if (b.date !== dateStr) return false;

            // 1. Barber Filter (Both Views)
            if (selectedBarberId !== "all" && b.barberId !== selectedBarberId) return false;

            // 2. Extra Filters (Card View Only)
            if (viewMode === 'card') {
                // Time Slot
                if (selectedTimeSlot !== "all") {
                    const [h] = b.time.split(':').map(Number);
                    if (selectedTimeSlot === "morning" && h >= 13) return false;
                    if (selectedTimeSlot === "afternoon" && (h < 13 || h >= 17)) return false;
                    if (selectedTimeSlot === "evening" && h < 17) return false;
                }
                // Status
                if (selectedStatus !== "all" && b.status !== selectedStatus) return false;
            }

            return true;
        });
    }, [bookings, viewMode, currentDate, selectedBarberId, selectedTimeSlot, selectedStatus]);

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
        const hours = Array.from({ length: 12 }, (_, i) => i + 10); // 10:00 to 21:00

        // Group by Barber
        const activeBarbers = selectedBarberId === "all" ? barbers : barbers.filter(b => b.id === selectedBarberId);

        return (
            <div className="bg-[#1A1A1A] rounded-[32px] border border-white/5 overflow-hidden flex flex-col h-[650px] shadow-2xl relative">
                {/* Fixed Header timeline - Sticky Top */}
                <div className="flex border-b border-white/5 bg-[#1A1A1A] z-20 sticky top-0 shadow-sm">
                    <div className="w-20 shrink-0 border-r border-white/5 p-4 flex items-center justify-center text-xs font-black text-gray-500 bg-[#1A1A1A] z-30 sticky left-0">
                        TIME
                    </div>
                    <div className="flex-1 flex overflow-x-auto scrollbar-hide bg-[#1A1A1A] z-20">
                        {activeBarbers.map(barber => (
                            <div key={barber.id} className="min-w-[180px] flex-1 border-r border-white/5 p-4 flex items-center justify-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/10 overflow-hidden shrink-0">
                                    {barber.profile_image ? (
                                        <img src={barber.profile_image} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-white">{barber.nickname?.[0]}</div>
                                    )}
                                </div>
                                <span className="text-base font-bold text-white truncate">{barber.nickname}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Grid Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-[#1A1A1A]">
                    <div className="flex relative min-h-[1440px]"> {/* 12 hours * 120px */}
                        {/* Time Column - Sticky Left */}
                        <div className="w-20 shrink-0 border-r border-white/5 bg-[#1A1A1A] z-10 sticky left-0 text-right pr-4 pt-2 shadow-[2px_0_5px_rgba(0,0,0,0.2)]">
                            {hours.map(h => (
                                <div key={h} className="h-[120px] text-xs font-bold text-gray-600 relative">
                                    <span className="-top-3 relative">{h}:00</span>
                                </div>
                            ))}
                        </div>

                        {/* Barber Columns */}
                        <div className="flex-1 flex bg-grid-white/[0.02]">
                            {activeBarbers.map((barber) => {
                                const bBookings = filteredBookings.filter(b => b.barberId === barber.id);
                                return (
                                    <div key={barber.id} className="flex-1 min-w-[180px] border-r border-white/5 relative">
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
                                                        "absolute left-1 right-1 rounded-xl p-3 text-left border overflow-hidden transition-all hover:z-20 hover:scale-[1.02] shadow-lg",
                                                        getStatusColor(booking.status),
                                                        "border-white/10"
                                                    )}
                                                    style={{ top: `${top}px`, height: `${height}px` }}
                                                >
                                                    <div className="text-[11px] font-black uppercase tracking-wider opacity-90 mb-0.5">{booking.time}</div>
                                                    <div className="font-bold text-sm truncate leading-tight shadow-black drop-shadow-md">{booking.serviceName}</div>
                                                    <div className="text-xs font-medium truncate opacity-90 mt-1 flex items-center gap-1">
                                                        <User className="w-3 h-3" /> {booking.customerName}
                                                    </div>
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

    const renderCardView = () => (
        <div className="space-y-4">
            {filteredBookings.length === 0 ? (
                <div className="text-center py-24 bg-[#1A1A1A] rounded-[32px] text-gray-500 font-bold opacity-50 uppercase tracking-widest border border-white/5">
                    No bookings found for this selection
                </div>
            ) : filteredBookings.map(booking => (
                <div key={booking.id} className="bg-[#1A1A1A] p-6 rounded-[32px] border border-white/5 flex flex-col md:flex-row items-center justify-between hover:border-white/20 transition-all group gap-6">
                    <div className="flex items-center gap-8 w-full md:w-auto">
                        <div className="w-20 text-center shrink-0">
                            <div className="text-2xl font-black text-white font-inter">{booking.time}</div>
                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{booking.date}</div>
                        </div>
                        <div className="h-12 w-[1px] bg-white/10 hidden md:block"></div>
                        <div className="flex-1">
                            <h4 className="font-bold text-2xl text-white mb-1 font-inter tracking-tight uppercase">{booking.serviceName}</h4>
                            <div className="flex flex-col gap-1">
                                <span className="text-base font-bold text-gray-300 flex items-center gap-2">
                                    <User className="w-4 h-4 text-gray-500" /> {booking.customerName}
                                </span>
                                <span className="text-xs font-medium text-gray-500 tracking-wide uppercase flex items-center gap-2">
                                    <Scissors className="w-3 h-3" /> {booking.barberName}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
                        {/* Status Badge */}
                        <div className={cn("px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5", getStatusColor(booking.status).replace('bg-', 'text-').replace('text-white', ''))}>
                            {booking.status.replace('_', ' ')}
                        </div>

                        {/* Call Action */}
                        {(booking.customerPhone || booking.phone) && (
                            <a href={`tel:${booking.customerPhone || booking.phone}`}
                                className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-green-500 bg-green-500/10 hover:bg-green-500 hover:text-white transition-all"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <Phone className="w-5 h-5" />
                            </a>
                        )}

                        {/* Detail Trigger */}
                        <button
                            onClick={() => { setSelectedBooking(booking); setShowModal(true); }}
                            className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center text-gray-400 hover:bg-white hover:text-black transition-all"
                        >
                            <ChevronRight className="w-6 h-6" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );

    const updateStatus = async (status: string) => {
        if (!selectedBooking) return;
        try {
            const updateData: any = { status };

            // If confirming and commission is missing, try to set it
            if ((status === 'confirmed' || status === 'done') && selectedBooking.commissionAmount === undefined && (selectedBooking as any).serviceId) {
                const mapping = serviceConfigs.find(m => m.service_id === (selectedBooking as any).serviceId && m.barber_id === selectedBooking.barberId);
                if (mapping && mapping.enabled) {
                    updateData.commissionAmount = mapping.commission_fixed || 0;
                } else {
                    updateData.commissionAmount = 0;
                }
            }

            await updateDoc(doc(db, "bookings", selectedBooking.id), updateData);
            setShowModal(false);
        } catch (e) {
            console.error(e);
            alert("Error updating status");
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header / Controls */}
            <div className="flex flex-col gap-8">
                <div className="flex flex-col md:flex-row justify-between md:items-end gap-6">
                    <div>
                        <h1 className="text-5xl font-extrabold italic tracking-tighter text-white mb-2 font-inter uppercase">BOOKINGS</h1>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Master Schedule Control</p>
                    </div>

                    {/* View Switcher - Big Toggles */}
                    <div className="flex bg-[#1A1A1A] p-1.5 rounded-2xl border border-white/5 w-full md:w-auto">
                        <button
                            onClick={() => setViewMode('calendar')}
                            className={cn(
                                "flex-1 md:flex-none px-8 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                                viewMode === 'calendar' ? "bg-white text-black shadow-lg scale-100" : "text-gray-500 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <CalendarIcon className="w-4 h-4" /> Calendar View
                        </button>
                        <button
                            onClick={() => setViewMode('card')}
                            className={cn(
                                "flex-1 md:flex-none px-8 py-3 rounded-xl text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
                                viewMode === 'card' ? "bg-white text-black shadow-lg scale-100" : "text-gray-500 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <ListIcon className="w-4 h-4" /> Card View
                        </button>
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="flex flex-col md:flex-row gap-4 items-center bg-[#1A1A1A] p-4 rounded-[24px] border border-white/5">
                    {/* Date Navigation (Always Visible) */}
                    <div className="flex items-center gap-4 w-full md:w-auto justify-between bg-black/20 p-2 rounded-xl border border-white/5">
                        <button onClick={() => setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() - 1); return n; })} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-lg text-white transition-all"><ChevronLeft className="w-6 h-6" /></button>
                        <div className="text-base font-black text-white min-w-[140px] text-center uppercase tracking-wide">
                            {currentDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        <button onClick={() => setCurrentDate(d => { const n = new Date(d); n.setDate(n.getDate() + 1); return n; })} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-lg text-white transition-all"><ChevronRight className="w-6 h-6" /></button>
                    </div>

                    <div className="h-10 w-[1px] bg-white/10 hidden md:block"></div>

                    {/* Barber Filter (Always Visible) */}
                    <div className="flex-1 w-full md:w-auto">
                        <div className="relative">
                            <select
                                value={selectedBarberId}
                                onChange={(e) => setSelectedBarberId(e.target.value)}
                                className="w-full bg-[#0A0A0A] text-white text-sm font-bold rounded-xl border border-white/10 px-4 py-3.5 outline-none focus:border-white/30 appearance-none"
                            >
                                <option value="all">All Barbers</option>
                                {barbers.map(b => <option key={b.id} value={b.id}>{b.nickname}</option>)}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                                <Scissors className="w-4 h-4" />
                            </div>
                        </div>
                    </div>

                    {/* Card View Only Filters */}
                    {viewMode === 'card' && (
                        <>
                            <div className="h-10 w-[1px] bg-white/10 hidden md:block animate-in fade-in"></div>

                            {/* Time Slot */}
                            <div className="flex-1 w-full md:w-auto animate-in slide-in-from-right-2 fade-in">
                                <div className="relative">
                                    <select
                                        value={selectedTimeSlot}
                                        onChange={(e) => setSelectedTimeSlot(e.target.value as any)}
                                        className="w-full bg-[#0A0A0A] text-white text-sm font-bold rounded-xl border border-white/10 px-4 py-3.5 outline-none focus:border-white/30 appearance-none"
                                    >
                                        <option value="all">All Times</option>
                                        <option value="morning">Morning (10:00 - 13:00)</option>
                                        <option value="afternoon">Afternoon (13:00 - 17:00)</option>
                                        <option value="evening">Evening (17:00 - 21:00)</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="flex-1 w-full md:w-auto animate-in slide-in-from-right-4 fade-in">
                                <div className="relative">
                                    <select
                                        value={selectedStatus}
                                        onChange={(e) => setSelectedStatus(e.target.value)}
                                        className="w-full bg-[#0A0A0A] text-white text-sm font-bold rounded-xl border border-white/10 px-4 py-3.5 outline-none focus:border-white/30 appearance-none"
                                    >
                                        <option value="all">All Status</option>
                                        <option value="pending">Pending</option>
                                        <option value="confirmed">Confirmed</option>
                                        <option value="in_progress">In Progress</option>
                                        <option value="done">Done</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none">
                                        <Filter className="w-4 h-4" />
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Main Content */}
            {loading ? (
                <div className="text-white text-center py-20 font-bold tracking-widest uppercase animate-pulse">Loading Schedule...</div>
            ) : viewMode === 'calendar' ? renderCalendarView() : renderCardView()}

            {/* Booking Modal */}
            {showModal && selectedBooking && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in zoom-in-95 duration-200">
                    <div className="bg-[#1A1A1A] w-full max-w-lg rounded-[40px] border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-8 pb-0 flex justify-between items-start">
                            <div>
                                <div className="text-xs font-black uppercase tracking-widest text-[#404040] mb-2">Booking ID: {selectedBooking.id.slice(-6)}</div>
                                <h2 className="text-3xl font-black italic tracking-tighter text-white">{selectedBooking.serviceName}</h2>
                            </div>
                            <button onClick={() => setShowModal(false)} className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center text-white hover:bg-white hover:text-black transition-all">
                                <XCircle className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6 overflow-y-auto custom-scrollbar">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-black/30 p-5 rounded-3xl border border-white/5">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Customer</div>
                                    <div className="text-xl font-bold text-white leading-tight mb-2">{selectedBooking.customerName}</div>
                                    <a href={`tel:${selectedBooking.customerPhone || selectedBooking.phone}`} className="inline-flex items-center gap-2 text-xs font-bold text-green-500 bg-green-500/10 px-3 py-1.5 rounded-full hover:bg-green-500 hover:text-white transition-all">
                                        <Phone className="w-3 h-3" /> Call Customer
                                    </a>
                                </div>
                                <div className="bg-black/30 p-5 rounded-3xl border border-white/5">
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Barber</div>
                                    <div className="text-xl font-bold text-white leading-tight">{selectedBooking.barberName}</div>
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
                                <div className="rounded-3xl overflow-hidden border border-white/10 group relative">
                                    <img src={selectedBooking.slipUrl} className="w-full object-cover max-h-[300px]" alt="slip" />
                                    <a href={selectedBooking.slipUrl} target="_blank" rel="noopener noreferrer" className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all font-bold text-white uppercase tracking-widest">View Full Slip</a>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-3 pt-2">
                                {selectedBooking.status === 'pending' && (
                                    <>
                                        <button onClick={() => updateStatus('confirmed')} className="bg-white text-black py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-gray-200 transition-all shadow-lg shadow-white/10">Approve Booking</button>
                                        <button onClick={() => updateStatus('rejected')} className="bg-red-500/10 text-red-500 py-4 rounded-2xl font-black uppercase tracking-widest border border-red-500/20 hover:bg-red-500/20 transition-all">Reject</button>
                                    </>
                                )}
                                {selectedBooking.status === 'confirmed' && (
                                    <>
                                        <button onClick={() => updateStatus('done')} className="bg-green-500 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-green-600 transition-all shadow-lg shadow-green-500/20">Complete Job</button>
                                        <button onClick={() => updateStatus('cancelled')} className="bg-red-500/10 text-red-500 py-4 rounded-2xl font-black uppercase tracking-widest border border-red-500/20 hover:bg-red-500/20 transition-all">Cancel Booking</button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

