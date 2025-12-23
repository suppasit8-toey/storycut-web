"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Check, Calendar, Clock, Copy, Home, Scissors } from "lucide-react";
import { getBookingByCustomId, getBranches } from "@/lib/db";
import { Loader2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const formatPrice = (price: number) => {
    return new Intl.NumberFormat('th-TH', {
        style: 'currency',
        currency: 'THB',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
    }).format(price);
};

export default function BookingSuccessPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params);
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [copiedId, setCopiedId] = useState(false);
    const [lineLink, setLineLink] = useState("https://line.me/R/ti/p/@storycut");

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                const bookingData = await getBookingByCustomId(id);
                setBooking(bookingData);

                // Fetch Branch for Line Link (Defaulting to chatuchak-ratchada as per requirement)
                const branches = await getBranches();
                const branch = branches.find((b: any) => b.slug === 'chatuchak-ratchada' || b.id === 'chatuchak-ratchada') as any || branches[0];

                if (branch?.lineContactLink || branch?.lineUrl) {
                    setLineLink(branch.lineContactLink || branch.lineUrl);
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleCopyLink = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyID = () => {
        if (booking?.bookingId || id) {
            navigator.clipboard.writeText(booking?.bookingId || id);
            setCopiedId(true);
            setTimeout(() => setCopiedId(false), 2000);
        }
    };

    const handleLineContact = () => {
        const message = `Check my booking: ${window.location.href}`;
        const finalUrl = lineLink.includes('?')
            ? `${lineLink}&text=${encodeURIComponent(message)}`
            : `${lineLink}?text=${encodeURIComponent(message)}`;

        // Fallback for better OA messaging experience if standard link fails
        const oaUrl = `https://line.me/R/oaMessage/@storycut/?${encodeURIComponent(message)}`;

        window.open(lineLink.includes('line.me') ? lineLink : oaUrl, '_blank');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
                <Loader2 className="w-10 h-10 text-white animate-spin" />
            </div>
        );
    }

    if (!booking) {
        return (
            <div className="min-h-screen bg-zinc-900 flex flex-col items-center justify-center p-6 text-white text-center">
                <h1 className="text-2xl font-black uppercase mb-4">Booking Not Found</h1>
                <p className="text-gray-400 mb-8">We couldn't find the booking with ID #{id}</p>
                <button
                    onClick={() => router.push("/bookings")}
                    className="bg-white text-black px-6 py-3 rounded-full font-bold uppercase tracking-widest"
                >
                    Back to Bookings
                </button>
            </div>
        );
    }

    const balance = (booking.price || 0) - (booking.depositAmount || 0);

    return (
        <div className="min-h-screen bg-zinc-900 flex flex-col items-center py-6 px-4 font-sans">
            <div className="w-full max-w-[380px] space-y-4">

                {/* Success Card */}
                <div className="bg-white rounded-[32px] p-6 pt-8 shadow-2xl overflow-hidden relative text-center">
                    <div className={cn(
                        "absolute top-0 left-0 w-full h-2",
                        booking.status === 'confirmed' ? "bg-green-500" : "bg-yellow-500"
                    )} />

                    <div className="flex justify-center mb-4">
                        <div className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center shadow-lg",
                            booking.status === 'confirmed' ? "bg-green-100 text-green-600 shadow-green-100" : "bg-yellow-100 text-yellow-600 shadow-yellow-100"
                        )}>
                            {booking.status === 'confirmed' ? (
                                <Check className="w-8 h-8 stroke-[3px]" />
                            ) : (
                                <Clock className="w-8 h-8 stroke-[3px]" />
                            )}
                        </div>
                    </div>

                    <h1 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-1">
                        {booking.status === 'confirmed' ? "Booking Confirmed" : "Booking Pending"}
                    </h1>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-6">
                        {booking.status === 'confirmed' ? "Start looking good!" : "Waiting for confirmation"}
                    </p>

                    {/* Details List */}
                    <div className="bg-gray-50 rounded-2xl p-5 space-y-3 mb-6 border border-gray-100">
                        <button
                            onClick={handleCopyID}
                            className="w-full flex justify-between items-center group active:scale-[0.98] transition-transform"
                        >
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Booking ID</span>
                            <div className="flex items-center gap-2">
                                <span className="font-black text-lg text-gray-900 tracking-wider">
                                    {booking.bookingId || id}
                                </span>
                                {copiedId ? (
                                    <Check className="w-3 h-3 text-green-500" />
                                ) : (
                                    <Copy className="w-3 h-3 text-gray-300 group-hover:text-gray-900 transition-colors" />
                                )}
                            </div>
                        </button>

                        <div className="h-px bg-gray-200" />

                        <div className="flex items-center gap-3 text-left">
                            <Calendar className="w-4 h-4 text-gray-400 shrink-0" />
                            <div>
                                <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Date & Time</div>
                                <div className="font-bold text-gray-900 text-sm leading-tight">
                                    {booking.date} • {booking.time}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-left">
                            <Clock className="w-4 h-4 text-gray-400 shrink-0" />
                            <div>
                                <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Duration</div>
                                <div className="font-bold text-gray-900 text-sm leading-tight">
                                    {booking.duration_min ? `${booking.duration_min} Mins` : "60 Mins"}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-left">
                            <div className="w-4 h-4 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 shrink-0">
                                <Scissors className="w-2.5 h-2.5" />
                            </div>
                            <div>
                                <div className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Service & Barber</div>
                                <div className="font-bold text-gray-900 text-xs leading-tight">
                                    {booking.serviceName}
                                    <span className="text-gray-400 font-normal"> with </span>
                                    {booking.barberName}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial Breakdown (Compact Noir) */}
                    <div className="bg-zinc-900 rounded-xl p-5 text-white mb-6 shadow-xl shadow-zinc-200">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] uppercase tracking-widest text-gray-400 font-bold">Service Price</span>
                            <span className="text-xs font-bold text-gray-300">{formatPrice(booking.price || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[9px] uppercase tracking-widest text-green-500 font-bold">Paid Deposit</span>
                            <span className="text-xs font-black text-green-400">- {formatPrice(booking.depositAmount || 0)}</span>
                        </div>
                        <div className="h-px bg-white/10 w-full mb-3" />
                        <div className="flex justify-between items-end">
                            <span className="text-[8px] uppercase tracking-widest text-white/60 font-black mb-1 text-left max-w-[50%]">ชำระเพิ่มที่หน้าร้าน<br />(Balance)</span>
                            <span className="text-xl font-black italic text-white">{formatPrice(balance)}</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handleLineContact}
                            className="w-full bg-[#06C755] text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-green-500/20 hover:bg-[#05b64d]"
                        >
                            <img src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg" className="w-5 h-5" alt="Line" />
                            แจ้งแอดมินเพื่อยืนยันคิวทันที
                        </button>

                        <button
                            onClick={() => router.push("/bookings")}
                            className="w-full text-gray-400 py-2 font-bold text-[9px] uppercase tracking-widest flex items-center justify-center gap-1 hover:text-gray-900 transition-colors"
                        >
                            <Home className="w-3 h-3" />
                            Back to Home
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
