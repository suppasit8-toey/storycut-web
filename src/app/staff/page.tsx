"use client";

import { useState, useEffect, useRef, useMemo, useLayoutEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, onSnapshot, doc, updateDoc, addDoc, serverTimestamp, Timestamp, getDoc } from "firebase/firestore";
import { formatDateDDMMYYYY } from "@/utils/dateUtils";
import {
    Scissors,
    LogOut,
    Clock,
    User,
    Calendar as CalendarIcon,
    Coffee,
    Home,
    ChevronRight,
    ChevronLeft,
    CheckCircle2,
    Loader2,
    Delete,
    Bell,
    Search,
    DollarSign,
    Award,
    X,
    Filter,
    AlertCircle,
    CalendarDays,
    History
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- Helpers ---

const isBookingExpired = (bookingTimeStr: string, currentDate: Date): boolean => {
    if (!bookingTimeStr || typeof bookingTimeStr !== 'string') return false;
    const [hours, mins] = bookingTimeStr.split(':').map(Number);
    if (isNaN(hours) || isNaN(mins)) return false;

    const bookingTime = new Date(currentDate);
    bookingTime.setHours(hours, mins, 0, 0);
    const expiryTime = new Date(bookingTime.getTime() + 60 * 60 * 1000);

    return currentDate > expiryTime;
};

// --- Types ---
interface Barber {
    id: string;
    name_th: string;
    nickname: string;
    profile_image: string;
    pin_code: string;
    role: string;
    position?: string;
    weekly_off?: number[]; // Legacy support
    weekly_off_days?: number[]; // 0=Sun, 1=Mon...
}

interface Booking {
    id: string;
    customerName: string;
    customerPhone: string;
    serviceName: string;
    serviceId?: string;
    startTime: string; // "10:00"
    endTime?: string;
    date: string; // "DD/MM/YYYY"
    status: "pending" | "confirmed" | "in_progress" | "done" | "cancelled";
    price: number;
    time: string;
    duration?: number;
    duration_min?: number;
    extra_note?: string;
    stats_actual_start?: Timestamp;
    stats_actual_finish?: Timestamp;
    stats_duration_used_min?: number;

    // Layout props
    widthPct?: number;
    leftPct?: number;
    startMin?: number;
    endMin?: number;
    colIndex?: number;
}

interface LeaveRequest {
    id: string;
    barberId: string;
    type: 'short_break' | 'full_day';
    date: string; // DD/MM/YYYY
    startTime?: string; // e.g. "14:00" for short break
    duration?: number; // hours
    status: 'pending' | 'approved' | 'rejected';
    createdAt: any;
}

type Tab = 'dashboard' | 'calendar' | 'relax' | 'account';
type LeaveType = 'short_break' | 'full_day';

// --- Login Component ---
const LoginScreen = ({ onLogin }: { onLogin: (barber: Barber) => void }) => {
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (pin.length === 4) handleLogin();
    }, [pin]);

    const handleLogin = async () => {
        setLoading(true);
        setError("");
        try {
            const q = query(collection(db, "barbers"), where("pin_code", "==", pin));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const barberDoc = querySnapshot.docs[0];
                const barberData = { id: barberDoc.id, ...barberDoc.data() } as Barber;
                onLogin(barberData);
            } else {
                setError("Incorrect PIN");
                setPin("");
                setLoading(false);
            }
        } catch (e) {
            console.error("Login Error:", e);
            setError("System Error");
            setLoading(false);
        }
    };

    const handleNumberClick = (num: string) => {
        if (pin.length < 4) setPin(prev => prev + num);
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white overflow-hidden relative font-sans selection:bg-white selection:text-black">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-white rounded-full blur-[160px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full border border-white/5 rounded-full scale-[1.5]" />
            </div>

            <div className="w-full max-w-sm relative z-10 flex flex-col items-center">
                <div className="mb-12 text-center group">
                    <div className="w-20 h-20 bg-white text-black rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(255,255,255,0.1)] rotate-3">
                        <Scissors className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-[0.2em] italic mb-2">Staff Access</h1>
                    <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-bold">Authorized Only</p>
                </div>

                <div className="mb-12 flex gap-4">
                    {[0, 1, 2, 3].map((idx) => (
                        <div key={idx} className={cn("w-4 h-4 rounded-full border-2 transition-all duration-300", pin.length > idx ? "bg-white border-white scale-125 shadow-[0_0_15px_rgba(255,255,255,0.5)]" : "border-white/20")} />
                    ))}
                </div>

                <div className="h-6 mb-6">
                    {error && <p className="text-red-400 text-[10px] font-black uppercase tracking-widest animate-bounce">{error}</p>}
                    {loading && <Loader2 className="w-4 h-4 animate-spin text-white/50" />}
                </div>

                <div className="grid grid-cols-3 gap-6 w-full px-4">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                        <button key={num} onClick={() => handleNumberClick(num)} disabled={loading} className="bg-white/5 border border-white/10 w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black hover:bg-white hover:text-black transition-all active:scale-90">
                            {num}
                        </button>
                    ))}
                    <div />
                    <button onClick={() => handleNumberClick("0")} disabled={loading} className="bg-white/5 border border-white/10 w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black hover:bg-white hover:text-black transition-all active:scale-90">0</button>
                    <button onClick={() => setPin(p => p.slice(0, -1))} disabled={loading} className="bg-white/5 border border-white/10 w-20 h-20 rounded-full flex items-center justify-center text-xl font-black hover:bg-red-500 hover:border-red-500 transition-all active:scale-90"><Delete className="w-6 h-6" /></button>
                </div>
            </div>
        </div>
    );
};

// --- Main App ---
export default function StaffPage() {
    const [barber, setBarber] = useState<Barber | null>(null);
    const [activeTab, setActiveTab] = useState<Tab>('dashboard');
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState<Date | null>(null);
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [commissionMap, setCommissionMap] = useState<Record<string, number>>({});
    const [calendarDate, setCalendarDate] = useState<Date>(new Date());
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Relax Modal State
    const [showLeaveModal, setShowLeaveModal] = useState(false);
    const [leaveType, setLeaveType] = useState<LeaveType>('short_break');
    const [leaveDate, setLeaveDate] = useState<Date | null>(null);
    const [leaveDuration, setLeaveDuration] = useState<number>(1);
    const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
    const [availableSlots, setAvailableSlots] = useState<string[]>([]);
    const [filterType, setFilterType] = useState<'all' | 'short_break' | 'full_day'>('all');
    const [isSubmittingLeave, setIsSubmittingLeave] = useState(false);

    // Busy Dates Map: dateStr -> count
    const [busyDates, setBusyDates] = useState<Record<string, number>>({});

    // Account Tab History State
    const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [monthlyBookings, setMonthlyBookings] = useState<Booking[]>([]);
    const [monthlySettlement, setMonthlySettlement] = useState<any>(null);
    const [isFetchingHistory, setIsFetchingHistory] = useState(false);
    const [todayBookings, setTodayBookings] = useState<Booking[]>([]);

    // --- Effects ---

    useLayoutEffect(() => {
        if (activeTab === 'calendar' && scrollContainerRef.current) {
            const now = new Date();
            const hour = now.getHours();
            const targetHour = Math.max(10, hour - 1);
            const offset = (targetHour - 10) * 120; // 120px per hour
            scrollContainerRef.current.scrollTo({ top: offset, behavior: 'smooth' });
        }
    }, [activeTab]);

    useEffect(() => {
        if (activeTab === 'dashboard') {
            setCalendarDate(new Date());
        }
    }, [activeTab]);

    useEffect(() => {
        setCurrentTime(new Date());
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const stored = localStorage.getItem("staff_barber");
        if (stored) setBarber(JSON.parse(stored));
        setLoading(false);
    }, []);

    // Master Data Fetcher
    useEffect(() => {
        if (!barber) return;
        const dateStr = formatDateDDMMYYYY(calendarDate);

        // Fetch bookings for calendar/dashboard
        const qBookings = query(
            collection(db, "bookings"),
            where("barberId", "==", barber.id),
            where("date", "==", dateStr)
        );

        const unsubscribeBookings = onSnapshot(qBookings, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
            data.sort((a, b) => a.time.localeCompare(b.time));
            setBookings(data.filter(b => b.status !== "cancelled"));
        });

        // Fetch Leave Requests History
        const qLeaves = query(
            collection(db, "leave_requests"),
            where("barberId", "==", barber.id)
        );
        const unsubscribeLeaves = onSnapshot(qLeaves, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as LeaveRequest));
            // Sort by created desc
            data.sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
            setLeaveRequests(data);
        });

        // Fetch Commissions
        const fetchCommissions = async () => {
            try {
                const qServices = query(collection(db, "barberServices"), where("barber_id", "==", barber.id));
                const snapshot = await getDocs(qServices);
                const map: Record<string, number> = {};
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.service_id && typeof data.commission_fixed === 'number') {
                        map[data.service_id] = data.commission_fixed;
                    }
                });
                setCommissionMap(map);
            } catch (e) {
                console.error("Error fetching commissions", e);
            }
        };
        fetchCommissions();

        return () => {
            unsubscribeBookings();
            unsubscribeLeaves();
        };
    }, [barber, calendarDate]);

    // Fetch Busy Dates for next 60 days
    useEffect(() => {
        if (!barber || !showLeaveModal) return;
        const fetchAllMyBookings = async () => {
            try {
                const q = query(
                    collection(db, "bookings"),
                    where("barberId", "==", barber.id),
                    where("status", "in", ['confirmed', 'in_progress', 'done'])
                );
                const snap = await getDocs(q);

                const map: Record<string, number> = {};
                snap.forEach(doc => {
                    const d = doc.data().date;
                    if (d) map[d] = (map[d] || 0) + 1;
                });
                setBusyDates(map);
            } catch (e) {
                console.error("Error fetching busy dates", e);
            }
        };
        fetchAllMyBookings();
    }, [showLeaveModal, barber]);

    // Fetch Monthly History & Settlement
    useEffect(() => {
        if (!barber || activeTab !== 'account') return;

        const fetchMonthlyData = async () => {
            setIsFetchingHistory(true);
            try {
                // 1. Fetch historical 'done' bookings for the barber
                const q = query(
                    collection(db, "bookings"),
                    where("barberId", "==", barber.id),
                    where("status", "==", "done")
                );

                const snap = await getDocs(q);
                const results = snap.docs.map(d => ({ id: d.id, ...d.data() } as Booking));

                // Filter by selectedMonth and selectedYear (date: "DD/MM/YYYY")
                const filtered = results.filter(b => {
                    const parts = b.date.split('/');
                    if (parts.length !== 3) return false;
                    const m = parseInt(parts[1]);
                    const y = parseInt(parts[2]);
                    return m === selectedMonth && y === selectedYear;
                });

                // Sort by date desc
                filtered.sort((a, b) => {
                    const [da, ma, ya] = a.date.split('/').map(Number);
                    const [db, mb, yb] = b.date.split('/').map(Number);
                    if (ya !== yb) return yb - ya;
                    if (ma !== mb) return mb - ma;
                    return db - da;
                });

                setMonthlyBookings(filtered);

                // 2. Fetch payroll status
                const settlementId = `${barber.id}_${selectedYear}_${String(selectedMonth).padStart(2, '0')}`;
                const sRef = doc(db, "monthly_settlements", settlementId);
                const sSnap = await getDoc(sRef);
                if (sSnap.exists()) {
                    setMonthlySettlement(sSnap.data());
                } else {
                    setMonthlySettlement({ status: 'pending' }); // Default
                }
            } catch (e) {
                console.error("Error fetching history:", e);
            } finally {
                setIsFetchingHistory(false);
            }
        };

        fetchMonthlyData();
    }, [barber, selectedMonth, selectedYear, activeTab]);

    // Dedicated Today's Bookings Listener for Account Tab Metrics
    useEffect(() => {
        if (!barber) return;
        const todayStr = formatDateDDMMYYYY(new Date());
        const q = query(
            collection(db, "bookings"),
            where("barberId", "==", barber.id),
            where("date", "==", todayStr)
        );
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Booking));
            setTodayBookings(data.filter(b => b.status !== "cancelled"));
        });
        return () => unsubscribe();
    }, [barber]);

    // --- Leave Logic ---

    // Calculate Available Slots for Short Break (FULL HOURS ONLY)
    useEffect(() => {
        if (!showLeaveModal || leaveType !== 'short_break' || !barber || !leaveDate) {
            setAvailableSlots([]);
            return;
        }

        const checkAvailability = async () => {
            const dateStr = formatDateDDMMYYYY(leaveDate);
            const todayStr = formatDateDDMMYYYY(new Date());
            const isToday = dateStr === todayStr;
            const now = new Date();

            // 1. Fetch bookings for that day
            const q = query(collection(db, "bookings"), where("barberId", "==", barber.id), where("date", "==", dateStr), where("status", "in", ['confirmed', 'in_progress', 'done']));
            const snap = await getDocs(q);
            const dayBookings = snap.docs.map(d => d.data() as Booking);

            // 2. Fetch existing approved/pending leaves
            const qL = query(collection(db, "leave_requests"), where("barberId", "==", barber.id), where("date", "==", dateStr), where("status", "in", ['approved', 'pending']));
            const snapL = await getDocs(qL);
            const dayLeaves = snapL.docs.map(d => d.data() as LeaveRequest);

            // 3. Generate slots
            const slots: string[] = [];
            let startH = 10;
            const startM = 0;

            while (true) {
                // End time of this slot
                const endMinTotal = (startH * 60 + startM) + (leaveDuration * 60);
                const endH = Math.floor(endMinTotal / 60);
                const endM = endMinTotal % 60;

                // Stop if end time exceeds 21:00
                if (endH > 21 || (endH === 21 && endM > 0)) break;

                const timeStr = `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`;

                // Rule: 30 min from now
                let isFutureEnough = true;
                if (isToday) {
                    const slotTime = new Date();
                    slotTime.setHours(startH, startM, 0, 0);
                    if (slotTime.getTime() < now.getTime() + 30 * 60000) {
                        isFutureEnough = false;
                    }
                }

                // Check collisions
                let collision = false;
                const slotStartVal = startH * 60 + startM;
                const slotEndVal = endMinTotal;

                if (isFutureEnough) {
                    for (const b of dayBookings) {
                        const [bH, bM] = b.time.split(':').map(Number);
                        const bStart = bH * 60 + bM;
                        const bEnd = bStart + (b.duration_min || (b.duration || 1) * 60);

                        if (slotStartVal < bEnd && slotEndVal > bStart) {
                            collision = true;
                            break;
                        }
                    }
                }

                if (isFutureEnough && !collision) {
                    for (const l of dayLeaves) {
                        if (l.type === 'full_day') {
                            collision = true;
                            break;
                        }
                        if (l.startTime) {
                            const [lH, lM] = l.startTime.split(':').map(Number);
                            const lStart = lH * 60 + lM;
                            const lEnd = lStart + (l.duration || 1) * 60;
                            if (slotStartVal < lEnd && slotEndVal > lStart) {
                                collision = true;
                                break;
                            }
                        }
                    }
                }

                if (isFutureEnough && !collision) {
                    slots.push(timeStr);
                }

                startH++;
            }
            setAvailableSlots(slots);
        };
        checkAvailability();
    }, [showLeaveModal, leaveType, leaveDate, leaveDuration, barber]);

    const handleLogin = (data: Barber) => {
        setBarber(data);
        localStorage.setItem("staff_barber", JSON.stringify(data));
    };

    const handleLogout = () => {
        setBarber(null);
        localStorage.removeItem("staff_barber");
    };

    const submitLeaveRequest = async () => {
        if (!barber || !leaveDate) return;
        setIsSubmittingLeave(true);
        try {
            const reqData: any = {
                barberId: barber.id,
                type: leaveType,
                date: formatDateDDMMYYYY(leaveDate),
                status: 'pending',
                createdAt: serverTimestamp()
            };

            if (leaveType === 'short_break') {
                if (!selectedSlot) {
                    alert("Please select a time slot");
                    setIsSubmittingLeave(false);
                    return;
                }
                reqData.startTime = selectedSlot;
                reqData.duration = leaveDuration;
            } else {
                const dateStr = formatDateDDMMYYYY(leaveDate);
                const bookingsCount = busyDates[dateStr] || 0;
                const weeklyOffDays = barber.weekly_off_days || barber.weekly_off || [];

                if (bookingsCount > 0) {
                    alert("Cannot request leave on a day with existing bookings.");
                    setIsSubmittingLeave(false);
                    return;
                }
                if (weeklyOffDays.includes(leaveDate.getDay())) {
                    alert("This is already your weekly off day.");
                    setIsSubmittingLeave(false);
                    return;
                }
            }

            await addDoc(collection(db, "leave_requests"), reqData);
            setShowLeaveModal(false);
            setLeaveDate(null);
            setSelectedSlot(null);
            alert("Request sent successfully!");
        } catch (e) {
            console.error(e);
            alert("Failed to send request.");
        } finally {
            setIsSubmittingLeave(false);
        }
    };

    const layoutBookings = useMemo(() => {
        if (!bookings.length) return [];
        const events = bookings
            .filter(b => !['cancelled', 'pending'].includes(b.status))
            .map(b => {
                const [h, m] = b.time.split(':').map(Number);
                const startMin = (h - 10) * 60 + m;
                const duration = b.duration_min || (b.duration || 1) * 60;
                return { ...b, startMin, endMin: startMin + duration };
            })
            .sort((a, b) => (a.startMin || 0) - (b.startMin || 0));

        const processedEvents: any[] = [];
        const groups: any[][] = [];
        let currentGroup: any[] = [];
        let groupEnd = -1;

        events.forEach(event => {
            const eStart = event.startMin || 0;
            const eEnd = event.endMin || 0;
            if (currentGroup.length === 0 || eStart < groupEnd) {
                currentGroup.push(event);
                groupEnd = Math.max(groupEnd, eEnd);
            } else {
                groups.push(currentGroup);
                currentGroup = [event];
                groupEnd = eEnd;
            }
        });
        if (currentGroup.length > 0) groups.push(currentGroup);

        groups.forEach(group => {
            const groupColumns: any[][] = [];
            group.forEach(event => {
                let placed = false;
                for (let i = 0; i < groupColumns.length; i++) {
                    const col = groupColumns[i];
                    const lastEvent = col[col.length - 1];
                    if ((event.startMin || 0) >= (lastEvent.endMin || 0)) {
                        col.push(event);
                        event.colIndex = i;
                        placed = true;
                        break;
                    }
                }
                if (!placed) {
                    groupColumns.push([event]);
                    event.colIndex = groupColumns.length - 1;
                }
            });
            const numCols = groupColumns.length;
            group.forEach(event => {
                event.widthPct = 100 / numCols;
                event.leftPct = (event.colIndex || 0) * event.widthPct;
                processedEvents.push(event);
            });
        });
        return processedEvents;
    }, [bookings]);

    const updateStatus = async (id: string, status: string) => {
        try {
            const updateData: any = { status };
            if (status === 'in_progress') {
                updateData.stats_actual_start = serverTimestamp();
            } else if (status === 'done') {
                updateData.stats_actual_finish = serverTimestamp();
                const bookingRef = doc(db, "bookings", id);
                const bookingSnap = await getDoc(bookingRef);
                if (bookingSnap.exists()) {
                    const data = bookingSnap.data();
                    if (data.stats_actual_start) {
                        const start = data.stats_actual_start instanceof Timestamp ? data.stats_actual_start.toDate() : new Date(data.stats_actual_start);
                        const now = new Date();
                        const diffMs = now.getTime() - start.getTime();
                        updateData.stats_duration_used_min = Math.round(diffMs / 60000);
                    }
                }
            }
            await updateDoc(doc(db, "bookings", id), updateData);
        } catch (e) {
            console.error(e);
            alert("Error updating status");
        }
    };

    const calculateCommission = (job: Booking) => {
        if (job.serviceId && commissionMap[job.serviceId] !== undefined && commissionMap[job.serviceId] > 0) {
            return commissionMap[job.serviceId];
        }
        return (job.price || 0) * 0.5;
    };

    const calculateTimeRange = (startTime: string, duration: number = 60, durationMin?: number) => {
        if (!startTime) return "";
        const [startHour, startMin] = startTime.split(':').map(Number);
        if (isNaN(startHour) || isNaN(startMin)) return startTime;
        const effectiveDurationMin = durationMin || (duration * 60);
        const startDate = new Date();
        startDate.setHours(startHour, startMin, 0, 0);
        const endDate = new Date(startDate.getTime() + effectiveDurationMin * 60000);
        return `${startTime} - ${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`;
    };

    const renderDashboard = () => {
        if (!currentTime) return null;
        const activeJobs = bookings.filter(b => b.status === 'in_progress').sort((a, b) => a.time.localeCompare(b.time));
        const nextJobs = bookings.filter(b => {
            if (b.status !== 'confirmed') return false;
            return !isBookingExpired(b.time, currentTime);
        });
        const doneJobs = bookings.filter(b => b.status === 'done');
        const totalEarnings = doneJobs.reduce((sum, b) => sum + calculateCommission(b), 0);

        return (
            <div className="space-y-8 pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="pt-6 flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-black text-white flex items-center justify-center text-xl font-bold border-2 border-white shadow-lg overflow-hidden relative">
                            {barber?.profile_image ? (
                                <img src={barber.profile_image} className="w-full h-full object-cover" alt="Profile" />
                            ) : (
                                <div className="bg-gradient-to-br from-gray-800 to-black w-full h-full flex items-center justify-center">
                                    {barber?.nickname?.charAt(0)}
                                </div>
                            )}
                        </div>
                        <div>
                            <h1 className="text-3xl font-black italic tracking-tighter text-black leading-none mb-1">
                                {barber?.nickname}
                            </h1>
                            <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400">
                                {barber?.position || barber?.role || "Senior Barber"}
                            </p>
                        </div>
                    </div>
                </div>

                <div className="py-2">
                    <div className="text-6xl font-black text-black tracking-tighter tabular-nums leading-none">
                        {currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </div>
                    <div className="text-sm font-bold text-gray-400 uppercase tracking-widest pl-1 mt-1">
                        {currentTime.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
                    </div>
                </div>

                <div>
                    <h3 className="text-xl font-black italic tracking-tighter mb-4 px-2">Active Jobs</h3>
                    {activeJobs.length > 0 ? (
                        <div className="space-y-4">
                            {activeJobs.map(job => (
                                <div key={job.id} onClick={() => setSelectedBooking(job)} className="bg-black text-white rounded-[32px] p-8 relative overflow-hidden shadow-[0_20px_40px_-5px_rgba(0,0,0,0.3)] group cursor-pointer active:scale-[0.98] transition-all">
                                    <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full blur-[80px] group-hover:bg-white/10 transition-colors duration-500" />
                                    <div className="relative z-10">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/5 inline-flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                                <span className="text-[10px] font-black uppercase tracking-widest text-white/80">In Progress</span>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] text-white/40 font-bold uppercase tracking-widest mb-1">Time Slot</div>
                                                <div className="text-xl font-black text-white">{calculateTimeRange(job.time, job.duration, job.duration_min)}</div>
                                            </div>
                                        </div>
                                        <h2 className="text-3xl font-black italic mb-2 tracking-wide truncate">{job.serviceName}</h2>
                                        <div className="flex items-center gap-3 text-white/60 font-medium text-sm mb-6">
                                            <User className="w-4 h-4" />
                                            <span>{job.customerName}</span>
                                        </div>
                                        <div className="w-full bg-white/10 py-3 rounded-2xl font-bold text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 group-hover:bg-white group-hover:text-black transition-all">
                                            Finish Job
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-white rounded-[32px] p-8 border border-gray-100 shadow-sm text-center">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                                <Clock className="w-8 h-8" />
                            </div>
                            <h3 className="font-black text-lg">No Active Jobs</h3>
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Select a job from queue to start</p>
                        </div>
                    )}
                </div>

                <div>
                    <div className="flex justify-between items-end mb-4 px-2">
                        <h3 className="text-xl font-black italic tracking-tighter">Queue</h3>
                        <span className="text-xs font-bold text-gray-400">{nextJobs.length} Remaining</span>
                    </div>
                    <div className="space-y-4">
                        {nextJobs.map(job => (
                            <div key={job.id} className="bg-[#1A1A1A] p-6 rounded-[32px] shadow-lg relative overflow-hidden group active:scale-[0.98] transition-all cursor-pointer" onClick={() => setSelectedBooking(job)}>
                                <div className="flex justify-between items-start mb-4">
                                    <div className="bg-white/5 px-3 py-1.5 rounded-full flex items-center gap-2">
                                        <Clock className="w-3 h-3 text-white/60" />
                                        <span className="text-white text-xs font-bold tracking-wider">{calculateTimeRange(job.time, job.duration, job.duration_min)}</span>
                                    </div>
                                    <div className="text-[10px] font-bold text-white/40 uppercase tracking-wider bg-white/5 px-2 py-1 rounded-md">Queue</div>
                                </div>
                                <h4 className="font-black text-2xl text-white italic tracking-wide mb-1 truncate">{job.serviceName}</h4>
                                <p className="text-white/60 font-medium text-sm mb-0">{job.customerName}</p>
                                <div className="absolute bottom-6 right-6">
                                    <div className="w-10 h-10 rounded-full bg-white text-black flex items-center justify-center transform group-hover:scale-110 transition-transform shadow-[0_0_20px_rgba(255,255,255,0.3)]">
                                        <ChevronRight className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex flex-col justify-between h-32">
                        <div className="w-8 h-8 rounded-full bg-black text-white flex items-center justify-center">
                            <DollarSign className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Today's Earn</div>
                            <div className="text-2xl font-black text-black tracking-tight">฿{totalEarnings.toLocaleString()}</div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-[24px] shadow-sm border border-gray-100 flex flex-col justify-between h-32">
                        <div className="w-8 h-8 rounded-full bg-gray-100 text-black flex items-center justify-center">
                            <Award className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Completed</div>
                            <div className="text-2xl font-black text-black tracking-tight">{doneJobs.length} Jobs</div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderCalendar = () => {
        const hours = Array.from({ length: 12 }, (_, i) => i + 10);
        const rowHeight = 120;
        const handlePrevDay = () => { const d = new Date(calendarDate); d.setDate(d.getDate() - 1); setCalendarDate(d); };
        const handleNextDay = () => { const d = new Date(calendarDate); d.setDate(d.getDate() + 1); setCalendarDate(d); };
        const now = currentTime || new Date();
        const isToday = formatDateDDMMYYYY(now) === formatDateDDMMYYYY(calendarDate);
        let currentTimeTop = -1;
        if (isToday) {
            const currentH = now.getHours();
            const currentM = now.getMinutes();
            if (currentH >= 10 && currentH <= 21) {
                currentTimeTop = (currentH - 10) * rowHeight + (currentM * (rowHeight / 60));
            }
        }
        return (
            <div className="pb-32 h-full flex flex-col animate-in fade-in duration-500">
                <div className="flex justify-between items-center px-4 py-6 shrink-0">
                    <h2 className="text-3xl font-black italic tracking-tighter">Schedule</h2>
                    <div className="flex items-center gap-2 bg-white rounded-full p-1.5 shadow-sm border border-gray-100">
                        <button onClick={handlePrevDay} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"><ChevronLeft className="w-4 h-4 text-black" /></button>
                        <div className="text-xs font-bold bg-black text-white px-4 py-2 rounded-full shadow-lg min-w-[110px] text-center">{calendarDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                        <button onClick={handleNextDay} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"><ChevronRight className="w-4 h-4 text-black" /></button>
                    </div>
                </div>
                <div className="flex-1 rounded-t-[40px] bg-white border-t border-gray-200 overflow-hidden relative flex flex-col shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
                    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto custom-scrollbar relative">
                        <div className="flex" style={{ height: `${hours.length * rowHeight}px` }}>
                            <div className="w-16 flex-shrink-0 bg-white z-20 sticky left-0 border-r border-gray-50">
                                {hours.map(h => (
                                    <div key={h} className="relative" style={{ height: `${rowHeight}px` }}>
                                        <div className="absolute -top-3 right-3 text-xs font-bold text-gray-400">{h}:00</div>
                                    </div>
                                ))}
                            </div>
                            <div className="flex-1 relative min-w-0">
                                {hours.map(h => (
                                    <div key={`line-${h}`} className="border-t border-gray-100 w-full absolute left-0" style={{ top: `${(h - 10) * rowHeight}px` }} />
                                ))}
                                {currentTimeTop >= 0 && (
                                    <div className="absolute w-full z-30 pointer-events-none flex items-center" style={{ top: `${currentTimeTop}px` }}>
                                        <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 shadow-sm ring-2 ring-white" />
                                        <div className="h-[2px] bg-red-500 w-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                                    </div>
                                )}
                                {layoutBookings.map(b => (
                                    <div key={b.id} onClick={() => setSelectedBooking(b)} className="absolute p-1 transition-all z-10 hover:z-20 group"
                                        style={{ top: `${((b.startMin || 0) / 60) * rowHeight}px`, height: `${((b.duration_min || 60) / 60) * rowHeight}px`, width: `${b.widthPct}%`, left: `${b.leftPct}%` }}>
                                        <div className={cn("w-full h-full rounded-lg border-l-4 shadow-sm p-2 flex flex-col justify-start overflow-hidden active:scale-[0.98] transition-transform cursor-pointer",
                                            b.status === 'confirmed' ? "bg-blue-50 border-blue-500 text-blue-900" :
                                                b.status === 'in_progress' ? "bg-amber-50 border-amber-500 text-amber-900" :
                                                    b.status === 'done' ? "bg-green-50 border-green-500 text-green-900" : "bg-gray-100 border-gray-400 text-gray-700")}>
                                            <div className="flex justify-between items-start gap-1 mb-0.5">
                                                <span className="font-bold text-[10px] leading-tight truncate">{b.serviceName}</span>
                                                {b.status === 'in_progress' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse shrink-0 mt-0.5" />}
                                            </div>
                                            <div className="text-[9px] opacity-80 font-medium truncate mb-auto">{b.customerName}</div>
                                            <div className="text-[8px] font-black opacity-60 uppercase tracking-widest mt-1">{b.time} - {calculateTimeRange(b.time, 0, b.duration_min).split('-')[1]?.trim()}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderRelax = () => {
        const filteredLeaves = leaveRequests.filter(l => filterType === 'all' || l.type === filterType);

        return (
            <div className="pb-32 flex flex-col h-full animate-in fade-in duration-500 pt-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h2 className="text-3xl font-black italic tracking-tighter">Relax & Leave</h2>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-wider">Manage your time off</p>
                    </div>
                    <button onClick={() => setShowLeaveModal(true)} className="bg-black text-white px-5 py-3 rounded-full font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-transform flex items-center gap-2">
                        <Coffee className="w-4 h-4" /> Request
                    </button>
                </div>

                <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
                    {['all', 'short_break', 'full_day'].map((type) => (
                        <button key={type} onClick={() => setFilterType(type as any)}
                            className={cn("px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border transition-colors whitespace-nowrap",
                                filterType === type ? "bg-black text-white border-black" : "bg-white text-gray-400 border-gray-200 hover:border-black")}>
                            {type.replace('_', ' ')}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                    {filteredLeaves.length > 0 ? filteredLeaves.map(leave => (
                        <div key={leave.id} className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-100 flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className={cn("w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                                    leave.type === 'short_break' ? "bg-amber-50 text-amber-600" : "bg-purple-50 text-purple-600")}>
                                    {leave.type === 'short_break' ? <Coffee className="w-5 h-5" /> : <CalendarDays className="w-5 h-5" />}
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{leave.date}</div>
                                    <h4 className="font-bold text-sm">
                                        {leave.type === 'short_break' ? `Break: ${leave.startTime} (${leave.duration}h)` : "Full Day Leave"}
                                    </h4>
                                </div>
                            </div>
                            <div className={cn("px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                                leave.status === 'approved' ? "bg-green-50 text-green-700 border-green-200" :
                                    leave.status === 'rejected' ? "bg-red-50 text-red-700 border-red-200" :
                                        "bg-gray-50 text-gray-500 border-gray-200")}>
                                {leave.status}
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-10 text-gray-300">
                            <History className="w-8 h-8 mx-auto mb-2 opacity-30" />
                            <p className="text-xs font-bold uppercase tracking-widest">No history found</p>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderAccount = () => {
        const now = currentTime || new Date();
        const dateNowStr = formatDateDDMMYYYY(now);

        // Today's Stats
        const doneToday = todayBookings.filter(b => b.status === 'done');
        const doneCount = doneToday.length;
        const actualEarn = doneToday.reduce((sum, b) => sum + calculateCommission(b), 0);

        // Projected: 'confirmed' bookings for remainder of today
        // Remainder of today: starting at current hour or later
        const currentHour = now.getHours();
        const currentMin = now.getMinutes();
        const currentTimeVal = currentHour * 60 + currentMin;

        const projectedJobs = todayBookings.filter(b => {
            if (b.status !== 'confirmed') return false;
            const [bh, bm] = b.time.split(':').map(Number);
            return (bh * 60 + bm) >= currentTimeVal;
        });
        const projectedEarn = projectedJobs.reduce((sum, b) => sum + calculateCommission(b), 0);

        // Monthly Stats
        const totalMonthlyEarn = monthlyBookings.reduce((sum, b) => sum + calculateCommission(b), 0);
        const payrollStatus = monthlySettlement?.status || 'pending';

        const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);

        return (
            <div className="space-y-6 pb-24 pt-6 animate-in fade-in duration-500 overflow-y-auto px-1">
                {/* Header Section */}
                <div className="bg-black text-white p-8 rounded-[40px] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/5 rounded-full blur-[80px] -mr-20 -mt-20" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-full overflow-hidden border-2 border-white/20">
                                {barber?.profile_image ? (
                                    <img src={barber.profile_image} className="w-full h-full object-cover" alt="Profile" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xl font-black">{barber?.nickname?.charAt(0)}</div>
                                )}
                            </div>
                            <div>
                                <h2 className="text-2xl font-black italic tracking-tighter">{barber?.nickname}</h2>
                                <p className="text-white/40 text-[10px] font-bold tracking-[0.2em] uppercase">{barber?.position || "Senior Barber"}</p>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 mb-1">Live Performance</div>
                            <div className="text-4xl font-black tabular-nums tracking-tighter">
                                {now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </div>
                            <div className="text-xs font-bold text-white/60 tracking-widest uppercase">
                                {now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 1: Today's Real-time Performance */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex flex-col justify-between h-36">
                        <div className="w-10 h-10 rounded-2xl bg-black text-white flex items-center justify-center shadow-lg">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Completed</div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-2xl font-black text-black">฿{actualEarn.toLocaleString()}</span>
                                <span className="text-[10px] font-bold text-gray-400">({doneCount} Jobs)</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-gray-100 flex flex-col justify-between h-36">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-100">
                            <Clock className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">Projected Today</div>
                            <div className="text-2xl font-black text-blue-600 tracking-tight">฿{projectedEarn.toLocaleString()}</div>
                        </div>
                    </div>
                </div>

                {/* Section 2: Monthly Summary & Payroll Status */}
                <div className="space-y-4">
                    <div className="flex justify-between items-center px-2">
                        <h3 className="text-xl font-black italic tracking-tighter">Monthly Summary</h3>
                        <div className="flex gap-2">
                            <select value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                                className="bg-white border-transparent text-[10px] font-black uppercase tracking-widest rounded-lg px-2 py-1 shadow-sm outline-none focus:ring-1 focus:ring-black cursor-pointer">
                                {months.map((m, i) => <option key={m} value={i + 1}>{m.slice(0, 3)}</option>)}
                            </select>
                            <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                                className="bg-white border-transparent text-[10px] font-black uppercase tracking-widest rounded-lg px-2 py-1 shadow-sm outline-none focus:ring-1 focus:ring-black cursor-pointer">
                                {years.map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[40px] shadow-sm border border-gray-100 space-y-6">
                        <div className="grid grid-cols-2 gap-8 divide-x divide-gray-100">
                            <div>
                                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Total Earnings</div>
                                <div className="text-3xl font-black text-black tracking-tighter">฿{totalMonthlyEarn.toLocaleString()}</div>
                            </div>
                            <div className="pl-8">
                                <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 mb-2">Total Jobs</div>
                                <div className="text-3xl font-black text-black tracking-tighter">{monthlyBookings.length}</div>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-50 flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Payroll Status</span>
                            <div className={cn("px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2",
                                payrollStatus === 'paid' ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200")}>
                                {payrollStatus === 'paid' ? <CheckCircle2 className="w-3" /> : <Clock className="w-3" />}
                                {payrollStatus === 'paid' ? 'Paid (จ่ายแล้ว)' : 'Pending (รอสรุป)'}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section 3: Job List (History) */}
                <div className="space-y-3">
                    <h3 className="text-lg font-black italic tracking-tighter px-2">Job History</h3>
                    <div className="space-y-3">
                        {isFetchingHistory ? (
                            <div className="flex items-center justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
                        ) : monthlyBookings.length > 0 ? monthlyBookings.map(job => (
                            <div key={job.id} className="bg-white p-5 rounded-[24px] shadow-sm border border-gray-100 flex justify-between items-center group hover:border-black transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-2xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-black group-hover:text-white transition-colors">
                                        <History className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-0.5">{job.date} | {job.time}</div>
                                        <h4 className="font-bold text-sm truncate max-w-[150px]">{job.serviceName}</h4>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-black text-black">฿{calculateCommission(job).toLocaleString()}</div>
                                    <div className="text-[8px] font-bold text-gray-400 uppercase tracking-widest">Share</div>
                                </div>
                            </div>
                        )) : (
                            <div className="text-center py-12 text-gray-300">
                                <Search className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                <p className="text-[10px] font-black uppercase tracking-widest">No history found</p>
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-4">
                    <button onClick={handleLogout} className="w-full bg-white text-red-500 py-5 rounded-[24px] font-black uppercase tracking-widest border border-red-50 flex items-center justify-center gap-2 hover:bg-red-50 active:scale-95 transition-all">
                        <LogOut className="w-4 h-4" /> Logout
                    </button>
                </div>
            </div>
        );
    };

    const BookingModal = () => {
        if (!selectedBooking) return null;
        return (
            <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                <div className="bg-white w-full sm:max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom-full duration-300" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Booking Detail</div>
                            <h3 className="text-2xl font-black italic tracking-tighter">{selectedBooking.date} | {selectedBooking.time}</h3>
                        </div>
                        <button onClick={() => setSelectedBooking(null)} className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all"><X className="w-6 h-6" /></button>
                    </div>
                    <div className="space-y-4 mb-8">
                        <div className="bg-[#F8F9FA] p-6 rounded-[24px]">
                            <span className="block font-bold text-gray-400 text-[10px] uppercase mb-1 tracking-wider">Service</span>
                            <span className="block font-black text-black text-lg">{selectedBooking.serviceName}</span>
                            <span className="block font-medium text-gray-500 text-sm mt-1">{selectedBooking.customerName}</span>
                        </div>
                        <div className="flex gap-4">
                            <div className="bg-[#F8F9FA] p-6 rounded-[24px] flex-1">
                                <span className="block font-bold text-gray-400 text-[10px] uppercase mb-1 tracking-wider">Time</span>
                                <span className="font-black text-black text-xl tracking-tighter">{calculateTimeRange(selectedBooking.time, selectedBooking.duration, selectedBooking.duration_min)}</span>
                            </div>
                            <div className="bg-[#F8F9FA] p-6 rounded-[24px] flex-1">
                                <span className="block font-bold text-gray-400 text-[10px] uppercase mb-1 tracking-wider">Price</span>
                                <span className="font-black text-black text-xl tracking-tighter">฿{selectedBooking.price}</span>
                            </div>
                        </div>
                        <div className="bg-green-50 p-6 rounded-[24px] flex justify-between items-center border border-green-100">
                            <span className="font-bold text-green-700 text-xs uppercase tracking-wider">Your Commission</span>
                            <span className="font-black text-green-700 text-xl text-right">฿{calculateCommission(selectedBooking)}</span>
                        </div>
                    </div>
                    {selectedBooking.status === 'confirmed' && (
                        <button onClick={() => { updateStatus(selectedBooking.id, 'in_progress'); setSelectedBooking(null); }} className="w-full bg-black text-white py-5 rounded-[24px] font-black uppercase tracking-widest hover:bg-gray-900 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2 group"><Scissors className="w-5 h-5 group-hover:rotate-12 transition-transform" /> Start Job</button>
                    )}
                    {selectedBooking.status === 'in_progress' && (
                        <button onClick={() => { updateStatus(selectedBooking.id, 'done'); setSelectedBooking(null); }} className="w-full bg-green-500 text-white py-5 rounded-[24px] font-black uppercase tracking-widest hover:bg-green-600 active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"><CheckCircle2 className="w-5 h-5" /> Finish Job</button>
                    )}
                </div>
            </div>
        )
    };

    const LeaveModal = () => {
        if (!showLeaveModal) return null;

        // Calculated details for current leaveDate if selected
        let isDayDisabled = false;
        let busyCount = 0;
        let isWeeklyOff = false;

        if (leaveDate) {
            const dateStr = formatDateDDMMYYYY(leaveDate);
            busyCount = busyDates[dateStr] || 0;
            const weeklyOffDays = barber?.weekly_off_days || barber?.weekly_off || [];
            isWeeklyOff = weeklyOffDays.includes(leaveDate.getDay());
            isDayDisabled = busyCount > 0 || isWeeklyOff;
        }

        return (
            <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
                <div className="bg-white w-full sm:max-w-md rounded-t-[40px] sm:rounded-[40px] p-8 shadow-2xl animate-in slide-in-from-bottom-full duration-300 h-[80vh] sm:h-auto flex flex-col">
                    <div className="flex justify-between items-start mb-6 shrink-0">
                        <h3 className="text-2xl font-black italic tracking-tighter">Request Leave</h3>
                        <button onClick={() => setShowLeaveModal(false)} className="w-10 h-10 bg-gray-50 rounded-full flex items-center justify-center hover:bg-black hover:text-white transition-all"><X className="w-5 h-5" /></button>
                    </div>

                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {/* Type Selector */}
                        <div className="flex gap-2 p-1 bg-gray-100 rounded-2xl mb-6">
                            {(['short_break', 'full_day'] as LeaveType[]).map(type => (
                                <button key={type} onClick={() => { setLeaveType(type); setLeaveDate(null); setSelectedSlot(null); }}
                                    className={cn("flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
                                        leaveType === type ? "bg-white shadow-sm text-black" : "text-gray-400 hover:text-gray-600")}>
                                    {type.replace('_', ' ')}
                                </button>
                            ))}
                        </div>

                        {/* Date Selector (Vertical Grid - FREE SCROLL) */}
                        <div className="mb-6">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Select Date</label>
                            <div className="flex flex-col gap-2 h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {(leaveType === 'short_break' ? [0, 1, 2] : Array.from({ length: 60 }, (_, i) => i)).map(idx => {
                                    const d = new Date();
                                    d.setDate(d.getDate() + idx);

                                    // Visual state logic
                                    const dStr = formatDateDDMMYYYY(d);
                                    const isSelected = leaveDate && dStr === formatDateDDMMYYYY(leaveDate);

                                    // We show "Weekly Off" / "Booked" tags in list but DO NOT disable selection completely,
                                    // so user can click and see status detail (or we can block). 
                                    // User requirement: "If the date is a regular off day, show Weekly Off: Yes and disable submission"
                                    // But typically blocking selection is better UX. 
                                    // However, user said "Only display the 'Availability Status' box AFTER the user explicitly clicks/selects a date."
                                    // This implies we allow selection so they can see the status box explaining WHY it's unavailable.

                                    // Let's allow selection, then show error in status box.
                                    // We will calculate tags for styling only.
                                    const weeklyOffDays = barber?.weekly_off_days || barber?.weekly_off || [];
                                    const dayIsOff = weeklyOffDays.includes(d.getDay());
                                    const dayIsBusy = (busyDates[dStr] || 0) > 0;
                                    const visualDisability = leaveType === 'full_day' && (dayIsOff || dayIsBusy);

                                    return (
                                        <button key={idx} onClick={() => setLeaveDate(d)}
                                            className={cn("w-full p-4 rounded-2xl flex items-center justify-between border transition-all text-left shrink-0",
                                                isSelected ? "bg-black text-white border-black" :
                                                    visualDisability ? "bg-gray-50 text-gray-500 border-gray-100" :
                                                        "bg-white text-black border-gray-100 hover:border-black")}>
                                            <div className="flex items-center gap-4">
                                                <div className={cn("text-2xl font-black", isSelected ? "text-white" : "text-black")}>
                                                    {d.getDate()}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={cn("text-xs font-bold uppercase tracking-wider", isSelected ? "text-white/60" : "text-gray-400")}>
                                                        {d.toLocaleString('default', { month: 'short' })}
                                                    </span>
                                                    <span className={cn("text-xs font-bold uppercase", isSelected ? "text-white" : "text-black")}>
                                                        {d.toLocaleDateString('default', { weekday: 'long' })}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Status Tags in List */}
                                            {visualDisability && dayIsOff && (
                                                <div className="text-[10px] font-black uppercase tracking-widest bg-gray-200 text-gray-500 px-2 py-1 rounded">Weekly Off</div>
                                            )}
                                            {visualDisability && dayIsBusy && !dayIsOff && (
                                                <div className="text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-500 px-2 py-1 rounded">Booked</div>
                                            )}
                                            {isSelected && <CheckCircle2 className="w-5 h-5" />}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        {/* Short Break Extras: Show only if date selected */}
                        {leaveType === 'short_break' && leaveDate && (
                            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                <div className="mb-6">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Duration</label>
                                    <div className="flex gap-2">
                                        {[1, 2, 3].map(dur => (
                                            <button key={dur} onClick={() => setLeaveDuration(dur)}
                                                className={cn("flex-1 py-3 rounded-2xl border font-bold transition-all",
                                                    leaveDuration === dur ? "bg-black text-white border-black shadow-md" : "bg-white border-gray-200 text-gray-400")}>
                                                {dur} hr
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="mb-6">
                                    <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Available Slots (Full Hour)</label>
                                    {availableSlots.length > 0 ? (
                                        <div className="grid grid-cols-3 gap-2">
                                            {availableSlots.map(slot => (
                                                <button key={slot} onClick={() => setSelectedSlot(slot)}
                                                    className={cn("py-2 px-3 rounded-xl border text-sm font-bold transition-all",
                                                        selectedSlot === slot ? "bg-black text-white border-black" : "bg-white border-gray-200 hover:border-black")}>
                                                    {slot}
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-4 bg-gray-50 rounded-2xl border border-dashed text-gray-400 text-xs font-bold">No slots available</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Full Day Status Box: Show only if date selected */}
                        {leaveType === 'full_day' && leaveDate && (
                            <div className={cn("p-6 rounded-3xl border mb-6 transition-colors animate-in fade-in slide-in-from-bottom-2 duration-300",
                                isDayDisabled ? "bg-red-50 border-red-100" : "bg-blue-50 border-blue-100")}>
                                <h4 className={cn("font-black mb-2", isDayDisabled ? "text-red-900" : "text-blue-900")}>Availability Status</h4>
                                <div className={cn("space-y-2 text-sm", isDayDisabled ? "text-red-700" : "text-blue-700")}>
                                    <div className="flex justify-between">
                                        <span>Bookings:</span>
                                        <span className="font-bold">{busyCount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Weekly Off:</span>
                                        <span className="font-bold">{isWeeklyOff ? "Yes" : "No"}</span>
                                    </div>
                                </div>
                                {isDayDisabled ? (
                                    <div className="mt-4 text-red-600 text-xs font-bold flex items-center gap-1"><AlertCircle className="w-4 h-4" /> Unavailable</div>
                                ) : (
                                    <div className="mt-4 text-center text-blue-600 text-xs font-bold flex items-center justify-center gap-1"><CheckCircle2 className="w-4 h-4" /> Available for Leave</div>
                                )}
                            </div>
                        )}
                    </div>

                    <button disabled={isSubmittingLeave || !leaveDate || !!isDayDisabled} onClick={submitLeaveRequest} className="w-full bg-black text-white py-4 rounded-3xl font-black uppercase tracking-widest shadow-xl disabled:opacity-50 active:scale-95 transition-all mt-4">
                        {isSubmittingLeave ? "Sending..." : "Submit Request"}
                    </button>
                </div>
            </div>
        )
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-white"><Loader2 className="animate-spin text-black w-8 h-8" /></div>;
    if (!barber) return <LoginScreen onLogin={handleLogin} />;

    return (
        <div className="min-h-screen bg-[#F2F2F2] text-black font-sans selection:bg-black selection:text-white">
            <main className="px-6 min-h-screen pb-24">
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'calendar' && renderCalendar()}
                {activeTab === 'relax' && renderRelax()}
                {activeTab === 'account' && renderAccount()}
            </main>
            <nav className="fixed bottom-6 left-6 right-6 bg-black text-white rounded-[32px] p-2 shadow-[0_20px_40px_rgba(0,0,0,0.5)] z-40 flex justify-around items-center h-[80px]">
                {[
                    { id: 'dashboard', icon: Home, label: 'Home' },
                    { id: 'calendar', icon: CalendarIcon, label: 'Plan' },
                    { id: 'relax', icon: Coffee, label: 'Relax' },
                    { id: 'account', icon: User, label: 'Account' }
                ].map((item) => {
                    const isActive = activeTab === item.id;
                    const Icon = item.icon;
                    return (
                        <button key={item.id} onClick={() => setActiveTab(item.id as Tab)}
                            className={cn("flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-300 relative", isActive ? "bg-white text-black -translate-y-5 shadow-[0_10px_20px_rgba(0,0,0,0.2)]" : "text-white/40 hover:text-white")}>
                            <Icon className={cn("w-6 h-6", isActive && "fill-current")} strokeWidth={isActive ? 2.5 : 2} />
                        </button>
                    )
                })}
            </nav>
            <BookingModal />
            <LeaveModal />
        </div>
    );
}
