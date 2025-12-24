"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Calendar, Clock, Copy, Home, Scissors, Link as LinkIcon, X, Search } from "lucide-react";
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
    const searchParams = useSearchParams();
    const { id } = use(params);
    const [booking, setBooking] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [copiedId, setCopiedId] = useState(false);
    const [lineLink, setLineLink] = useState("https://line.me/R/ti/p/@storycut");

    const [showSuccessModal, setShowSuccessModal] = useState(false);

    useEffect(() => {
        if (searchParams.get('new') === 'true') {
            setShowSuccessModal(true);
        }
    }, [searchParams]);

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
        // CLEAN URL FORMAT: origin + path + id (No query params like ?new=true)
        const cleanUrl = `${window.location.origin}/bookings/status/${booking?.bookingId || id}`;
        navigator.clipboard.writeText(cleanUrl);
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
                <div id="booking-card" className="bg-[#ffffff] rounded-[32px] p-6 pt-8 shadow-2xl overflow-hidden relative text-center">
                    <div className={cn(
                        "absolute top-0 left-0 w-full h-2",
                        booking.status === 'confirmed' ? "bg-[#22c55e]" : "bg-[#eab308]"
                    )} />

                    <div className="flex justify-center mb-4">
                        <div className={cn(
                            "w-16 h-16 rounded-full flex items-center justify-center shadow-lg",
                            booking.status === 'confirmed' ? "bg-[#dcfce7] text-[#16a34a] shadow-[#dcfce7]" : "bg-[#fef9c3] text-[#ca8a04] shadow-[#fef9c3]"
                        )}>
                            {booking.status === 'confirmed' ? (
                                <Check className="w-8 h-8 stroke-[3px]" style={{ width: '32px', height: '32px' }} />
                            ) : (
                                <Clock className="w-8 h-8 stroke-[3px]" style={{ width: '32px', height: '32px' }} />
                            )}
                        </div>
                    </div>

                    <h1 className="text-xl font-black text-[#111827] uppercase tracking-tighter mb-1">
                        {booking.status === 'confirmed' ? "Booking Confirmed" : "Booking Pending"}
                    </h1>
                    <p className="text-[9px] font-bold text-[#9ca3af] uppercase tracking-[0.2em] mb-6">
                        {booking.status === 'confirmed' ? "Start looking good!" : "Waiting for confirmation"}
                    </p>

                    {/* Details List */}
                    <div className="bg-[#f9fafb] rounded-2xl p-5 space-y-3 mb-6 border border-[#f3f4f6]">
                        <button
                            onClick={handleCopyID}
                            className="w-full flex justify-between items-center group active:scale-[0.98] transition-transform"
                        >
                            <span className="text-[9px] font-black text-[#9ca3af] uppercase tracking-widest">Booking ID</span>
                            <div className="flex items-center gap-2">
                                <span className="font-black text-lg text-[#111827] tracking-wider">
                                    {booking.bookingId || id}
                                </span>
                                {copiedId ? (
                                    <Check className="w-3 h-3 text-[#22c55e]" style={{ width: '12px', height: '12px' }} />
                                ) : (
                                    <Copy className="w-3 h-3 text-[#d1d5db] group-hover:text-[#111827] transition-colors" style={{ width: '12px', height: '12px' }} />
                                )}
                            </div>
                        </button>

                        <div className="h-px bg-[#e5e7eb]" />

                        <div className="flex items-center gap-3 text-left">
                            <Calendar className="w-4 h-4 text-[#9ca3af] shrink-0" style={{ width: '16px', height: '16px' }} />
                            <div>
                                <div className="text-[8px] font-black text-[#9ca3af] uppercase tracking-widest">Date & Time</div>
                                <div className="font-bold text-[#111827] text-sm leading-tight">
                                    {booking.date} • {booking.time}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-left">
                            <Clock className="w-4 h-4 text-[#9ca3af] shrink-0" style={{ width: '16px', height: '16px' }} />
                            <div>
                                <div className="text-[8px] font-black text-[#9ca3af] uppercase tracking-widest">Duration</div>
                                <div className="font-bold text-[#111827] text-sm leading-tight">
                                    {booking.duration_min ? `${booking.duration_min} Mins` : "60 Mins"}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3 text-left">
                            <div className="w-4 h-4 rounded-full bg-[#e5e7eb] flex items-center justify-center text-[#6b7280] shrink-0">
                                <Scissors className="w-2.5 h-2.5" style={{ width: '10px', height: '10px' }} />
                            </div>
                            <div>
                                <div className="text-[8px] font-black text-[#9ca3af] uppercase tracking-widest">Service & Barber</div>
                                <div className="font-bold text-[#111827] text-xs leading-tight">
                                    {booking.serviceName}
                                    <span className="text-[#9ca3af] font-normal"> with </span>
                                    {booking.barberName}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financial Breakdown (Compact Noir) */}
                    <div className="bg-[#18181b] rounded-xl p-5 text-white mb-6 shadow-xl shadow-[#e5e7eb]">
                        <div className="flex justify-between items-center mb-1">
                            <span className="text-[9px] uppercase tracking-widest text-[#9ca3af] font-bold">Service Price</span>
                            <span className="text-xs font-bold text-[#d1d5db]">{formatPrice(booking.price || 0)}</span>
                        </div>
                        <div className="flex justify-between items-center mb-3">
                            <span className="text-[9px] uppercase tracking-widest text-[#22c55e] font-bold">Paid Deposit</span>
                            <span className="text-xs font-black text-[#4ade80]">- {formatPrice(booking.depositAmount || 0)}</span>
                        </div>
                        <div className="h-px bg-[#ffffff1a] w-full mb-3" />
                        <div className="flex justify-between items-end">
                            <span className="text-[8px] uppercase tracking-widest text-[#ffffff99] font-black mb-1 text-left max-w-[50%]">ชำระเพิ่มที่หน้าร้าน<br />(Balance)</span>
                            <span className="text-xl font-black italic text-white">{formatPrice(balance)}</span>
                        </div>
                    </div>

                    <div className="space-y-3">
                        <button
                            onClick={handleLineContact}
                            className="w-full bg-[#06C755] text-white py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-[#06C75533] hover:bg-[#05b64d]"
                        >
                            <img
                                src="https://upload.wikimedia.org/wikipedia/commons/4/41/LINE_logo.svg"
                                className="w-5 h-5 mr-2"
                                style={{ width: '20px', height: '20px', objectFit: 'contain', display: 'block' }} // Force size for html2canvas
                                alt="Line"
                            />
                            แจ้งแอดมินเพื่อยืนยันคิวทันที
                        </button>

                        <button
                            onClick={handleCopyLink}
                            className="w-full flex flex-row items-center justify-center gap-2 py-3.5 rounded-xl border border-[#e5e7eb] bg-white hover:bg-[#f9fafb] active:scale-[0.98] transition-all"
                        >
                            {copied ? (
                                <Check className="w-4 h-4 text-[#22c55e]" style={{ width: '16px', height: '16px' }} />
                            ) : (
                                <LinkIcon className="w-4 h-4 text-[#111827]" style={{ width: '16px', height: '16px' }} />
                            )}
                            <span className={cn("text-[10px] font-bold uppercase tracking-wider", copied ? "text-[#22c55e]" : "text-[#111827]")}>
                                {copied ? "Copied" : "Copy Link"} / {copied ? "คัดลอกแล้ว" : "คัดลอกลิงก์"}
                            </span>
                        </button>

                        <button
                            onClick={() => router.push("/bookings/status")}
                            className="w-full text-[#9ca3af] py-2 font-bold text-[9px] uppercase tracking-widest flex items-center justify-center gap-1 hover:text-[#111827] transition-colors"
                        >
                            <Search className="w-3 h-3" style={{ width: '12px', height: '12px' }} />
                            CHECK STATUS / เช็คสถานะ
                        </button>
                    </div>
                </div>
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] p-8 max-w-[320px] w-full text-center shadow-2xl animate-in zoom-in-95 duration-300 relative">
                        <button
                            onClick={() => setShowSuccessModal(false)}
                            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-400" />
                        </button>

                        <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto mb-6">
                            <Clock className="w-8 h-8 text-yellow-600 stroke-[3px]" />
                        </div>

                        <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-2">
                            WAITING FOR CONFIRMATION<br />
                            <span className="text-base text-gray-600">ระบบกำลังรอยืนยันการจอง</span>
                        </h2>

                        <p className="text-sm font-medium text-gray-600 mb-8 leading-relaxed">
                            Please capture this screen or copy the link and send it via Line@ for faster verification.<br />
                            <span className="text-xs text-gray-400">กรุณาแคปหน้าจอนี้ หรือคัดลอกลิงก์ และส่งมาทาง Line@ เพื่อความรวดเร็วในการตรวจสอบ</span>
                        </p>

                        <button
                            onClick={() => setShowSuccessModal(false)}
                            className="w-full bg-black text-white py-3.5 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-gray-900 transition-colors active:scale-[0.98]"
                        >
                            OK, I Understand / รับทราบ
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
