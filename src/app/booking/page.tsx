"use client";

import { useState, useEffect } from "react";
import { ChevronRight, Check, Loader2, Upload, Calendar as CalendarIcon, Clock } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, addDoc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { generateBookingId } from "@/utils/bookingUtils";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- Helpers ---
// Use this for ALL date storage and querying
const formatDate = (date: Date): string => {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

// --- Types ---
// --- Types ---
type Branch = {
    id: string;
    name: string;
    locationLink?: string;
    image?: string;
    logoSquareUrl?: string;
    logoHorizontalWhiteUrl?: string; // New: Brand Asset
    address?: string;
};

// ... (Rest of Types omitted for brevity if unchanged, assuming tools handle context) ...



type Service = {
    id: string;
    name: string;
    description: string;
    price: number; // Base Price
    price_promo?: number; // Global Promo (optional)
    duration?: number;
    deposit?: number;
    branchId?: string; // Optional: for filtering
};

type Barber = {
    id: string;
    name: string;
    name_en?: string; // Explicit English Name
    role: string;
    nickname: string;
    branchId?: string; // Optional: for filtering
};

type BarberServiceMapping = {
    barber_id: string;
    service_id: string;
    price_normal: number;
    price_promo?: number | null;
    promotion_active?: boolean;
    commission_fixed?: number;
    enabled: boolean;
};

interface BookingState {
    branch: Branch | null; // NEW: Branch Selection
    service: Service | null;
    barber: Barber | null;
    date: Date | null;
    time: string | null;
    customer: {
        name: string;
        phone: string;
    };
    price?: number; // Actual final price selected
}

type SlotStatus = 'available' | 'full' | 'selected';

// --- Constants ---
const TIME_SLOTS = [
    "10:00", "11:00", "12:00", "13:00",
    "14:00", "15:00", "16:00", "17:00",
    "18:00", "19:00", "20:00", "21:00"
];

// Generate next 14 days
const getNextDays = (days: number) => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        dates.push(d);
    }
    return dates;
};

const AVAILABLE_DATES = getNextDays(14);

// Helper: Format Price
const formatPrice = (price?: number) => {
    if (typeof price !== 'number') return "฿ 0";
    return `฿ ${price.toLocaleString('th-TH')}`;
};
export default function BookingPage() {
    const router = useRouter();
    const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1); // 5 Steps now
    const [isLoading, setIsLoading] = useState(true);

    // Data State
    const [branches, setBranches] = useState<Branch[]>([]); // NEW
    const [services, setServices] = useState<Service[]>([]);
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [barberServices, setBarberServices] = useState<BarberServiceMapping[]>([]); // New State for Mappings
    const [unavailableSlots, setUnavailableSlots] = useState<Set<string>>(new Set());

    // Booking State
    const [booking, setBooking] = useState<BookingState>({
        branch: null, // Init
        service: null,
        barber: null,
        date: null,
        time: null,
        customer: { name: "", phone: "" },
    });

    const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success'>('idle');

    // --- Data Fetching ---
    useEffect(() => {
        // Use onSnapshot for Real-time updates as requested
        const unsubBranches = onSnapshot(collection(db, "branches"), (snap) => {
            setBranches(snap.docs.map(d => ({ id: d.id, ...d.data() } as Branch)));
        });

        const unsubServices = onSnapshot(collection(db, "services"), (snap) => {
            setServices(snap.docs.map(d => ({ id: d.id, ...d.data() } as Service)));
        });

        const unsubBarbers = onSnapshot(collection(db, "barbers"), (snap) => {
            setBarbers(snap.docs.map(d => ({ id: d.id, ...d.data() } as Barber)));
        });

        // Fetch Barber Services Mappings
        const unsubMappings = onSnapshot(collection(db, "barberServices"), (snap) => {
            setBarberServices(snap.docs.map(d => d.data() as BarberServiceMapping));
            setIsLoading(false);
        });

        return () => {
            unsubBranches();
            unsubServices();
            unsubBarbers();
            unsubMappings();
        };
    }, []);

    // --- Helpers for Dynamic Pricing ---
    const getLowestPrice = (serviceId: string, basePrice: number) => {
        // Find all enabled mappings for this service
        const mappings = barberServices.filter(m => m.service_id === serviceId && m.enabled);

        if (mappings.length === 0) return { price: basePrice, isPromo: false, originalPrice: basePrice };

        let minPrice = Infinity;
        let foundPromo = false;

        mappings.forEach(m => {
            // Determine effective price for this barber
            // Priority: Promo (if active) > Normal > Base (fallback not needed if normal set)
            let effectivePrice = m.price_normal;
            if (m.promotion_active && m.price_promo) {
                effectivePrice = m.price_promo;
            }

            if (effectivePrice < minPrice) {
                minPrice = effectivePrice;
            }
        });

        // Ensure we don't return Infinity if something went wrong
        if (minPrice === Infinity) minPrice = basePrice;

        return {
            price: minPrice,
            isPromo: minPrice < basePrice,
            originalPrice: basePrice
        };
    };

    // Correct price calculation when Barber is selected
    const getFinalPrice = () => {
        if (!booking.service) return 0;
        if (!booking.barber) return booking.service.price;

        // Find specific mapping
        const mapping = barberServices.find(m => m.service_id === booking.service!.id && m.barber_id === booking.barber!.id);

        if (mapping && mapping.enabled) {
            if (mapping.promotion_active && mapping.price_promo) {
                return mapping.price_promo;
            }
            return mapping.price_normal;
        }

        return booking.service.price; // Fallback to base
    };

    // --- Availability Logic ---
    useEffect(() => {
        if (!booking.date || !booking.barber || step !== 4) return;

        setIsLoading(true);
        const dateStr = formatDate(booking.date);
        const barberId = booking.barber.id;

        // Listen to Bookings
        const qBookings = query(
            collection(db, "bookings"),
            where("date", "==", dateStr),
            where("barberId", "==", barberId),
            where("status", "in", ["confirmed", "pending", "in_progress", "done"])
        );

        // Listen to Leave Requests
        const qLeaves = query(
            collection(db, "leave_requests"),
            where("date", "==", dateStr),
            where("barberId", "==", barberId),
            where("status", "in", ["approved", "pending"])
        );

        const checkAvailability = async () => {
            const [bookingsSnap, leavesSnap] = await Promise.all([
                getDocs(qBookings),
                getDocs(qLeaves)
            ]);

            const blocked = new Set<string>();

            // Process Bookings
            bookingsSnap.forEach(doc => {
                const data = doc.data();
                const startSlot = data.time;
                const duration = data.duration || 1;
                const bs = TIME_SLOTS.indexOf(startSlot);
                if (bs !== -1) {
                    for (let i = 0; i < duration; i++) {
                        if (bs + i < TIME_SLOTS.length) blocked.add(TIME_SLOTS[bs + i]);
                    }
                }
            });

            // Process Leaves
            leavesSnap.forEach(doc => {
                const data = doc.data();
                if (data.startTime && data.endTime) {
                    const s = TIME_SLOTS.indexOf(data.startTime);
                    const e = TIME_SLOTS.indexOf(data.endTime);
                    if (s !== -1 && e !== -1) {
                        for (let i = s; i < e; i++) blocked.add(TIME_SLOTS[i]); // Assuming end is exclusive or blocks until end time
                    }
                } else if (data.time) {
                    blocked.add(data.time);
                    const duration = data.duration || 1;
                    const s = TIME_SLOTS.indexOf(data.time);
                    if (s !== -1) {
                        for (let i = 0; i < duration; i++) if (s + i < TIME_SLOTS.length) blocked.add(TIME_SLOTS[s + i]);
                    }
                }
            });

            setUnavailableSlots(blocked);
            setIsLoading(false);
        };

        checkAvailability();

    }, [booking.date, booking.barber, step]);


    // --- Handlers ---
    const handleNext = () => {
        if (step < 5) setStep((s) => (s + 1) as any);
    };

    const handleConfirm = async () => {
        if (!booking.service || !booking.barber || !booking.date || !booking.time || !booking.branch) return;

        setSubmitStatus('loading');

        const finalPrice = getFinalPrice();

        try {
            // Generate unique booking ID
            const bookingId = await generateBookingId();

            const bookingData = {
                bookingId,
                bookingType: "online",
                branchId: booking.branch.id, // SAVE BRANCH
                branchName: booking.branch.name,
                serviceId: booking.service.id,
                serviceName: booking.service.name,
                price: finalPrice,
                barberId: booking.barber.id,
                barberName: booking.barber.nickname || booking.barber.name_en || booking.barber.name, // Enforce English
                depositAmount: booking.service.deposit || 0,
                date: formatDate(booking.date),
                time: booking.time,
                customerName: booking.customer.name,
                customerPhone: booking.customer.phone,
                status: 'pending',
                duration: booking.service.duration || 1,
                createdAt: new Date().toISOString(),
                commissionAmount: (() => {
                    const mapping = barberServices.find(m => m.service_id === booking.service!.id && m.barber_id === booking.barber!.id);
                    return mapping && mapping.enabled ? (mapping.commission_fixed || 0) : 0;
                })()
            };

            await addDoc(collection(db, "bookings"), bookingData);

            setSubmitStatus('success');

            setTimeout(() => {
                router.push('/booking/status');
            }, 2000);
        } catch (error) {
            console.error("Error creating booking:", error);
            setSubmitStatus('idle');
            alert("เกิดข้อผิดพลาดในการจอง กรุณาลองใหม่อีกครั้ง");
        }
    };

    // --- Computed ---
    const isStepValid = () => {
        if (step === 1) return !!booking.branch;
        if (step === 2) return !!booking.service;
        if (step === 3) return !!booking.barber;
        if (step === 4) return !!booking.date && !!booking.time;
        if (step === 5) return !!booking.customer.name && !!booking.customer.phone;
        return false;
    };

    const dayOfWeek = (date: Date) => {
        const days = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
        return days[date.getDay()];
    };

    const dayNumber = (date: Date) => {
        return date.getDate();
    };

    const formatSelectedDate = (date: Date | null) => {
        if (!date) return "";
        return `${date.getDate()} ${date.toLocaleDateString('th-TH', { month: 'short' })} ${date.getFullYear() + 543}`;
    };

    // --- UI Components ---

    const Header = () => {
        // Logic: 
        // 1. If branch selected (Step > 1), use its logo
        // 2. If not selected (Step 1), try to find ANY branch with a logo (prefer 'Headquarters' if we had that flag, but for now just first valid)
        // 3. Fallback to Text
        const branchLogo = booking.branch?.logoHorizontalWhiteUrl;
        const defaultLogo = branches.find(b => b.logoHorizontalWhiteUrl)?.logoHorizontalWhiteUrl;
        const displayLogo = branchLogo || defaultLogo;

        return (
            <div className="flex justify-between items-center px-6 py-4 border-b border-gray-50 flex-none bg-white z-20">
                <div className="flex items-center">
                    {displayLogo ? (
                        <div className="h-8 md:h-10 relative aspect-[10/3]">
                            {/* Asset: "Horizontal (White Text)" meant for Dark Backgrounds. 
                                  Header: White BG. 
                                  Action: Invert filter to make it black. 
                              */}
                            <img
                                src={displayLogo}
                                alt="StoryCut"
                                className="h-full w-auto object-contain filter invert"
                            />
                        </div>
                    ) : (
                        <div className="font-bold text-xl uppercase tracking-tighter">StoryCut</div>
                    )}
                </div>
                <Link href="/booking/status">
                    <button className="text-xs font-medium border border-gray-200 rounded-full px-4 py-1.5 hover:bg-gray-50 transition-colors">
                        เช็คสถานะ
                    </button>
                </Link>
            </div>
        );
    };

    const ProgressBar = () => {
        const steps = ["สาขา", "บริการ", "ช่าง", "วันเวลา", "ยืนยัน"];
        return (
            <div className="bg-white pt-2 pb-4 px-6 sticky top-0 z-10 border-b border-gray-50 flex-none">
                <div className="flex justify-between mb-2">
                    {steps.map((label, idx) => {
                        const isActive = idx + 1 <= step;
                        return (
                            <div key={idx} className={cn("text-xs font-medium transition-colors duration-300", isActive ? "text-black" : "text-gray-300")}>
                                {label}
                            </div>
                        )
                    })}
                </div>
                <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-black transition-all duration-500 ease-out"
                        style={{ width: `${(step / 5) * 100}%` }}
                    />
                </div>
            </div>
        );
    };

    // Step 1: Select Branch
    const StepBranch = () => (
        <div className="p-6 space-y-4 animate-in fade-in slide-in-from-right-8 duration-500">
            <h2 className="text-2xl font-bold mb-6">เลือกสาขา</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {branches.map((branch) => (
                    <div
                        key={branch.id}
                        onClick={() => {
                            setBooking(b => ({ ...b, branch }));
                            setTimeout(() => setStep(2), 150);
                        }}
                        className={cn(
                            "group cursor-pointer rounded-[32px] overflow-hidden border transition-all relative active:scale-[0.98]",
                            booking.branch?.id === branch.id
                                ? "border-black ring-1 ring-black/5"
                                : "border-gray-200 hover:border-gray-400 shadow-sm"
                        )}
                    >
                        {/* Image/Bg */}
                        <div className="h-32 bg-gray-100 relative">
                            {branch.logoSquareUrl ? (
                                <img src={branch.logoSquareUrl} alt={branch.name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-[#1A1A1A] text-white/20">
                                    <span className="font-bold text-2xl uppercase italic">No Image</span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />

                            {/* Content Overlay */}
                            <div className="absolute bottom-0 left-0 p-6 text-white w-full">
                                <h3 className="font-bold text-xl leading-none mb-1">{branch.name}</h3>
                                {branch.address && <p className="text-white/60 text-xs font-light truncate">{branch.address}</p>}
                            </div>
                        </div>
                    </div>
                ))}

                {branches.length === 0 && !isLoading && (
                    <div className="text-center text-gray-400 py-10 col-span-full">ไม่พบข้อมูลสาขา</div>
                )}
            </div>
        </div>
    );

    // Step 2: Select Service
    const StepService = () => (
        <div className="p-6 space-y-4 animate-in fade-in slide-in-from-right-8 duration-500">
            <h2 className="text-2xl font-bold mb-6">เลือกบริการ</h2>
            <div className="flex flex-col gap-3">
                {services.filter(s => !s.branchId || !booking.branch || s.branchId === booking.branch.id).map((service) => {
                    const priceInfo = getLowestPrice(service.id, service.price);

                    return (
                        <div
                            key={service.id}
                            onClick={() => {
                                setBooking(b => ({ ...b, service }));
                                setTimeout(() => setStep(3), 150);
                            }}
                            className={cn(
                                "group flex items-center justify-between p-5 rounded-2xl border transition-all cursor-pointer active:scale-[0.98]",
                                booking.service?.id === service.id
                                    ? "border-black bg-gray-50 ring-1 ring-black/5"
                                    : "border-gray-100 bg-white hover:border-gray-300 shadow-sm hover:shadow-md"
                            )}
                        >
                            <div>
                                <div className="font-bold text-lg mb-1 text-gray-900">{service.name}</div>
                                <div className="text-gray-400 text-sm font-medium">{service.description}</div>
                            </div>
                            <div className="flex flex-col items-end gap-0.5">
                                {priceInfo.isPromo && (
                                    <span className="text-xs font-bold text-gray-400 line-through decoration-gray-400/50">
                                        {formatPrice(priceInfo.originalPrice)}
                                    </span>
                                )}
                                <div className="flex items-center gap-2">
                                    <div className="text-right">
                                        {priceInfo.isPromo && <div className="text-[10px] font-black text-green-600 uppercase tracking-widest leading-none mb-0.5">Start From</div>}
                                        <span className={cn(
                                            "font-bold text-lg tracking-tight",
                                            priceInfo.isPromo ? "text-green-600" : "text-gray-900"
                                        )}>
                                            {formatPrice(priceInfo.price)}
                                        </span>
                                    </div>
                                    <ChevronRight className={cn("w-5 h-5 transition-colors", booking.service?.id === service.id ? "text-black" : "text-gray-300")} />
                                </div>
                            </div>
                        </div>
                    );
                })}
                {services.length === 0 && !isLoading && (
                    <div className="text-center text-gray-400 py-10">ไม่พบข้อมูลบริการ</div>
                )}
            </div>
        </div>
    );

    // Step 3: Select Barber
    const StepBarber = () => (
        <div className="p-6 space-y-4 animate-in fade-in slide-in-from-right-8 duration-500">
            <h2 className="text-2xl font-bold mb-6">เลือกช่าง</h2>
            <div className="grid grid-cols-1 gap-3">
                {barbers.filter(b => !b.branchId || !booking.branch || b.branchId === booking.branch.id).map((barber) => {
                    // Check if barber can perform this service
                    // AND display specific price for this barber
                    const mapping = barberServices.find(m => m.barber_id === barber.id && m.service_id === booking.service?.id);
                    // If strict mode: filter out barbers who don't have mapping or mapping disabled
                    if (!mapping || !mapping.enabled) return null;

                    const effectivePrice = (mapping.promotion_active && mapping.price_promo) ? mapping.price_promo : mapping.price_normal;
                    const isPromo = (mapping.promotion_active && !!mapping.price_promo);

                    return (
                        <div
                            key={barber.id}
                            onClick={() => {
                                setBooking(b => ({ ...b, barber }));
                                setTimeout(() => setStep(4), 150);
                            }}
                            className={cn(
                                "flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer active:scale-[0.98]",
                                booking.barber?.id === barber.id
                                    ? "border-black bg-gray-50 ring-1 ring-black/5"
                                    : "border-gray-100 bg-white hover:border-gray-300"
                            )}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center text-xl font-bold text-gray-400 relative overflow-hidden ring-2 ring-white shadow-sm">
                                    {/* Placeholder for image */}
                                    {barber.nickname?.charAt(0) || barber.name.charAt(0)}
                                </div>
                                <div>
                                    <div className="font-bold text-lg mb-0.5 text-gray-900">{barber.nickname || barber.name}</div>
                                    <div className="text-gray-400 text-sm font-medium">{barber.role}</div>
                                </div>
                            </div>
                            <div className="text-right">
                                {isPromo && <div className="text-[10px] font-bold text-green-600 uppercase tracking-widest mb-0.5">Promo</div>}
                                <div className={cn("font-bold", isPromo ? "text-green-600" : "text-gray-900")}>
                                    {formatPrice(effectivePrice)}
                                </div>
                                {booking.barber?.id === barber.id && <Check className="w-5 h-5 text-black ml-auto mt-1" />}
                            </div>
                        </div>
                    );
                })}
                {barbers.length === 0 && !isLoading && (
                    <div className="text-center text-gray-400 py-10">ไม่พบข้อมูลช่าง</div>
                )}
            </div>
        </div>
    );

    // Step 3: Date & Time
    const StepDateTime = () => {
        // Prevent hydration errors with dates
        const [isMounted, setIsMounted] = useState(false);
        useEffect(() => setIsMounted(true), []);

        if (!isMounted) return null;

        return (
            <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                <h2 className="text-2xl font-bold mb-2">เลือกวันและเวลา</h2>

                {/* Date Picker */}
                <div>
                    <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 hide-scrollbar snap-x">
                        {AVAILABLE_DATES.map((date, idx) => {
                            const isSelected = booking.date?.toDateString() === date.toDateString();
                            return (
                                <div
                                    key={idx}
                                    onClick={() => {
                                        setBooking(b => ({ ...b, date, time: null })); // Reset time on date change
                                        setUnavailableSlots(new Set()); // Reset avail until fetched
                                    }}
                                    className={cn(
                                        "flex flex-col items-center justify-center min-w-[70px] h-[90px] rounded-2xl border transition-all cursor-pointer snap-start flex-none",
                                        isSelected
                                            ? "bg-black text-white border-black shadow-lg shadow-black/20"
                                            : "bg-white border-gray-100 text-gray-400 hover:border-gray-300"
                                    )}
                                >
                                    <div className="text-xs font-medium mb-1">{dayOfWeek(date)}</div>
                                    <div className={cn("text-2xl font-bold mb-2", isSelected ? "text-white" : "text-black")}>{dayNumber(date)}</div>

                                    {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Time Picker */}
                {booking.date && (
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="text-sm font-bold text-gray-900">เวลาที่ว่าง</div>
                            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gray-400" />}
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            {TIME_SLOTS.map((time) => {
                                const isSelected = booking.time === time;
                                const isUnavailable = unavailableSlots.has(time);

                                return (
                                    <button
                                        key={time}
                                        disabled={isUnavailable}
                                        onClick={() => setBooking(b => ({ ...b, time }))}
                                        className={cn(
                                            "py-3 rounded-xl text-sm font-semibold border transition-all relative overflow-hidden",
                                            isSelected
                                                ? "bg-black text-white border-black shadow-md z-10"
                                                : "bg-white text-black border-gray-100 hover:border-black",
                                            isUnavailable && "bg-gray-50 text-gray-300 border-gray-100 cursor-not-allowed hover:border-gray-100"
                                        )}
                                    >
                                        {time}
                                        {isUnavailable && (
                                            <span className="absolute inset-0 flex items-center justify-center bg-gray-50/80 text-[10px] font-bold text-red-500 uppercase tracking-wider">
                                                เต็ม (FULL)
                                            </span>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                        {/* Helper text for duration */}
                        <div className="mt-4 text-xs text-gray-400 text-center">
                            * บริการใช้เวลาประมาณ {booking.service?.duration || 1} ชั่วโมง
                        </div>
                    </div>
                )}
            </div>
        );
    };

    // Step 5: Contact & Payment
    const StepSummary = () => {
        const finalPrice = getFinalPrice();
        const [isMounted, setIsMounted] = useState(false);
        useEffect(() => setIsMounted(true), []);

        if (!isMounted) return null; // Avoid date hydration mismatches in summary

        return (
            <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-8 duration-500 pb-24">
                <h2 className="text-2xl font-bold">ข้อมูลติดต่อ & ชำระเงิน</h2>

                {/* Form */}
                <div className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">ชื่อของคุณ</label>
                        <input
                            type="text"
                            value={booking.customer.name}
                            onChange={e => setBooking(b => ({ ...b, customer: { ...b.customer, name: e.target.value } }))}
                            className="w-full p-4 rounded-xl bg-gray-50 border-none font-medium text-black placeholder:text-gray-400 focus:ring-2 focus:ring-black transition-all outline-none"
                            placeholder="กรอกชื่อของคุณ"
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">เบอร์โทรศัพท์</label>
                        <input
                            type="tel"
                            value={booking.customer.phone}
                            onChange={e => setBooking(b => ({ ...b, customer: { ...b.customer, phone: e.target.value } }))}
                            className="w-full p-4 rounded-xl bg-gray-50 border-none font-medium text-black placeholder:text-gray-400 focus:ring-2 focus:ring-black transition-all outline-none"
                            placeholder="08xxxxxxxx"
                        />
                    </div>
                </div>

                {/* Summary Card */}
                <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 space-y-4">
                    <div className="flex justify-between items-start">
                        <div className="text-sm font-bold text-gray-500">สาขา</div>
                        <div className="text-right font-medium">{booking.branch?.name}</div>
                    </div>
                    <div className="flex justify-between items-start">
                        <div className="text-sm font-bold text-gray-500">บริการ</div>
                        <div className="text-right font-medium">{booking.service?.name}</div>
                    </div>
                    <div className="flex justify-between items-start">
                        <div className="text-sm font-bold text-gray-500">ช่าง</div>
                        <div className="text-right font-medium">{booking.barber?.nickname || booking.barber?.name}</div>
                    </div>
                    <div className="flex justify-between items-start">
                        <div className="text-sm font-bold text-gray-500">วันเวลา</div>
                        <div className="text-right font-medium">{formatSelectedDate(booking.date)} - {booking.time} น.</div>
                    </div>
                    <div className="flex justify-between items-start border-t border-gray-200 pt-3 mt-2">
                        <div className="text-sm font-bold text-gray-500">ค่ามัดจำ (Deposit)</div>
                        <div className="text-right font-bold text-green-600">
                            {formatPrice(booking.service?.deposit || 0)}
                        </div>
                    </div>
                    <div className="flex justify-between items-start border-t border-gray-200 pt-3 mt-2">
                        <div className="text-base font-bold text-gray-900">ราคาโดยประมาณ</div>
                        <div className="text-right font-black text-xl">{formatPrice(finalPrice)}</div>
                    </div>
                </div>

                {/* Submit Button */}
                <button
                    onClick={handleConfirm}
                    disabled={!isStepValid() || submitStatus === 'loading'}
                    className={cn(
                        "w-full py-4 rounded-xl font-bold text-lg transition-all shadow-xl",
                        isStepValid()
                            ? "bg-black text-white hover:bg-gray-900 hover:scale-[1.02] active:scale-[0.98]"
                            : "bg-gray-200 text-gray-400 cursor-not-allowed"
                    )}
                >
                    {submitStatus === 'loading' ? (
                        <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            กำลังยืนยัน...
                        </div>
                    ) : "ยืนยันการจอง"}
                </button>
            </div>
        );
    };

    const SuccessModal = () => (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-[320px] rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95 duration-300">
                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600">
                    <Check className="w-10 h-10" strokeWidth={3} />
                </div>
                <h3 className="text-2xl font-bold mb-2">จองสำเร็จ!</h3>
                <p className="text-gray-400 text-sm mb-8">
                    ระบบกำลังพาคุณไปที่หน้าสถานะการจอง...
                </p>
            </div>
        </div>
    );

    // --- Main Render ---
    return (
        <div className="min-h-screen bg-white flex flex-col font-sans">
            <Header />
            <ProgressBar />

            <div className="flex-1 overflow-y-auto bg-white scroll-smooth pb-0">
                {step === 1 && <StepBranch />}
                {step === 2 && <StepService />}
                {step === 3 && <StepBarber />}
                {step === 4 && <StepDateTime />}
                {step === 5 && <StepSummary />}
            </div>

            {/* Footer / Bottom Nav */}
            <div className="p-4 border-t border-gray-50 bg-white flex-none pb-8 md:pb-4 shadow-[0_-5px_20px_rgba(0,0,0,0.02)] z-20">
                {/* Summary text above button if not last step */}
                {step < 5 && step > 1 && (
                    <div className="flex justify-between items-center mb-4 px-2">
                        <div className="text-xs font-semibold text-gray-500">
                            {booking.service?.name} {booking.service?.price && `• ${formatPrice(getFinalPrice() || booking.service.price)}`}
                        </div>
                    </div>
                )}

                <button
                    disabled={!isStepValid() || submitStatus === 'loading'}
                    onClick={step === 5 ? handleConfirm : handleNext}
                    className={cn(
                        "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all",
                        isStepValid() && submitStatus !== 'loading'
                            ? "bg-black text-white hover:bg-gray-900 shadow-lg shadow-black/10 active:scale-[0.99]"
                            : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    )}
                >
                    {submitStatus === 'loading' ? (
                        <>
                            <Loader2 className="w-5 h-5 animate-spin" />
                            กำลังบันทึก...
                        </>
                    ) : (
                        <>
                            {step === 5 ? "ยืนยันการจอง" : "ถัดไป"}
                            {step < 5 && <ChevronRight className="w-4 h-4" />}
                        </>
                    )}
                </button>
            </div>

            {submitStatus === 'success' && <SuccessModal />}

        </div>
    );
}
