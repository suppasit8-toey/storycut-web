"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { updateCustomerPoints } from "@/lib/db";
import { collection, query, orderBy, onSnapshot, where, doc, updateDoc, addDoc, getDocs, serverTimestamp, Timestamp } from "firebase/firestore";
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
    Phone,
    Play,
    Plus,
    Monitor,
    Timer,
    Save,
    Globe,
    Store
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDateDDMMYYYY } from "@/utils/dateUtils";
import { generateBookingId } from "@/utils/bookingUtils";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- Types ---
interface Booking {
    id: string;
    bookingId?: string; // Custom 6-char ID
    bookingType?: "walk-in" | "online";
    customerName: string;
    customerPhone?: string;
    phone?: string;
    serviceName: string;
    serviceId?: string;
    barberName: string;
    barberId?: string;
    date: string;
    time: string;
    price: number;
    status: "pending" | "confirmed" | "rejected" | "cancelled" | "in_progress" | "done" | "pending_payment";
    slipUrl?: string;
    createdAt: any;

    // Stats & Finance
    stats_actual_start?: any;
    stats_actual_finish?: any;
    extra_fee?: number;
    extra_note?: string;
    discount?: number;
    final_price?: number;
    commissionAmount?: number;
    stats_duration_used_min?: number;
    duration_min?: number;
    depositAmount?: number;
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

interface Barber {
    id: string;
    nickname: string;
    name_th?: string;
    name_en?: string;
    profile_image?: string;
}

interface Service {
    id: string;
    name_th: string;
    base_price: number;
    duration_min?: number;
}

export default function DashboardPage() {
    const [bookings, setBookings] = useState<Booking[]>([]); // Pending Bookings
    const [todayBookings, setTodayBookings] = useState<Booking[]>([]); // For Live Monitor
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [services, setServices] = useState<Service[]>([]);
    const [commissionMap, setCommissionMap] = useState<Record<string, { commission: number; price?: number }>>({}); // barberId_serviceId -> fixed commission
    const [loading, setLoading] = useState(true);
    const [selectedSlip, setSelectedSlip] = useState<string | null>(null);

    // Modals
    const [isWalkInOpen, setIsWalkInOpen] = useState(false);
    const [finishingBooking, setFinishingBooking] = useState<Booking | null>(null);

    // Walk-in Form
    const [walkInForm, setWalkInForm] = useState({
        customerName: "ลูกค้าหน้าร้าน",
        customerPhone: "",
        barberId: "",
        serviceId: "",
        price: 0,
        extraFee: 0,
        discount: 0,
        commission: 0,
        showSummary: false
    });

    // Finish Form
    const [finishForm, setFinishForm] = useState({
        extraFee: 0,
        extraNote: "",
        discount: 0,
        customerPhone: "",
    });

    const [editingPhoneId, setEditingPhoneId] = useState<string | null>(null);
    const [tempPhone, setTempPhone] = useState("");

    // --- Data Fetching ---
    useEffect(() => {
        // 1. Pending Bookings (Approvals)
        const qBookings = query(
            collection(db, "bookings"),
            where("status", "==", "pending"),
            orderBy("createdAt", "desc")
        );
        const unsubBookings = onSnapshot(qBookings, (snap) => {
            const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Booking));
            setBookings(data);
        });

        // 2. Today's Bookings (Live Monitor)
        const todayStr = formatDateDDMMYYYY(new Date());
        const qToday = query(
            collection(db, "bookings"),
            where("date", "==", todayStr),
            where("status", "in", ["confirmed", "in_progress", "done", "pending_payment"])
        );
        const unsubToday = onSnapshot(qToday, (snap) => {
            const data = snap.docs.map(doc => ({ ...doc.data(), id: doc.id } as Booking));
            setTodayBookings(data.sort((a, b) => a.time.localeCompare(b.time)));
            setLoading(false);
        });

        // 3. Pending Leave Requests
        const qLeaves = query(
            collection(db, "leave_requests"),
            where("status", "==", "pending"),
            orderBy("createdAt", "desc")
        );
        const unsubLeaves = onSnapshot(qLeaves, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest));
            setLeaveRequests(data);
        });

        // 4. Barbers, Services & Commissions
        const unsubBarbers = onSnapshot(collection(db, "barbers"), (snap) => {
            const data = snap.docs.map(doc => {
                const d = doc.data();
                return {
                    id: doc.id,
                    nickname: d.nickname || d.name_th || d.name_en || "Unknown",
                    profile_image: d.profile_image
                };
            });
            setBarbers(data);
        });

        getDocs(collection(db, "services")).then(snap => {
            setServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Service)));
        });

        getDocs(collection(db, "barberServices")).then(snap => {
            const map: Record<string, { commission: number; price?: number }> = {};
            snap.forEach(doc => {
                const d = doc.data();
                if (d.barber_id && d.service_id) {
                    map[`${d.barber_id}_${d.service_id}`] = {
                        commission: d.commission_fixed || 0,
                        price: d.price_normal
                    };
                }
            });
            setCommissionMap(map);
        });

        return () => {
            unsubBookings();
            unsubToday();
            unsubLeaves();
            unsubBarbers();
        };
    }, []);

    // --- Actions ---
    const handleBookingAction = async (id: string, status: "confirmed" | "rejected" | "cancelled") => {
        try {
            await updateBookingStatus(id, status);
        } catch (error) {
            console.error(error);
            alert("Failed to update booking status");
        }
    };

    const handleLeaveAction = async (id: string, status: "approved" | "rejected") => {
        try {
            await updateDoc(doc(db, "leave_requests", id), { status });
        } catch (error) {
            console.error(error);
            alert("Failed to update leave request status");
        }
    };

    // Live Monitor Logic
    const startService = async (booking: Booking) => {
        try {
            await updateDoc(doc(db, "bookings", booking.id), {
                status: "in_progress",
                stats_actual_start: serverTimestamp()
            });
        } catch (error) {
            console.error(error);
            alert("Failed to start service");
        }
    };

    // Alias for consistency
    const handleStartService = (id: string) => startService({ id } as Booking);

    const openFinishModal = (booking: Booking) => {
        setFinishingBooking(booking);
        setFinishForm({
            extraFee: booking.extra_fee || 0,
            extraNote: booking.extra_note || "",
            discount: booking.discount || 0,
            customerPhone: booking.customerPhone || booking.phone || ""
        });
    };

    const confirmFinishService = async () => {
        if (!finishingBooking) return;
        try {
            const finalPrice = (finishingBooking.price || 0) + Number(finishForm.extraFee) - Number(finishForm.discount);

            // Calculate Commission
            let commission = 0;
            if (finishingBooking.barberId && finishingBooking.serviceId) {
                const key = `${finishingBooking.barberId}_${finishingBooking.serviceId}`;
                if (commissionMap[key]) {
                    commission = commissionMap[key].commission;
                } else {
                    commission = finalPrice * 0.5; // Default 50%
                }
            } else {
                commission = finalPrice * 0.5;
            }

            // Calculate Duration
            let durationUsed = finishingBooking.stats_duration_used_min || 0;
            if (!durationUsed && finishingBooking.stats_actual_start) {
                const start = finishingBooking.stats_actual_start.toDate ? finishingBooking.stats_actual_start.toDate() : new Date(finishingBooking.stats_actual_start);
                const now = new Date();
                const diffMs = now.getTime() - start.getTime();
                durationUsed = Math.round(diffMs / 60000);
            }

            const updatePayload: any = {
                status: "done",
                extra_fee: Number(finishForm.extraFee),
                extra_note: finishForm.extraNote,
                discount: Number(finishForm.discount),
                final_price: finalPrice > 0 ? finalPrice : 0,
                commissionAmount: commission,
                stats_duration_used_min: durationUsed
            };

            // Only update finish timestamp if not already set (e.g. if barber didn't finish it)
            if (!finishingBooking.stats_actual_finish) {
                updatePayload.stats_actual_finish = serverTimestamp();
            }

            // 1. Update Booking
            await updateDoc(doc(db, "bookings", finishingBooking.id), updatePayload);

            // 2. Update Customer Points (Loyalty)
            if (finishForm.customerPhone) {
                // Determine name (use latest from booking or keep existing)
                await updateCustomerPoints(finishForm.customerPhone, 10, finishingBooking.customerName);
            }

            setFinishingBooking(null);
        } catch (error) {
            console.error(error);
            alert("Failed to finish service");
        }
    };

    // --- Walk-in Logic ---
    const handleWalkInSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Step 1: Show Summary if not already showing
        if (!walkInForm.showSummary) {
            if (!walkInForm.barberId || !walkInForm.serviceId) {
                alert("Please select barber and service");
                return;
            }

            // Calculate Price & Commission
            const service = services.find(s => s.id === walkInForm.serviceId);

            let price = service?.base_price || 0;
            let commission = 0;

            // Check specialized pricing & commission
            const key = `${walkInForm.barberId}_${walkInForm.serviceId}`;
            if (commissionMap[key]) {
                const mapData = commissionMap[key];
                commission = mapData.commission;
                // Use override price if available
                if (mapData.price) {
                    price = mapData.price;
                }
            } else {
                commission = price * 0.5;
            }

            setWalkInForm(prev => ({
                ...prev,
                price,
                commission,
                showSummary: true
            }));
            return;
        }

        // Step 2: Final Submission
        // Strict Phone Validation
        if (walkInForm.customerPhone) {
            const phoneRegex = /^0\d{9}$/;
            if (!phoneRegex.test(walkInForm.customerPhone)) {
                alert("เบอร์โทรศัพท์ต้องมี 10 หลักและเริ่มด้วยเลข 0");
                return;
            }
        }

        try {
            const barber = barbers.find(b => b.id === walkInForm.barberId);
            const service = services.find(s => s.id === walkInForm.serviceId);
            const todayStr = formatDateDDMMYYYY(new Date());
            const now = new Date();
            const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

            // Generate unique booking ID
            const bookingId = await generateBookingId();

            const newBooking: Omit<Booking, "id"> = {
                bookingId, // Add the custom ID
                bookingType: "walk-in", // Categorize as Walk-in
                customerName: walkInForm.customerName,
                customerPhone: walkInForm.customerPhone,
                barberId: walkInForm.barberId,
                barberName: barber?.nickname || "Unknown",
                serviceId: walkInForm.serviceId,
                serviceName: service?.name_th || "Unknown",
                date: todayStr,
                time: timeStr,
                price: Number(walkInForm.price),
                status: "confirmed", // Queue Mode
                createdAt: serverTimestamp(),
                // stats_actual_start: serverTimestamp(), // Wait for manual start
                commissionAmount: Number(walkInForm.commission),
                extra_fee: Number(walkInForm.extraFee),
                discount: Number(walkInForm.discount),
                duration_min: service?.duration_min || 0,
                depositAmount: 0 // Walk-in has no deposit
            };

            await addDoc(collection(db, "bookings"), newBooking);

            // Sync Points if phone provided
            if (walkInForm.customerPhone) {
                updateCustomerPoints(walkInForm.customerPhone, 10, walkInForm.customerName);
            }

            // Reset
            setIsWalkInOpen(false);
            setWalkInForm({
                customerName: "ลูกค้าหน้าร้าน",
                customerPhone: "",
                barberId: "",
                serviceId: "",
                price: 0,
                extraFee: 0,
                discount: 0,
                commission: 0,
                showSummary: false
            });
        } catch (error) {
            console.error(error);
            alert("Failed to create walk-in booking");
        }
    };

    // Helper: Timer Component
    const LiveTimer = ({ startTime }: { startTime: any }) => {
        const [elapsed, setElapsed] = useState("00:00:00");

        useEffect(() => {
            if (!startTime) return;
            // Handle Firestore Timestamp
            const start = startTime.toDate ? startTime.toDate() : new Date(startTime);

            const interval = setInterval(() => {
                const now = new Date();
                const diff = now.getTime() - start.getTime();
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                const s = Math.floor((diff % 60000) / 1000);
                setElapsed(
                    `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
                );
            }, 1000);

            return () => clearInterval(interval);
        }, [startTime]);

        return <span className="font-mono text-xl md:text-2xl font-black text-green-400 tracking-wider">{elapsed}</span>;
    };

    const StaticTimer = ({ durationMin }: { durationMin: number }) => {
        const h = Math.floor(durationMin / 60);
        const m = Math.floor(durationMin % 60);
        return (
            <span className="font-mono text-xl md:text-2xl font-black text-yellow-400 tracking-wider font-variant-numeric">
                {h.toString().padStart(2, '0')}:{m.toString().padStart(2, '0')}:00
            </span>
        )
    };

    // Helper: Format Timestamp
    const formatTimestamp = (timestamp: any) => {
        if (!timestamp) return "";
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-20">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter text-white mb-2 font-inter uppercase">Dashboard</h1>
                    <p className="text-gray-400 text-[10px] md:text-xs font-bold uppercase tracking-[0.2em]">Real-time Operations</p>
                </div>
                <button
                    onClick={() => setIsWalkInOpen(true)}
                    className="bg-white text-black px-6 py-3 rounded-full font-black uppercase text-xs tracking-wider hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)] flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Quick Walk-in
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
            ) : (
                <>
                    {/* SECTION: ACTIVE JOBS */}
                    <div className="mb-8 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                            <h2 className="text-2xl font-black italic text-white uppercase font-inter tracking-tight">Active Jobs</h2>
                        </div>

                        {todayBookings.filter(b => ["in_progress", "pending_payment"].includes(b.status)).length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {todayBookings.filter(b => ["in_progress", "pending_payment"].includes(b.status)).map(booking => {
                                    const barber = barbers.find(barber => barber.id === booking.barberId);
                                    const isPendingPayment = booking.status === 'pending_payment';
                                    const isConfirmed = booking.status === 'confirmed';
                                    const isInProgress = booking.status === 'in_progress';

                                    return (
                                        <div key={booking.id} className={cn(
                                            "rounded-[32px] p-6 border shadow-lg relative overflow-hidden transition-all",
                                            isPendingPayment ? "bg-[#2A2A1A] border-yellow-500/20 hover:border-yellow-500/40" :
                                                isConfirmed ? "bg-[#101010] border-blue-500/20 hover:border-blue-500/40" :
                                                    "bg-[#1A1A1A] border-green-500/20 hover:border-green-500/40"
                                        )}>
                                            {isPendingPayment ? (
                                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl" />
                                            ) : isConfirmed ? (
                                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/5 rounded-full blur-3xl" />
                                            ) : (
                                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-green-500/5 rounded-full blur-3xl group-hover:bg-green-500/10 transition-colors" />
                                            )}

                                            <div className="flex justify-between items-start mb-6">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-10 h-10 rounded-full overflow-hidden border border-white/10">
                                                        {barber?.profile_image ? (
                                                            <img src={barber.profile_image} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500"><User className="w-4 h-4" /></div>
                                                        )}
                                                    </div>
                                                    <div>
                                                        <div className="text-white font-bold text-sm">{barber?.nickname}</div>
                                                        <div className={cn("text-[10px] font-bold uppercase tracking-wider",
                                                            isPendingPayment ? "text-yellow-500" :
                                                                isConfirmed ? "text-blue-500" : "text-green-500"
                                                        )}>
                                                            {isPendingPayment ? "Wait Summary" :
                                                                isConfirmed ? "Next Queue" : "Working"}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <div className={cn("px-3 py-1 rounded-full border border-white/5", isConfirmed ? "bg-blue-500/10" : "bg-black/40")}>
                                                        {isPendingPayment ? (
                                                            <StaticTimer durationMin={booking.stats_duration_used_min || 0} />
                                                        ) : isConfirmed ? (
                                                            <span className="text-white font-mono font-bold text-lg">{booking.time}</span>
                                                        ) : (
                                                            <LiveTimer startTime={booking.stats_actual_start} />
                                                        )}
                                                    </div>
                                                    {/* Booking ID & Type */}
                                                    <div className="flex items-center gap-1.5 opacity-40">
                                                        {booking.bookingType === 'online' ? <Globe className="w-3 h-3 text-blue-400" /> : <Store className="w-3 h-3 text-orange-400" />}
                                                        <span className="text-[10px] font-mono text-white/60 tracking-wider">
                                                            #{booking.bookingId || "---"}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="mb-6">
                                                <h3 className="text-xl font-black italic text-white mb-1 truncate">{booking.serviceName}</h3>
                                                <p className="text-gray-400 text-xs font-bold uppercase tracking-wide mb-2">{booking.customerName}</p>

                                                {/* Phone Number Section */}
                                                <div className="flex items-center gap-2 h-8">
                                                    {editingPhoneId === booking.id ? (
                                                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
                                                            <input
                                                                autoFocus
                                                                type="tel"
                                                                value={tempPhone}
                                                                onChange={(e) => setTempPhone(e.target.value)}
                                                                className="w-32 bg-black border border-white/20 rounded-lg px-2 py-1 text-xs text-white outline-none focus:border-blue-500 font-mono"
                                                                placeholder="08..."
                                                                onClick={(e) => e.stopPropagation()}
                                                            />
                                                            <button
                                                                onClick={async (e) => {
                                                                    e.stopPropagation();
                                                                    await updateDoc(doc(db, "bookings", booking.id), { customerPhone: tempPhone });
                                                                    setEditingPhoneId(null);
                                                                }}
                                                                className="bg-blue-500 text-white p-1.5 rounded-lg hover:bg-blue-400"
                                                            >
                                                                <Save className="w-3 h-3" />
                                                            </button>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingPhoneId(null);
                                                                }}
                                                                className="bg-gray-800 text-gray-400 p-1.5 rounded-lg hover:text-white"
                                                            >
                                                                <X className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center gap-2">
                                                            {booking.customerPhone || booking.phone ? (
                                                                <div className="flex items-center gap-2 text-gray-300 bg-black/20 px-2 py-1 rounded-lg border border-white/5">
                                                                    <Phone className="w-3 h-3" />
                                                                    <span className="text-xs font-mono font-bold">{booking.customerPhone || booking.phone}</span>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setEditingPhoneId(booking.id);
                                                                            setTempPhone(booking.customerPhone || booking.phone || "");
                                                                        }}
                                                                        className="text-gray-500 hover:text-white ml-1 opacity-50 hover:opacity-100"
                                                                    >
                                                                        <Scissors className="w-3 h-3 rotate-[270deg]" /> {/* Use Scissors as Edit Icon or just generic edit */}
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        setEditingPhoneId(booking.id);
                                                                        setTempPhone("");
                                                                    }}
                                                                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-[10px] font-bold uppercase tracking-wider bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20 hover:bg-blue-500/20 transition-colors"
                                                                >
                                                                    <Plus className="w-3 h-3" /> Add Phone (+Pts)
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="mt-4 pt-4 border-t border-white/5 flex gap-3">
                                                {isPendingPayment ? (
                                                    <button
                                                        onClick={() => openFinishModal(booking)}
                                                        className="flex-1 bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" /> Checkout
                                                    </button>
                                                ) : isConfirmed ? (
                                                    <button
                                                        onClick={() => handleStartService(booking.id)}
                                                        className="flex-1 bg-white text-black hover:bg-gray-200 py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all flex items-center justify-center gap-2"
                                                    >
                                                        <Play className="w-4 h-4" /> Start Service
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={async () => {
                                                            if (confirm("Finish service and send to payment?")) {
                                                                await updateDoc(doc(db, "bookings", booking.id), {
                                                                    status: "pending_payment",
                                                                    stats_actual_finish: serverTimestamp()
                                                                });
                                                            }
                                                        }}
                                                        className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-3 rounded-xl font-black uppercase text-xs tracking-widest transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2"
                                                    >
                                                        <CheckCircle2 className="w-4 h-4" /> Finish Job
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-12 border border-dashed border-white/10 rounded-[32px] bg-white/5">
                                <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3">
                                    <Scissors className="w-5 h-5 text-gray-500" />
                                </div>
                                <div className="text-gray-500 font-bold uppercase text-xs tracking-widest">No active jobs at the moment</div>
                            </div>
                        )}
                    </div>

                    <div className="h-px bg-white/10 my-8" />

                    {/* SECTION: STAFF STATUS (Live Monitor) */}
                    <div className="mb-4">
                        <h2 className="text-xl font-bold text-gray-400 uppercase tracking-widest font-inter mb-4">Staff Status</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {barbers.map(barber => {
                            // Find active booking for this barber
                            const inProgress = todayBookings.find(b => b.barberId === barber.id && (b.status === "in_progress" || b.status === "pending_payment"));
                            // Find next confirmed booking
                            const nextQueue = todayBookings.find(b => b.barberId === barber.id && b.status === "confirmed");

                            const isPendingPayment = inProgress?.status === 'pending_payment';

                            return (
                                <div key={barber.id} className="bg-[#1A1A1A] rounded-[32px] p-6 border border-white/5 relative overflow-hidden group opacity-80 hover:opacity-100 transition-opacity">
                                    {/* Barber Header */}
                                    <div className="flex items-center gap-4 mb-4">
                                        <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-white/10 relative">
                                            {barber.profile_image ? (
                                                <img src={barber.profile_image} className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full bg-gray-800 flex items-center justify-center text-gray-500"><User className="w-6 h-6" /></div>
                                            )}
                                            {/* Status Indicator Dot on Avatar */}
                                            <div className={cn(
                                                "absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#1A1A1A]",
                                                inProgress ? "bg-green-500 animate-pulse" : "bg-gray-500"
                                            )} />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-lg">{barber.nickname}</h3>
                                            <div className="flex items-center gap-2">
                                                <div className={cn("w-1.5 h-1.5 rounded-full", inProgress ? "bg-green-500" : "bg-gray-600")} />
                                                <span className={cn(
                                                    "text-[10px] uppercase font-bold tracking-wider",
                                                    inProgress ? "text-green-500" : "text-gray-500"
                                                )}>
                                                    {inProgress ? "Busy" : "Available"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="space-y-4">
                                        {inProgress ? (
                                            // STATE: WORKING (Simplified for list view since we have Active Jobs section)
                                            // STATE: WORKING (Simplified for list view since we have Active Jobs section)
                                            <div className={cn("border rounded-2xl p-4 text-center transition-colors", isPendingPayment ? "bg-yellow-900/10 border-yellow-500/10" : "bg-green-900/10 border-green-500/10")}>
                                                <div className={cn("text-[10px] font-bold uppercase tracking-widest mb-1", isPendingPayment ? "text-yellow-500" : "text-green-500")}>
                                                    {isPendingPayment ? "Wait Summary" : "Current Job"}
                                                </div>
                                                <div className="text-white font-bold text-sm truncate">{inProgress.customerName}</div>
                                            </div>
                                        ) : nextQueue ? (
                                            // STATE: NEXT QUEUE
                                            <div className="bg-[#1A1A1A] rounded-2xl p-4 border border-blue-500/20 shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 block mb-0.5">Next Queue</span>
                                                        <span className="text-white font-bold text-lg leading-tight block">{nextQueue.customerName}</span>
                                                        <span className="text-gray-500 text-xs font-medium block">{nextQueue.serviceName}</span>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-1">
                                                        <div className="bg-blue-500/10 px-2 py-1 rounded-lg border border-blue-500/20">
                                                            <span className="text-blue-400 font-mono font-bold text-sm block leading-none">{nextQueue.time}</span>
                                                        </div>
                                                        {/* Booking ID & Type */}
                                                        <div className="flex items-center gap-1.5 opacity-40">
                                                            {nextQueue.bookingType === 'online' ? <Globe className="w-3 h-3 text-blue-400" /> : <Store className="w-3 h-3 text-orange-400" />}
                                                            <span className="text-[10px] font-mono text-white/60 tracking-wider">
                                                                #{nextQueue.bookingId || "---"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() => startService(nextQueue)} // Correct function name 'startService' available in scope
                                                    className="w-full bg-white text-black font-black py-3 rounded-xl uppercase text-xs tracking-wider hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                                                >
                                                    <Play className="w-3 h-3 fill-current" /> Start Job
                                                </button>
                                            </div>
                                        ) : (
                                            // STATE: IDLE
                                            <div className="bg-black/20 border border-dashed border-white/10 rounded-2xl p-8 flex flex-col items-center justify-center text-gray-600 gap-2 h-[140px]">
                                                <Coffee className="w-6 h-6 opacity-50" />
                                                <span className="text-[10px] font-bold uppercase">No Queue</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div className="h-px bg-white/10 my-8" />

                    {/* APPROVAL SECTION */}
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
                                                {/* Slip Preview */}
                                                {booking.slipUrl ? (
                                                    <button onClick={() => setSelectedSlip(booking.slipUrl!)} className="w-20 h-20 shrink-0 bg-white/5 rounded-2xl overflow-hidden border border-white/10 relative group/slip cursor-zoom-in">
                                                        <img src={booking.slipUrl} className="w-full h-full object-cover opacity-80 group-hover/slip:opacity-100 transition-opacity" alt="slip" />
                                                    </button>
                                                ) : (
                                                    <div className="w-20 h-20 shrink-0 bg-white/5 rounded-2xl flex items-center justify-center border border-white/5 opacity-50">
                                                        <span className="text-[10px] font-bold uppercase text-gray-500">No Slip</span>
                                                    </div>
                                                )}

                                                <div className="flex-1 min-w-0">
                                                    <h3 className="text-white font-black text-2xl uppercase tracking-tighter leading-none mb-2 font-inter">{booking.serviceName}</h3>
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-gray-300 font-bold text-sm">{booking.customerName}</span>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-white font-mono text-xs">{booking.customerPhone || booking.phone || "-"}</span>
                                                            {(booking.customerPhone || booking.phone) && (
                                                                <a href={`tel:${booking.customerPhone || booking.phone}`} className="inline-flex items-center gap-1 bg-white/10 hover:bg-white/20 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider text-green-400 transition-colors">
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

                                            <div className="grid grid-cols-2 gap-3 mt-6">
                                                <button onClick={() => handleBookingAction(booking.id, 'confirmed')} className="bg-white text-black py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-gray-200 transition-all">
                                                    Confirm
                                                </button>
                                                <button onClick={() => handleBookingAction(booking.id, 'rejected')} className="bg-[#222] text-gray-400 border border-white/5 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-950/30 hover:text-red-500 transition-all">
                                                    Reject
                                                </button>
                                            </div>
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
                                    {leaveRequests.map(request => {
                                        const barber = barbers.find(b => b.id === request.barberId);
                                        return (
                                            <div key={request.id} className="bg-black/40 rounded-[24px] p-6 border border-white/5 hover:border-white/20 transition-all">
                                                <div className="mb-4 pb-4 border-b border-white/5">
                                                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Request by</div>
                                                    <div className="text-lg font-black text-white italic tracking-tight">Barber {barber?.nickname || request.barberName || "Unknown"}</div>
                                                </div>

                                                <div className="flex justify-between items-start mb-4">
                                                    <div className={cn(
                                                        "inline-flex items-center justify-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                                                        request.type === 'sick' ? "bg-red-900/30 text-red-400" : "bg-blue-900/30 text-blue-400"
                                                    )}>
                                                        {request.type}
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-lg font-bold text-white font-mono">{request.date}</div>
                                                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                                                            {request.startTime && request.endTime ? `${request.startTime} - ${request.endTime}` : "Full Day"}
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3 pt-2">
                                                    <button onClick={() => handleLeaveAction(request.id, 'approved')} className="bg-[#222] text-white border border-white/10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all">
                                                        Approve
                                                    </button>
                                                    <button onClick={() => handleLeaveAction(request.id, 'rejected')} className="bg-[#1a0000] text-red-500 border border-red-500/10 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-900/20 transition-colors">
                                                        Reject
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>
                </>
            )
            }

            {/* Slip Modal */}
            {
                selectedSlip && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200">
                        <button onClick={() => setSelectedSlip(null)} className="absolute top-6 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-all">
                            <X className="w-6 h-6" />
                        </button>
                        <div className="p-4 max-w-2xl w-full">
                            <img src={selectedSlip} className="w-full rounded-3xl shadow-2xl border-4 border-white/10" alt="Full size slip" />
                        </div>
                    </div>
                )
            }

            {/* Walk-in Modal */}
            {
                isWalkInOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                        <div className="bg-[#1A1A1A] w-full max-w-lg rounded-[32px] border border-white/10 overflow-hidden shadow-2xl">
                            <div className="p-8 border-b border-white/5 flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-black italic text-white uppercase font-inter">
                                        {walkInForm.showSummary ? "Walk-in Summary" : "Quick Walk-in"}
                                    </h2>
                                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">
                                        {walkInForm.showSummary ? "Review & Confirm" : "No Deposit Required"}
                                    </p>
                                </div>
                                <button onClick={() => setIsWalkInOpen(false)} className="text-gray-500 hover:text-white">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <form onSubmit={handleWalkInSubmit} className="p-8 space-y-6">
                                {!walkInForm.showSummary ? (
                                    // STEP 1: INITIAL FORM
                                    <div className="space-y-6 animate-in slide-in-from-left-4 duration-300">
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Customer Name</label>
                                            <input
                                                type="text"
                                                value={walkInForm.customerName}
                                                onChange={e => setWalkInForm({ ...walkInForm, customerName: e.target.value })}
                                                className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-white outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Phone (Optional)</label>
                                            <div className="relative">
                                                <input
                                                    type="tel"
                                                    value={walkInForm.customerPhone}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                        setWalkInForm({ ...walkInForm, customerPhone: val });
                                                    }}
                                                    className={cn(
                                                        "w-full bg-black border rounded-xl px-4 py-3 text-white focus:outline-none transition-all",
                                                        walkInForm.customerPhone && !/^0\d{9}$/.test(walkInForm.customerPhone)
                                                            ? "border-red-500 focus:border-red-500"
                                                            : "border-white/10 focus:border-white"
                                                    )}
                                                    placeholder="08..."
                                                />
                                                {walkInForm.customerPhone && !/^0\d{9}$/.test(walkInForm.customerPhone) && (
                                                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-red-500 bg-red-950/50 px-2 py-1 rounded">
                                                        Invalid
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Select Barber</label>
                                                <select
                                                    value={walkInForm.barberId}
                                                    onChange={e => setWalkInForm({ ...walkInForm, barberId: e.target.value })}
                                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-white outline-none appearance-none"
                                                    required
                                                >
                                                    <option value="">Select...</option>
                                                    {barbers.map(b => (
                                                        <option key={b.id} value={b.id}>{b.nickname}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Select Service</label>
                                                <select
                                                    value={walkInForm.serviceId}
                                                    onChange={e => setWalkInForm({ ...walkInForm, serviceId: e.target.value })}
                                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-white outline-none appearance-none"
                                                    required
                                                >
                                                    <option value="">Select...</option>
                                                    {services.map(s => (
                                                        <option key={s.id} value={s.id}>{s.name_th}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <button type="submit" className="w-full bg-white text-black font-black py-4 rounded-xl uppercase text-sm tracking-wider hover:scale-105 transition-all">
                                            Next Step
                                        </button>
                                    </div>
                                ) : (
                                    // STEP 2: SUMMARY
                                    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                                        <div className="bg-black/40 p-6 rounded-2xl border border-white/5 space-y-4 text-center">
                                            <div>
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1">Service</div>
                                                <div className="text-xl font-black text-white italic">
                                                    {services.find(s => s.id === walkInForm.serviceId)?.name_th}
                                                    {services.find(s => s.id === walkInForm.serviceId)?.duration_min && (
                                                        <span className="text-sm text-gray-400 font-bold ml-2 no-italic">
                                                            ({services.find(s => s.id === walkInForm.serviceId)?.duration_min} min)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-center gap-2">
                                                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10">
                                                    <img src={barbers.find(b => b.id === walkInForm.barberId)?.profile_image} className="w-full h-full object-cover" />
                                                </div>
                                                <span className="text-gray-300 font-bold text-sm">{barbers.find(b => b.id === walkInForm.barberId)?.nickname}</span>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <div className="flex justify-between items-center bg-black/40 px-4 py-3 rounded-xl border border-white/5 mb-4">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">Start Time</span>
                                                    <span className="text-white font-mono font-bold">
                                                        {new Date().toLocaleString('th-TH', {
                                                            year: 'numeric',
                                                            month: '2-digit',
                                                            day: '2-digit',
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                            hour12: false
                                                        })}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="col-span-2">
                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-yellow-500 mb-2">Price (THB)</label>
                                                <input
                                                    type="number"
                                                    value={walkInForm.price}
                                                    onChange={e => setWalkInForm({ ...walkInForm, price: Number(e.target.value) })}
                                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-yellow-500 outline-none font-mono text-center font-bold text-lg"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-orange-500 mb-2">Extra (THB)</label>
                                                <input
                                                    type="number"
                                                    value={walkInForm.extraFee || ''}
                                                    onChange={e => setWalkInForm({ ...walkInForm, extraFee: Number(e.target.value) })}
                                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-orange-500 outline-none font-mono text-center font-bold text-lg"
                                                    placeholder="0"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-[10px] font-bold uppercase tracking-wider text-red-500 mb-2">Discount (THB)</label>
                                                <input
                                                    type="number"
                                                    value={walkInForm.discount || ''}
                                                    onChange={e => setWalkInForm({ ...walkInForm, discount: Number(e.target.value) })}
                                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-white focus:border-red-500 outline-none font-mono text-center font-bold text-lg"
                                                    placeholder="0"
                                                />
                                            </div>
                                            {/* Hidden Commission Field - Calculated in background */}
                                        </div>

                                        <div className="flex gap-3 pt-4">
                                            <button
                                                type="button"
                                                onClick={() => setWalkInForm(prev => ({ ...prev, showSummary: false }))}
                                                className="flex-1 bg-gray-800 text-white font-bold py-4 rounded-xl uppercase text-xs tracking-wider hover:bg-gray-700"
                                            >
                                                Back
                                            </button>
                                            <button type="submit" className="flex-[2] bg-white text-black font-black py-4 rounded-xl uppercase text-xs tracking-wider hover:scale-105 transition-all shadow-lg flex items-center justify-center gap-2">
                                                <CheckCircle2 className="w-4 h-4" /> Confirm & Start
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </form>
                        </div >
                    </div >
                )
            }

            {/* Finish Job Modal */}
            {
                finishingBooking && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 backdrop-blur-sm animate-in fade-in duration-200 p-4">
                        <div className="bg-[#1A1A1A] w-full max-w-lg rounded-[32px] border border-white/10 overflow-hidden shadow-2xl">
                            <div className="p-8 border-b border-white/5 flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-black italic text-white uppercase font-inter">Checkout</h2>
                                    <p className="text-gray-500 text-[10px] font-bold uppercase tracking-widest">{finishingBooking.serviceName} • {finishingBooking.customerName}</p>
                                </div>
                                <button onClick={() => setFinishingBooking(null)} className="text-gray-500 hover:text-white">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            <div className="p-8 space-y-6">
                                <div className="flex justify-between items-center bg-black/40 p-4 rounded-xl border border-white/5">
                                    <span className="text-gray-400 font-bold text-sm">Service Price</span>
                                    <span className="text-white font-mono text-xl">{finishingBooking.price} THB</span>
                                </div>

                                <div className="bg-black/20 p-4 rounded-xl border border-white/5 space-y-3">
                                    <label className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-blue-400">
                                        <Phone className="w-3 h-3" /> Customer Phone (Loyalty)
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="tel"
                                            value={finishForm.customerPhone || ""}
                                            onChange={e => setFinishForm({ ...finishForm, customerPhone: e.target.value })}
                                            className="flex-1 bg-black border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:border-blue-500 outline-none font-mono"
                                            placeholder="Enter phone for points..."
                                        />
                                        {finishForm.customerPhone && finishForm.customerPhone.length >= 9 && (
                                            <div className="bg-blue-500/10 px-3 py-2 rounded-lg border border-blue-500/20 flex items-center gap-2 whitespace-nowrap">
                                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">+10 Points</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-yellow-500 mb-2">Extra Technique/Time</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">+</span>
                                            <input
                                                type="number"
                                                value={finishForm.extraFee}
                                                onChange={e => setFinishForm({ ...finishForm, extraFee: Number(e.target.value) })}
                                                className="w-full bg-black border border-white/10 rounded-xl pl-6 pr-3 py-3 text-white focus:border-yellow-500 outline-none font-mono"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold uppercase tracking-wider text-red-500 mb-2">Discount</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">-</span>
                                            <input
                                                type="number"
                                                value={finishForm.discount}
                                                onChange={e => setFinishForm({ ...finishForm, discount: Number(e.target.value) })}
                                                className="w-full bg-black border border-white/10 rounded-xl pl-6 pr-3 py-3 text-white focus:border-red-500 outline-none font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2">Note (Optional)</label>
                                    <input
                                        type="text"
                                        value={finishForm.extraNote}
                                        onChange={e => setFinishForm({ ...finishForm, extraNote: e.target.value })}
                                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3 text-gray-300 focus:border-white outline-none text-sm"
                                        placeholder="e.g. Special design, Late night fee"
                                    />
                                </div>

                                <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-gray-400 font-mono text-[10px] uppercase tracking-widest">
                                            ID: {finishingBooking.bookingId || finishingBooking.id.slice(0, 6).toUpperCase()}
                                        </span>
                                        <div className="h-px bg-white/10 flex-1" />
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-gray-400 font-bold text-sm">Service Price</span>
                                        <span className="text-white font-mono text-lg">{finishingBooking.price || 0} THB</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-2">
                                        <span className="text-yellow-500 font-bold text-sm">Extra Fee</span>
                                        <span className="text-yellow-500 font-mono text-lg">+{finishForm.extraFee || 0} THB</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-red-500 font-bold text-sm">Discount</span>
                                        <span className="text-red-500 font-mono text-lg">-{finishForm.discount || 0} THB</span>
                                    </div>
                                    <div className="pt-4 border-t border-white/10">
                                        <div className="flex justify-between items-center mb-6">
                                            <span className="text-sm font-bold text-gray-400 uppercase tracking-widest">Total</span>
                                            <span className="text-3xl font-black text-white font-mono">
                                                {(
                                                    (finishingBooking.price || 0) +
                                                    Number(finishForm.extraFee) -
                                                    Number(finishForm.discount)
                                                ).toLocaleString()} THB
                                            </span>
                                        </div>
                                        <button
                                            onClick={confirmFinishService}
                                            className="w-full bg-white text-black font-black py-4 rounded-[20px] uppercase text-sm tracking-wider hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                                        >
                                            Confirm Payment & Close Job
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
