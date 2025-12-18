"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { updateBookingStatus } from "@/lib/db";
import {
    CheckCircle2,
    XCircle,
    Clock,
    ExternalLink,
    Search,
    ChevronRight,
    User,
    Phone,
    Scissors,
    Calendar as CalendarIcon,
    CreditCard,
    Loader2,
    X
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Booking {
    id: string;
    customerName: string;
    phone: string;
    serviceName: string;
    barberName: string;
    date: string;
    time: string;
    price: number;
    status: "pending" | "confirmed" | "rejected";
    slipUrl?: string;
    createdAt: any;
}

export default function AdminDashboard() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedSlip, setSelectedSlip] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const bookingData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Booking[];
            setBookings(bookingData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching bookings:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleStatusUpdate = async (id: string, status: "confirmed" | "rejected") => {
        try {
            await updateBookingStatus(id, status);
        } catch (error) {
            alert("Failed to update status");
        }
    };

    const filteredBookings = bookings.filter(b =>
        b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        b.phone.includes(searchTerm) ||
        b.barberName.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getStatusStyles = (status: string) => {
        switch (status) {
            case "confirmed":
                return "bg-green-100 text-green-700 border-green-200";
            case "rejected":
                return "bg-red-100 text-red-700 border-red-200";
            default:
                return "bg-amber-100 text-amber-700 border-amber-200";
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 font-sans text-gray-900">
            {/* Navbar */}
            <nav className="sticky top-0 z-30 w-full bg-white border-b border-gray-200 px-6 py-4">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center">
                            <Scissors className="w-5 h-5 text-white" />
                        </div>
                        <h1 className="text-xl font-bold tracking-tight">StoryCut Admin</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="ค้นหาชื่อ, เบอร์โทร..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-gray-100 border-transparent focus:bg-white focus:ring-2 focus:ring-black/5 rounded-full text-sm transition-all outline-none w-64"
                            />
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 py-8">
                <header className="mb-8 flex justify-between items-end">
                    <div>
                        <h2 className="text-3xl font-black text-gray-900 mb-2">Booking Management</h2>
                        <p className="text-gray-500 text-sm">จัดการรายการจองและตรวจสอบหลักฐานการชำระเงิน</p>
                    </div>
                    <div className="text-right">
                        <div className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-1">Total Bookings</div>
                        <div className="text-4xl font-black text-black italic">{filteredBookings.length}</div>
                    </div>
                </header>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 text-black animate-spin" />
                        <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">Loading Bookings...</p>
                    </div>
                ) : filteredBookings.length === 0 ? (
                    <div className="bg-white rounded-[32px] p-20 text-center border-2 border-dashed border-gray-200">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CalendarIcon className="w-10 h-10 text-gray-300" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">No Bookings Found</h3>
                        <p className="text-gray-500">ยังไม่มีรายการจองในระบบ หรือไม่พบข้อมูลที่ค้นหา</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {filteredBookings.map((booking) => (
                            <div key={booking.id} className="bg-white rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
                                <div className="p-6 flex flex-wrap lg:flex-nowrap items-center gap-8">

                                    {/* Status & Slip */}
                                    <div className="flex items-center gap-6 shrink-0">
                                        {booking.slipUrl ? (
                                            <button
                                                onClick={() => setSelectedSlip(booking.slipUrl!)}
                                                className="relative w-20 h-24 bg-gray-100 rounded-2xl overflow-hidden group/slip cursor-zoom-in border border-gray-100"
                                            >
                                                <img src={booking.slipUrl} alt="Slip" className="w-full h-full object-cover transition-transform group-hover/slip:scale-110" />
                                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/slip:opacity-100 flex items-center justify-center transition-opacity">
                                                    <ExternalLink className="w-5 h-5 text-white" />
                                                </div>
                                            </button>
                                        ) : (
                                            <div className="w-20 h-24 bg-gray-50 rounded-2xl flex flex-col items-center justify-center gap-2 border border-gray-100 border-dashed">
                                                <CreditCard className="w-6 h-6 text-gray-300" />
                                                <span className="text-[8px] font-black text-gray-400 uppercase">No Slip</span>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <span className={cn("inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border", getStatusStyles(booking.status))}>
                                                {booking.status === "pending" && <Clock className="w-3 h-3" />}
                                                {booking.status === "confirmed" && <CheckCircle2 className="w-3 h-3" />}
                                                {booking.status === "rejected" && <XCircle className="w-3 h-3" />}
                                                {booking.status}
                                            </span>
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1">
                                                Ref: {booking.id.slice(-6).toUpperCase()}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Customer Info */}
                                    <div className="flex-1 min-w-[200px] border-l border-gray-100 pl-8">
                                        <div className="flex items-center gap-2 mb-1">
                                            <User className="w-4 h-4 text-gray-400" />
                                            <h4 className="font-bold text-gray-900">{booking.customerName}</h4>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <Phone className="w-4 h-4 text-gray-400" />
                                            <span>{booking.phone}</span>
                                        </div>
                                    </div>

                                    {/* Booking Details */}
                                    <div className="flex-1 min-w-[250px] border-l border-gray-100 pl-8">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Service & Barber</div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <Scissors className="w-4 h-4 text-black" />
                                            <span className="font-bold">{booking.serviceName}</span>
                                        </div>
                                        <div className="text-sm font-medium text-gray-600 pl-6">by {booking.barberName}</div>
                                    </div>

                                    {/* DateTime & Price */}
                                    <div className="flex-1 min-w-[180px] border-l border-gray-100 pl-8">
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Schedule</div>
                                        <div className="font-bold mb-1">{booking.date}</div>
                                        <div className="text-sm font-black text-gray-900 italic">{booking.time} • ฿{booking.price}</div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2 pl-8 border-l border-gray-100 min-w-[240px]">
                                        {booking.status === "pending" ? (
                                            <>
                                                <button
                                                    onClick={() => handleStatusUpdate(booking.id, "confirmed")}
                                                    className="flex-1 bg-black text-white px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-black/10"
                                                >
                                                    <CheckCircle2 className="w-4 h-4" />
                                                    Approve
                                                </button>
                                                <button
                                                    onClick={() => handleStatusUpdate(booking.id, "rejected")}
                                                    className="px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest text-red-600 hover:bg-red-50 border border-red-100 transition-all active:scale-95"
                                                >
                                                    Reject
                                                </button>
                                            </>
                                        ) : (
                                            <div className="flex-1 text-center py-3 bg-gray-50 rounded-2xl">
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Action Locked</span>
                                            </div>
                                        )}
                                    </div>

                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Lightbox Modal */}
            {selectedSlip && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-300">
                    <button
                        onClick={() => setSelectedSlip(null)}
                        className="absolute top-8 right-8 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-all group"
                    >
                        <X className="w-6 h-6 text-white group-hover:rotate-90 transition-transform" />
                    </button>

                    <div className="relative max-w-[90vw] max-h-[85vh] animate-in zoom-in-95 duration-300">
                        <img
                            src={selectedSlip}
                            alt="Payment Slip Fullsize"
                            className="rounded-3xl shadow-2xl border-4 border-white/10"
                        />
                        <div className="absolute -bottom-12 left-0 right-0 text-center">
                            <p className="text-white/60 text-xs font-black uppercase tracking-[0.3em]">Payment Verification Slip</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
