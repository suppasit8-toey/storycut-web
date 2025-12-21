"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, where, doc, updateDoc } from "firebase/firestore";
import { updateBookingStatus } from "@/lib/db";
import {
    CheckCircle2,
    XCircle,
    Clock,
    User,
    Scissors,
    Calendar as CalendarIcon,
    CreditCard,
    Loader2,
    X,
    Coffee,
    Phone
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- Types ---
interface Booking {
    id: string;
    customerName: string;
    phone?: string;
    serviceName: string;
    barberName: string;
    date: string;
    time: string;
    price: number;
    status: "pending" | "confirmed" | "rejected";
    slipUrl?: string;
    createdAt: any;
}

interface LeaveRequest {
    id: string;
    barberId: string;
    barberName: string;
    date: string;
    type: 'break' | 'personal' | 'sick';
    startTime?: string;
    endTime?: string;
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
}

export default function DashboardPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [barbers, setBarbers] = useState<Record<string, string>>({}); // ID -> Nickname
    const [loading, setLoading] = useState(true);
    const [selectedSlip, setSelectedSlip] = useState<string | null>(null);

    // --- Data Fetching ---
    useEffect(() => {
        // 1. Pending Bookings
        const qBookings = query(
            collection(db, "bookings"),
            where("status", "==", "pending"),
            orderBy("createdAt", "desc")
        );

        const unsubBookings = onSnapshot(qBookings, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
            setBookings(data);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching bookings:", err);
            setLoading(false);
        });

        // 2. Pending Leave Requests
        const qLeaves = query(
            collection(db, "leave_requests"),
            where("status", "==", "pending"),
            orderBy("createdAt", "desc")
        );

        const unsubLeaves = onSnapshot(qLeaves, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest));
            setLeaveRequests(data);
        }, (err) => {
            console.error("Error fetching leaves:", err);
        });

        // 3. Barbers (for Name Lookup)
        const qBarbers = query(collection(db, "barbers"));
        const unsubBarbers = onSnapshot(qBarbers, (snap) => {
            const lookup: Record<string, string> = {};
            snap.docs.forEach(doc => {
                const data = doc.data();
                lookup[doc.id] = data.nickname || data.name_th || data.name_en || "Unknown";
            });
            setBarbers(lookup);
        });

        return () => {
            unsubBookings();
            unsubLeaves();
            unsubBarbers();
        };
    }, []);

    // --- Actions ---
    const handleBookingAction = async (id: string, status: "confirmed" | "rejected" | "cancelled") => {
        try {
            await updateBookingStatus(id, status as any); // Type cast if needed depending on db lib
        } catch (error) {
            console.error(error);
            alert("Failed to update booking status");
        }
    };

    const handleLeaveAction = async (id: string, status: "approved" | "rejected") => {
        try {
            const ref = doc(db, "leave_requests", id);
            await updateDoc(ref, { status });
        } catch (error) {
            console.error(error);
            alert("Failed to update leave request status");
        }
    };

    // Helper: Format Timestamp
    const formatTimestamp = (timestamp: any) => {
        if (!timestamp) return "";
        // Handle Firestore Timestamp or Date string
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('th-TH', {
            dateStyle: 'medium',
            timeStyle: 'short'
        });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-4xl font-black italic tracking-tighter text-white mb-2 font-inter uppercase">Approval Center</h1>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">REAL-TIME TASK MANAGEMENT</p>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Loading Requests...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">

                    {/* SECTION 1: CUSTOMER BOOKING APPROVALS */}
                    <section className="bg-[#1A1A1A] rounded-[32px] p-8 border border-white/5 flex flex-col gap-6">
                        <header className="flex items-center justify-between pb-6 border-b border-white/5">
                            <div>
                                <h2 className="text-2xl font-bold font-inter text-white tracking-tight uppercase">New Bookings</h2>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mt-1 block">Waiting for confirmation</span>
                            </div>
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-black font-black text-xl shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                                {bookings.length}
                            </div>
                        </header>

                        {bookings.length === 0 ? (
                            <div className="py-12 text-center opacity-30">
                                <p className="text-white font-bold text-lg uppercase tracking-widest">All caught up</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {bookings.map(booking => (
                                    <div key={booking.id} className="bg-black/40 rounded-[24px] p-6 border border-white/5 hover:border-white/20 transition-all group">
                                        <div className="flex gap-6 items-start">
                                            {/* Slip Preview (Functional) */}
                                            {booking.slipUrl ? (
                                                <button onClick={() => setSelectedSlip(booking.slipUrl!)} className="w-20 h-20 shrink-0 bg-white/5 rounded-2xl overflow-hidden border border-white/10 relative group/slip cursor-zoom-in">
                                                    <img src={booking.slipUrl} className="w-full h-full object-cover opacity-80 group-hover/slip:opacity-100 transition-opacity" alt="slip" />
                                                </button>
                                            ) : (
                                                <div className="w-20 h-20 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 opacity-50">
                                                    <span className="text-[10px] font-bold uppercase text-gray-500">No Slip</span>
                                                </div>
                                            )}

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-white font-black text-2xl uppercase tracking-tighter leading-none mb-2 font-inter">{booking.serviceName}</h3>
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-gray-300 font-bold text-sm">{booking.customerName}</span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white font-mono text-xs">{booking.customerPhone || booking.phone || "-"}</span>
                                                        {(booking.customerPhone || booking.phone) && (
                                                            <a
                                                                href={`tel:${booking.customerPhone || booking.phone}`}
                                                                className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-green-400 transition-colors"
                                                            >
                                                                <Phone className="w-3 h-3" /> Call
                                                            </a>
                                                        )}
                                                    </div>
                                                    <span className="text-gray-500 text-xs font-medium tracking-wide mt-1">
                                                        {booking.date} at {booking.time} • <span className="text-white/70">{booking.barberName}</span>
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="grid grid-cols-2 gap-3 mt-6">
                                            <button
                                                onClick={() => handleBookingAction(booking.id, 'confirmed')}
                                                className="bg-white text-black py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                            >
                                                Confirm
                                            </button>
                                            <button
                                                onClick={() => handleBookingAction(booking.id, 'rejected')}
                                                className="bg-[#222] text-gray-400 border border-white/5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-950/30 hover:text-red-500 hover:border-red-900/30 transition-all"
                                            >
                                                Reject
                                            </button>
                                        </div>

                                        {/* Booking Timestamp */}
                                        {booking.createdAt && (
                                            <div className="mt-4 pt-4 border-t border-white/5 text-center">
                                                <p className="text-[10px] text-gray-600 font-medium">
                                                    Booked on: <span className="text-gray-400">{formatTimestamp(booking.createdAt)}</span>
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* SECTION 2: STAFF BREAK/LEAVE APPROVALS */}
                    <section className="bg-[#1A1A1A] rounded-[32px] p-8 border border-white/5 flex flex-col gap-6">
                        <header className="flex items-center justify-between pb-6 border-b border-white/5">
                            <div>
                                <h2 className="text-2xl font-bold font-inter text-gray-200 tracking-tight uppercase">Leave Requests</h2>
                                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mt-1 block">Staff Time Off</span>
                            </div>
                            <div className="w-12 h-12 bg-[#222] border border-white/10 rounded-full flex items-center justify-center text-white font-black text-xl">
                                {leaveRequests.length}
                            </div>
                        </header>

                        {leaveRequests.length === 0 ? (
                            <div className="py-12 text-center opacity-30">
                                <p className="text-gray-500 font-bold text-lg uppercase tracking-widest">No requests</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-4">
                                {leaveRequests.map(request => (
                                    <div key={request.id} className="bg-black/40 rounded-[24px] p-6 border border-white/5 hover:border-white/20 transition-all">
                                        <div className="mb-4 pb-4 border-b border-white/5">
                                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Request by</div>
                                            <div className="text-lg font-black text-white italic tracking-tight">Barber {barbers[request.barberId] || request.barberName || "Unknown"}</div>
                                        </div>

                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className={cn(
                                                    "inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                                    request.type === 'sick' ? "bg-red-900/30 text-red-400 border border-red-900/50" : "bg-blue-900/30 text-blue-400 border border-blue-900/50"
                                                )}>
                                                    {request.type}
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-lg font-bold text-white font-mono">{request.date}</div>
                                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                                    {request.startTime && request.endTime ? `${request.startTime} - ${request.endTime}` : "Full Day"}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3 pt-2">
                                            <button
                                                onClick={() => handleLeaveAction(request.id, 'approved')}
                                                className="bg-[#222] text-white border border-white/10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleLeaveAction(request.id, 'rejected')}
                                                className="bg-[#1a0000] text-red-500 border border-red-500/10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-900/20 hover:border-red-500/30 transition-colors"
                                            >
                                                Reject
                                            </button>
                                        </div>

                                        {/* Leave Request Timestamp */}
                                        {request.createdAt && (
                                            <div className="mt-4 pt-2 border-t border-white/5 text-right">
                                                <p className="text-[10px] text-gray-600">
                                                    Submitted: {formatTimestamp(request.createdAt)}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                </div>
            )}

            {/* Slip Modal */}
            {selectedSlip && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200">
                    <button
                        onClick={() => setSelectedSlip(null)}
                        className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <div className="p-4 max-w-2xl w-full">
                        <img src={selectedSlip} className="w-full rounded-3xl shadow-2xl border-4 border-white/10" alt="Full size slip" />
                    </div>
                </div>
            )}
        </div>
    );
}
