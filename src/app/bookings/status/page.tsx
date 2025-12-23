"use client";

import { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { Search, ChevronLeft, Loader2 } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

function StatusContent() {
    const router = useRouter();
    const [bookingId, setBookingId] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSearch = () => {
        if (!bookingId || bookingId.length !== 6) return;
        setLoading(true);
        // Redirect to dynamic status page
        router.push(`/bookings/status/${bookingId}`);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toUpperCase();
        // Allow only alphanumeric and max 6 chars
        if (/^[A-Z0-9]*$/.test(val) && val.length <= 6) {
            setBookingId(val);
        }
    };

    return (
        <div className="flex-1 flex flex-col bg-zinc-900 items-center min-h-screen font-sans">
            {/* Header */}
            <header className="w-full max-w-[400px] flex justify-between items-center px-6 py-6 text-white shrink-0">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => router.push('/bookings')} // Back to main booking
                        className="p-2 hover:bg-white/10 rounded-full transition-colors active:scale-90"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="font-black text-2xl tracking-tighter uppercase">Status</div>
                </div>
            </header>

            {/* Main Card */}
            <main className="w-full max-w-[400px] bg-white rounded-t-[40px] md:rounded-[40px] flex-1 md:flex-none md:min-h-[500px] shadow-2xl relative overflow-hidden flex flex-col mb-0 md:mb-10 p-8">

                <div className="mt-8">
                    <h2 className="flex flex-col mb-1 text-center">
                        <span className="text-3xl font-black text-gray-900 tracking-tighter">เช็คสถานะการจอง</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] italic -mt-1">CHECK BOOKING STATUS</span>
                    </h2>
                    <p className="text-gray-500 font-medium text-[10px] uppercase tracking-widest mb-12 text-center mt-2">
                        Enter your 6-character Booking ID
                    </p>

                    {/* Search Box */}
                    <div className="flex flex-col gap-4">
                        <div className="relative">
                            <input
                                type="text"
                                value={bookingId}
                                onChange={handleInputChange}
                                placeholder="A1B2C3"
                                className="w-full p-6 text-center text-3xl font-black uppercase tracking-[0.2em] rounded-[32px] border-2 border-gray-100 bg-gray-50 text-gray-900 focus:bg-white focus:border-black transition-all outline-none placeholder:text-gray-200"
                            />
                            <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-gray-300 pointer-events-none uppercase tracking-widest">
                                {bookingId.length}/6
                            </div>
                        </div>

                        <button
                            onClick={handleSearch}
                            disabled={bookingId.length !== 6 || loading}
                            className={cn(
                                "w-full py-5 rounded-[32px] font-black text-xs uppercase tracking-[0.2em] transition-all active:scale-[0.98] shadow-xl",
                                bookingId.length === 6
                                    ? "bg-black text-white hover:bg-zinc-800 shadow-black/20"
                                    : "bg-gray-100 text-gray-300 cursor-not-allowed"
                            )}
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : "SEARCH"}
                        </button>
                    </div>
                </div>

                <div className="mt-auto pt-10 flex flex-col items-center opacity-30 pointer-events-none">
                    <Search className="w-12 h-12 mb-4 text-gray-400" />
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Search your history</p>
                </div>
            </main>

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
