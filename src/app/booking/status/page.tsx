"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, MapPin, Calendar, Clock, CreditCard, ChevronRight, ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { getBookings } from "@/lib/db";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Booking {
    id: string;
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
                        onClick={() => router.push('/')}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-90"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="font-black text-2xl tracking-tighter uppercase">Status</div>
                </div>
            </header>

            {/* Main Card */}
            <main className="w-full max-w-[400px] bg-white rounded-t-[40px] md:rounded-[40px] flex-1 md:flex-none md:min-h-[700px] shadow-2xl relative overflow-hidden flex flex-col mb-0 md:mb-10 p-8">

                <h1 className="text-3xl font-black text-gray-900 mb-2">เช็คสถานะการจอง</h1>
                <p className="text-gray-500 font-medium text-sm mb-8">กรอกเบอร์โทรศัพท์เพื่อดูประวัติการจอง</p>

                {/* Search Box */}
                <div className="flex gap-2 mb-10">
                    <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="081XXXXXXX"
                        className="flex-1 p-4 rounded-2xl border-2 border-gray-50 bg-gray-50 font-bold text-gray-900 focus:bg-white focus:border-black transition-all outline-none placeholder:text-gray-300"
                    />
                    <button
                        onClick={() => handleSearch()}
                        className="bg-black text-white px-6 rounded-2xl font-black text-sm hover:bg-zinc-800 transition-all active:scale-95 shadow-xl shadow-black/20"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "ค้นหา"}
                    </button>
                </div>

                {/* Results Area */}
                <div className="flex-1 overflow-y-auto space-y-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-10 h-10 text-gray-200 animate-spin" />
                            <p className="text-gray-400 font-black uppercase tracking-widest text-[10px]">กำลังค้นหาข้อมูล...</p>
                        </div>
                    ) : bookings.length > 0 ? (
                        bookings.map((booking) => (
                            <div key={booking.id} className="bg-white rounded-[32px] border-2 border-gray-50 p-6 shadow-sm relative overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">เลขที่การจอง</span>
                                        <span className="font-black text-xs text-gray-900">#{booking.id.slice(-6).toUpperCase()}</span>
                                    </div>
                                    <span className={cn(
                                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border shadow-sm",
                                        booking.status === 'confirmed' ? "bg-green-100 text-green-700 border-green-200" :
                                            booking.status === 'cancelled' ? "bg-red-100 text-red-700 border-red-200" :
                                                "bg-yellow-100 text-yellow-700 border-yellow-200"
                                    )}>
                                        {booking.status === 'confirmed' ? "ยืนยันแล้ว" :
                                            booking.status === 'cancelled' ? "ยกเลิก" : "รอการยืนยัน"}
                                    </span>
                                </div>

                                <div className="space-y-4 mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-900">
                                            <Calendar className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">วันเวลาที่จอง</div>
                                            <div className="font-black text-gray-900">{booking.dateTime}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-900">
                                            <Clock className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">บริการและช่าง</div>
                                            <div className="font-black text-gray-900">{booking.serviceName} • {booking.barberName}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="h-px bg-gray-100 w-full mb-6" />

                                <div className="flex justify-between items-center">
                                    <div>
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">ยอดรวม</div>
                                        <div className="text-xl font-black text-gray-900">฿ {booking.price?.toLocaleString()}</div>
                                    </div>
                                    {booking.slipUrl && (
                                        <a href={booking.slipUrl} target="_blank" className="text-[10px] font-black text-blue-600 uppercase tracking-widest border-b-2 border-blue-600 pb-0.5">ดูหลักฐานการโอน</a>
                                    )}
                                </div>
                            </div>
                        ))
                    ) : searched ? (
                        <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-6 text-gray-200">
                                <Search className="w-8 h-8" />
                            </div>
                            <h3 className="font-black text-gray-900 mb-2">ไม่พบข้อมูลการจอง</h3>
                            <p className="text-gray-400 text-xs font-medium">กรุณาตรวจสอบเบอร์โทรศัพท์อีกครั้ง</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center py-20 text-center opacity-20">
                            <Search className="w-12 h-12 mb-4" />
                            <p className="text-[10px] font-black uppercase tracking-widest">ค้นหาประวัติการจอง</p>
                        </div>
                    )}
                </div>
            </main>

            <footer className="w-full max-w-[400px] text-center p-8">
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
