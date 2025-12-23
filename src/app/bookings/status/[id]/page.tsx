"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, Calendar, Clock, Copy, Home } from "lucide-react";
import { getBookingByCustomId } from "@/lib/db";
import { Loader2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function BookingSuccessPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { id } = params;
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchBooking = async () => {
            if (!id) return;
            try {
                const data = await getBookingByCustomId(id);
                setBooking(data);
            } catch (error) {
                console.error("Error fetching booking:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBooking();
    }, [id]);

    const handleCopyLink = () => {
        const url = window.location.href;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
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

    return (
        <div className="min-h-screen bg-zinc-900 flex flex-col items-center py-10 px-6">
            <div className="w-full max-w-[400px] space-y-6">

                {/* Success Card */}
                <div className="bg-white rounded-[40px] p-8 shadow-2xl overflow-hidden relative text-center">
                    <div className="absolute top-0 left-0 w-full h-2 bg-green-500" />

                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 text-green-600 shadow-xl shadow-green-100">
                        <Check className="w-10 h-10 stroke-[3px]" />
                    </div>

                    <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter mb-2">Booking Confirmed!</h1>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] mb-8">We have received your booking</p>

                    <div className="bg-gray-50 rounded-3xl p-6 space-y-4 mb-8">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Booking ID</span>
                            <span className="font-black text-lg text-gray-900">#{booking.bookingId || id}</span>
                        </div>
                        <div className="h-px bg-gray-200" />
                        <div className="flex items-center gap-4 text-left">
                            <Calendar className="w-5 h-5 text-gray-400" />
                            <div>
                                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Date</div>
                                <div className="font-bold text-gray-900 text-sm">{booking.date}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-left">
                            <Clock className="w-5 h-5 text-gray-400" />
                            <div>
                                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Time</div>
                                <div className="font-bold text-gray-900 text-sm">{booking.time}</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-4 text-left">
                            <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-black text-gray-500">?</div>
                            <div>
                                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Details</div>
                                <div className="font-bold text-gray-900 text-sm">{booking.serviceName} with {booking.barberName}</div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handleCopyLink}
                            className="w-full bg-black text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                        >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? "Link Copied!" : "Copy Status Link"}
                        </button>

                        <button
                            onClick={() => router.push("/bookings")}
                            className="w-full bg-white border-2 border-gray-100 text-gray-900 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-gray-50 transition-all active:scale-[0.98]"
                        >
                            <Home className="w-4 h-4" />
                            Book New Appointment
                        </button>
                    </div>
                </div>

                <p className="text-center text-[10px] font-black uppercase tracking-widest text-white/20">
                    A confirmation has been requested for this booking.
                </p>
            </div>
        </div>
    );
}
