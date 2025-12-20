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

        return () => {
            unsubBookings();
            unsubLeaves();
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

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-black italic tracking-tighter text-white mb-1">Approval Center</h1>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Real-time Task Management</p>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                    <p className="text-xs font-bold uppercase tracking-widest text-gray-500">Loading Requests...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">

                    {/* SECTION 1: CUSTOMER BOOKING APPROVALS */}
                    <section className="bg-[#1A1A1A] rounded-[32px] p-6 md:p-8 border border-white/5 flex flex-col gap-6">
                        <header className="flex items-center justify-between pb-4 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black font-black text-lg shadow-lg">
                                    {bookings.length}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black italic text-white leading-none">New Bookings</h2>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Waiting for confirmation</span>
                                </div>
                            </div>
                        </header>

                        {bookings.length === 0 ? (
                            <div className="py-12 text-center">
                                <CheckCircle2 className="w-12 h-12 text-[#272727] mx-auto mb-3" />
                                <p className="text-gray-500 font-bold text-sm">All caught up!</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {bookings.map(booking => (
                                    <div key={booking.id} className="bg-black/40 rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-all group">
                                        <div className="flex gap-4">
                                            {/* Slip Preview */}
                                            {booking.slipUrl ? (
                                                <button onClick={() => setSelectedSlip(booking.slipUrl!)} className="w-16 h-20 shrink-0 bg-white/5 rounded-xl overflow-hidden border border-white/10 relative group/slip">
                                                    <img src={booking.slipUrl} className="w-full h-full object-cover" alt="slip" />
                                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover/slip:opacity-100 flex items-center justify-center transition-all">
                                                        <User className="w-4 h-4 text-white" />
                                                    </div>
                                                </button>
                                            ) : (
                                                <div className="w-16 h-20 shrink-0 bg-white/5 rounded-xl flex items-center justify-center border border-white/5">
                                                    <CreditCard className="w-6 h-6 text-gray-700" />
                                                </div>
                                            )}

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="text-white font-bold text-lg truncate leading-tight">{booking.serviceName}</h3>
                                                <div className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                                    <User className="w-3 h-3" /> <span className="truncate">{booking.customerName}</span>
                                                </div>
                                                <div className="text-xs text-gray-500 mt-0.5 font-medium flex items-center gap-2">
                                                    <Clock className="w-3 h-3" /> {booking.date} • {booking.time}
                                                </div>
                                                <div className="text-[10px] font-bold text-white/30 uppercase mt-2 tracking-wider">
                                                    Barber: {booking.barberName}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/5">
                                            <button
                                                onClick={() => handleBookingAction(booking.id, 'confirmed')}
                                                className="bg-white text-black py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-colors"
                                            >
                                                Confirm
                                            </button>
                                            <button
                                                onClick={() => handleBookingAction(booking.id, 'rejected')} // Using rejected for simplicity, or cancelled
                                                className="bg-red-500/10 text-red-500 border border-red-500/20 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-colors"
                                            >
                                                Reject
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* SECTION 2: STAFF BREAK/LEAVE APPROVALS */}
                    <section className="bg-[#1A1A1A] rounded-[32px] p-6 md:p-8 border border-white/5 flex flex-col gap-6">
                        <header className="flex items-center justify-between pb-4 border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-[#272727] border border-white/10 rounded-full flex items-center justify-center text-white font-black text-lg">
                                    {leaveRequests.length}
                                </div>
                                <div>
                                    <h2 className="text-xl font-black italic text-gray-300 leading-none">Leave Requests</h2>
                                    <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Staff Time Off</span>
                                </div>
                            </div>
                        </header>

                        {leaveRequests.length === 0 ? (
                            <div className="py-12 text-center">
                                <Coffee className="w-12 h-12 text-[#272727] mx-auto mb-3" />
                                <p className="text-gray-500 font-bold text-sm">No pending requests</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {leaveRequests.map(request => (
                                    <div key={request.id} className="bg-black/40 rounded-2xl p-4 border border-white/5 hover:border-white/10 transition-all">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs text-white">
                                                    {request.barberName?.[0]}
                                                </div>
                                                <div>
                                                    <div className="text-white font-bold">{request.barberName}</div>
                                                    <div className={cn(
                                                        "inline-block px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider mt-0.5",
                                                        request.type === 'sick' ? "bg-red-500/20 text-red-400" : "bg-blue-500/20 text-blue-400"
                                                    )}>
                                                        {request.type}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm font-bold text-white">{request.date}</div>
                                                <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                                    {request.startTime && request.endTime ? `${request.startTime} - ${request.endTime}` : "Full Day"}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-white/5">
                                            <button
                                                onClick={() => handleLeaveAction(request.id, 'approved')}
                                                className="bg-[#272727] text-white border border-white/10 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                                            >
                                                Approve
                                            </button>
                                            <button
                                                onClick={() => handleLeaveAction(request.id, 'rejected')}
                                                className="bg-red-500/10 text-red-500 border border-red-500/20 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-500/20 transition-colors"
                                            >
                                                Reject
                                            </button>
                                        </div>
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
