"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, MapPin, Calendar, Clock, CreditCard, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { getBookings } from "@/lib/db";
import { formatDateDDMMYYYY } from "@/utils/dateUtils";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Format dateTime string (M/D/YYYY HH:MM) to DD/MM/YYYY HH:MM
const formatDateTime = (dateTimeStr: string) => {
    const [datePart, timePart] = dateTimeStr.split(' ');
    // utils/dateUtils handles legacy M/D/YYYY automatically
    return `${formatDateDDMMYYYY(datePart)} ${timePart}`;
};

interface Booking {
    id: string;
    bookingId?: string;
    phone: string;
    createdAt: any;
    dateTime: string;
    serviceName: string;
    barberName: string;
    price: number;
    status: string;
    slipUrl?: string;
}

function StatusContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const phoneParam = searchParams.get("phone") || "";

    const [phone, setPhone] = useState(phoneParam);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const handleSearch = async (targetPhone: string = phone) => {
        if (!targetPhone) return;
        setLoading(true);
        setSearched(true);
        try {
            const allBookings = await getBookings() as Booking[];
            // Filter by phone
            const filtered = allBookings.filter((b) => b.phone === targetPhone);
            // Sort by date (desc)
            filtered.sort((a, b) => {
                const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt);
                const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt);
                return dateB.getTime() - dateA.getTime();
            });
            setBookings(filtered);
        } catch (error) {
            console.error("Search error:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (phoneParam) {
            setPhone(phoneParam);
            handleSearch(phoneParam);
        }
    }, [phoneParam]);

    return (
        <div className="flex-1 flex flex-col bg-zinc-900 items-center">
            {/* Header */}
            <header className="w-full max-w-[400px] flex justify-between items-center px-6 py-6 text-white shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/bookings')}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-90"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="font-black text-2xl tracking-tighter uppercase">Status</div>
                </div>
            </header>

            {/* Main Card */}
            <main className="w-full max-w-[400px] bg-white rounded-t-[40px] md:rounded-[40px] flex-1 md:flex-none md:min-h-[700px] shadow-2xl relative overflow-hidden flex flex-col mb-0 md:mb-10 p-8">

                <h2 className="flex flex-col mb-1">
                    <span className="text-3xl font-black text-gray-900 tracking-tighter">เช็คสถานะการจอง</span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] italic -mt-1">CHECK BOOKING STATUS</span>
                </h2>
                <p className="text-gray-500 font-medium text-[10px] uppercase tracking-widest mb-8">Enter your phone number to view booking history</p>

                {/* Search Box */}
                <div className="flex gap-2 mb-10">
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="08XXXXXXXX"
                        className="flex-1 p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 font-bold text-gray-900 focus:bg-white focus:border-black transition-all outline-none placeholder:text-gray-300"
                    />
                    <button
                        onClick={() => handleSearch()}
                        className="bg-black text-white px-6 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-800 transition-all active:scale-95 shadow-xl shadow-black/20"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "ค้นหา / SEARCH"}
                    </button>
                </div>

                {/* Results Area */}
                <div className="flex-1 overflow-y-auto space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-10 h-10 text-gray-200 animate-spin" />
                            <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">กำลังค้นหาข้อมูล / SEARCHING...</p>
                        </div>
                    ) : bookings.length > 0 ? (
                        bookings.map((booking) => (
                            <div key={booking.id} className="bg-white rounded-[32px] border-2 border-gray-50 p-6 shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Booking ID / เลขที่การจอง</span>
                                        <span className="font-black text-xs text-gray-900">
                                            #{booking.bookingId || booking.id.slice(0, 6).toUpperCase()}
                                        </span>
                                    </div>
                                    <span className={cn(
                                        "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm flex flex-col items-center",
                                        booking.status === 'confirmed' ? "bg-green-100 text-green-700 border-green-200" :
                                            booking.status === 'cancelled' ? "bg-red-100 text-red-700 border-red-200" :
                                                "bg-yellow-100 text-yellow-700 border-yellow-200"
                                    )}>
                                        <span className="leading-none mb-0.5">
                                            {booking.status === 'confirmed' ? "ยืนยันแล้ว" :
                                                booking.status === 'cancelled' ? "ยกเลิกแล้ว" : "รอการยืนยัน"}
                                        </span>
                                        <span className="opacity-50 text-[7px] leading-none">
                                            {booking.status === 'confirmed' ? "CONFIRMED" :
                                                booking.status === 'cancelled' ? "CANCELLED" : "PENDING"}
                                        </span>
                                    </span>
                                </div>

                                <div className="space-y-4 mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-900">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Date & Time / วันเวลา</div>
                                            <div className="font-black text-gray-900">{formatDateTime(booking.dateTime)}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-900">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Service & Barber / บริการและช่าง</div>
                                            <div className="font-black text-gray-900">{booking.serviceName} • {booking.barberName}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-gray-100 w-full mb-6" />

                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Total / ยอดรวม</div>
                                        <div className="text-xl font-black text-gray-900 italic">฿ {booking.price?.toLocaleString()}</div>
                                    </div>
                                    {booking.slipUrl && (
                                        <a href={booking.slipUrl} target="_blank" className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b-2 border-blue-600 pb-0.5">
                                            View Slip / ดูหลักฐาน
                                        </a>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : searched ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-200">
                                <Search className="w-8 h-8" />
                            </div>
                            <h3 className="font-black text-gray-900 mb-2">ไม่พบข้อมูล / NO BOOKINGS FOUND</h3>
                            <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest">Please check your phone number</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-20">
                            <Search className="w-12 h-12 mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest">ค้นหาประวัติการจอง / SEARCH HISTORY</p>
                        </div>
                    )}
                </div>
            </main>

            <div className="w-full max-w-[400px] px-8 pb-4">
                <button
                    onClick={() => router.push('/bookings')}
                    className="w-full bg-black text-white py-4 rounded-[24px] font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-black/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                >
                    <ChevronLeft className="w-4 h-4" />
                    จองคิวใหม่ / BOOK NEW APPOINTMENT
                </button>
            </div>

            <footer className="w-full max-w-[400px] text-center p-6 pt-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">StoryCut © 2024 • All Rights Reserved</p>
            </footer>
        </div>
    );
}

export default function BookingStatusPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
        }>
            <StatusContent />
        </Suspense>
    );
}
