"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getBarberById, getBarbers, getServices, addBooking } from '@/lib/db';
import {
    ChevronRight,
    Check,
    Calendar,
    Clock,
    CreditCard,
    Upload,
    MapPin,
    Loader2
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- Types ---
interface Barber {
    id: string;
    name: string;
    role?: string;
    image?: string;
    initial?: string;
}

interface Service {
    id: string;
    title: string;
    duration: number;
    price: number;
    description?: string;
}

// --- Mock Utils / Data Helpers ---
const TIME_SLOTS = [
    "10:00", "11:00", "12:00", "13:00",
    "14:00", "15:00", "16:00", "17:00", "18:00"
];

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

const formatPrice = (price: number) => `฿ ${price.toLocaleString()}`;

// --- Main Component ---
export default function BookingPage() {
    const params = useParams();
    const router = useRouter();
    const initialBarberId = params.id as string;

    // --- State ---
    const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);
    const [loading, setLoading] = useState(true);

    const [allBarbers, setAllBarbers] = useState<Barber[]>([]);
    const [allServices, setAllServices] = useState<Service[]>([]);

    // Booking Data
    // Note: We'll store full objects for UI convenience, but IDs for DB.
    const [selectedService, setSelectedService] = useState<Service | null>(null);
    const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | null>(null);
    const [selectedTime, setSelectedTime] = useState<string | null>(null);

    // Form Data
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [slipFile, setSlipFile] = useState<File | null>(null);
    const [submissionStatus, setSubmissionStatus] = useState<'idle' | 'uploading' | 'saving' | 'error'>('idle');

    // --- Fetch Data ---
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [barbersData, servicesData] = await Promise.all([
                    getBarbers(),
                    getServices()
                ]);

                const servicesList = servicesData as Service[];
                const barbersList = barbersData as Barber[];

                setAllServices(servicesList);
                setAllBarbers(barbersList);

                // Pre-select barber if ID matches
                if (initialBarberId) {
                    const preSelected = barbersList.find(b => b.id === initialBarberId);
                    if (preSelected) {
                        setSelectedBarber(preSelected);
                    }
                }
            } catch (error) {
                console.error("Error fetching data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [initialBarberId]);

    // --- Handlers ---
    const handleNext = () => {
        if (step < 4) setStep(s => (s + 1) as any);
    };

    const handleBack = () => {
        if (step > 1) setStep(s => (s - 1) as any);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSlipFile(e.target.files[0]);
        }
    };

    const handleConfirmBooking = async () => {
        if (!selectedService || !selectedBarber || !selectedDate || !selectedTime || !name || !phone) {
            alert("Please complete all fields.");
            return;
        }

        setSubmissionStatus('uploading');

        try {
            let slipUrl = null;
            if (slipFile) {
                const formData = new FormData();
                formData.append('file', slipFile);
                formData.append('upload_preset', 'storycut_uploads');

                // Existing Cloudinary Logic
                const response = await fetch(
                    `https://api.cloudinary.com/v1_1/dcspjhgdj/image/upload`,
                    {
                        method: 'POST',
                        body: formData,
                    }
                );

                if (!response.ok) {
                    throw new Error('Image upload failed');
                }

                const data = await response.json();
                slipUrl = data.secure_url;
            }

            setSubmissionStatus('saving');

            // Existing Firestore Logic
            // Note: DB expects dateTime string. We combine Date + Time.
            // Simplified for now: just storing string representation or ISO
            const dateTimeString = `${selectedDate.toLocaleDateString()} ${selectedTime}`;

            await addBooking({
                barberId: selectedBarber.id,
                barberName: selectedBarber.name,
                serviceId: selectedService.id,
                serviceName: selectedService.title, // Added for convenience if schema supports
                dateTime: dateTimeString,
                customerName: name,
                phone,
                slipUrl,
                price: selectedService.price
            });

            setStep(5); // Success Step
            // Optional: Redirect after delay
            setTimeout(() => {
                router.push('/booking/status'); // Or /success if that's preferred
            }, 3000);

        } catch (error) {
            console.error("Booking failed:", error);
            setSubmissionStatus('error');
        }
    };

    // --- Helpers ---
    const isStepValid = () => {
        if (step === 1) return !!selectedService;
        if (step === 2) return !!selectedBarber;
        if (step === 3) return !!selectedDate && !!selectedTime;
        if (step === 4) return !!name && !!phone;
        return true;
    };

    // --- Render Components ---

    const ProgressBar = () => {
        const steps = ["บริการ", "ช่าง", "วันเวลา", "ยืนยัน"];
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
                        style={{ width: `${(Math.min(step, 4) / 4) * 100}%` }}
                    />
                </div>
            </div>
        );
    };

    if (loading) {
        return <div className="min-h-screen bg-[#121212] flex items-center justify-center text-white">Loading...</div>;
    }

    return (
        <div className="min-h-screen bg-[#121212] flex items-center justify-center md:py-8 font-sans">
            <div className="w-full max-w-[400px] bg-white min-h-[100dvh] md:min-h-[800px] md:h-auto md:max-h-[850px] md:rounded-[32px] shadow-2xl overflow-hidden relative flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-50 flex-none bg-white z-20">
                    <div className="font-bold text-xl uppercase tracking-tighter text-black">StoryCut</div>
                </div>

                {/* Progress */}
                <ProgressBar />

                {/* Scrollable Content Area */}
                <div className="flex-1 overflow-y-auto bg-white pb-24">

                    {/* Step 1: Service */}
                    {step === 1 && (
                        <div className="p-6 space-y-4 animate-in fade-in slide-in-from-right-8 duration-300">
                            <h2 className="text-2xl font-bold mb-6 text-black">เลือกบริการ</h2>
                            <div className="space-y-3">
                                {allServices.map(service => (
                                    <div
                                        key={service.id}
                                        onClick={() => {
                                            setSelectedService(service);
                                            setTimeout(() => setStep(2), 200);
                                        }}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all active:scale-95",
                                            selectedService?.id === service.id
                                                ? "border-black bg-gray-50 ring-1 ring-black"
                                                : "border-gray-100 hover:border-gray-300"
                                        )}
                                    >
                                        <div>
                                            <div className="font-bold text-lg text-black">{service.title}</div>
                                            <div className="text-gray-400 text-sm">{service.duration} mins</div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="font-bold text-lg text-black">{formatPrice(service.price)}</span>
                                            <ChevronRight className="w-5 h-5 text-gray-300" />
                                        </div>
                                    </div>
                                ))}
                                {allServices.length === 0 && <div className="text-gray-400">No available services found.</div>}
                            </div>
                        </div>
                    )}

                    {/* Step 2: Barber */}
                    {step === 2 && (
                        <div className="p-6 space-y-4 animate-in fade-in slide-in-from-right-8 duration-300">
                            <h2 className="text-2xl font-bold mb-6 text-black">เลือกช่าง</h2>
                            <div className="space-y-3">
                                {allBarbers.map(barber => (
                                    <div
                                        key={barber.id}
                                        onClick={() => {
                                            setSelectedBarber(barber);
                                            setTimeout(() => setStep(3), 200);
                                        }}
                                        className={cn(
                                            "flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all active:scale-95",
                                            selectedBarber?.id === barber.id
                                                ? "border-black bg-gray-50 ring-1 ring-black"
                                                : "border-gray-100 hover:border-gray-300"
                                        )}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-400">
                                                {barber.name.charAt(0)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg text-black">{barber.name}</div>
                                                <div className="text-gray-400 text-sm">{barber.role || "Stylist"}</div>
                                            </div>
                                        </div>
                                        {selectedBarber?.id === barber.id && <Check className="w-5 h-5 text-black" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 3: Date/Time */}
                    {step === 3 && (
                        <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                            <h2 className="text-2xl font-bold mb-2 text-black">เลือกวันและเวลา</h2>

                            {/* Date Scroller */}
                            <div className="flex gap-3 overflow-x-auto pb-4 -mx-6 px-6 hide-scrollbar snap-x">
                                {AVAILABLE_DATES.map((date, idx) => {
                                    const isSelected = selectedDate?.toDateString() === date.toDateString();
                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedDate(date)}
                                            className={cn(
                                                "flex flex-col items-center justify-center min-w-[70px] h-[90px] rounded-2xl border cursor-pointer snap-start flex-none transition-all",
                                                isSelected
                                                    ? "bg-black text-white border-black shadow-lg"
                                                    : "bg-white text-gray-400 border-gray-100"
                                            )}
                                        >
                                            <div className="text-xs font-medium mb-1">
                                                {date.toLocaleDateString('en-US', { weekday: 'short' })}
                                            </div>
                                            <div className={cn("text-2xl font-bold mb-2", isSelected ? "text-white" : "text-black")}>
                                                {date.getDate()}
                                            </div>
                                            <div className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-white" : "bg-green-500")} />
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Time Grid */}
                            <div>
                                <div className="text-sm font-bold text-black mb-4">Available Time</div>
                                <div className="grid grid-cols-3 gap-3">
                                    {TIME_SLOTS.map(time => {
                                        const isSelected = selectedTime === time;
                                        return (
                                            <button
                                                key={time}
                                                onClick={() => setSelectedTime(time)}
                                                className={cn(
                                                    "py-3 rounded-xl text-sm font-semibold border transition-all",
                                                    isSelected
                                                        ? "bg-black text-white border-black"
                                                        : "bg-white text-black border-gray-100 hover:border-black"
                                                )}
                                            >
                                                {time}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Contact & Payment */}
                    {step === 4 && (
                        <div className="p-6 space-y-6 animate-in fade-in slide-in-from-right-8 duration-300">
                            <h2 className="text-2xl font-bold text-black">ข้อมูลติดต่อ & ชำระเงิน</h2>

                            <div className="space-y-4">
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">Your Name</label>
                                    <input
                                        type="text"
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        className="w-full p-4 rounded-xl bg-gray-50 border-none font-medium text-black outline-none focus:ring-2 focus:ring-black"
                                        placeholder="John Doe"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-gray-500 uppercase mb-1.5 block">PhoneNumber</label>
                                    <input
                                        type="tel"
                                        value={phone}
                                        onChange={e => setPhone(e.target.value)}
                                        className="w-full p-4 rounded-xl bg-gray-50 border-none font-medium text-black outline-none focus:ring-2 focus:ring-black"
                                        placeholder="08x-xxx-xxxx"
                                    />
                                </div>
                            </div>

                            {/* Summary */}
                            <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Service</span>
                                    <span className="font-bold text-black">{selectedService?.title}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Barber</span>
                                    <span className="font-bold text-black">{selectedBarber?.name}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Date</span>
                                    <span className="font-bold text-black">
                                        {selectedDate?.toLocaleDateString()} {selectedTime}
                                    </span>
                                </div>
                                <div className="h-px bg-gray-100 my-2" />
                                <div className="flex justify-between text-lg">
                                    <span className="font-bold text-black">Total</span>
                                    <span className="font-bold text-black">{selectedService && formatPrice(selectedService.price)}</span>
                                </div>
                            </div>

                            {/* Payment Box */}
                            <div className="bg-blue-600 rounded-2xl p-5 text-white shadow-lg relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10" />
                                <div className="relative z-10">
                                    <div className="text-blue-100 text-sm mb-1">Deposit</div>
                                    <div className="text-3xl font-bold mb-4">{selectedService && formatPrice(selectedService.price)}</div>

                                    <div className="flex items-center gap-3 mb-6 bg-blue-500/30 p-3 rounded-xl backdrop-blur-sm border border-white/10">
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-green-600 font-bold text-xs shrink-0">KB</div>
                                        <div>
                                            <div className="text-xs text-blue-100">Kasikorn Bank</div>
                                            <div className="font-bold tracking-wide">012-3-45678-9</div>
                                        </div>
                                    </div>

                                    <div className="relative">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={handleFileChange}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                                        />
                                        <button className="w-full bg-white/10 hover:bg-white/20 transition-colors border-2 border-dashed border-white/30 rounded-xl py-3 flex items-center justify-center gap-2 text-sm font-medium">
                                            <Upload className="w-4 h-4" />
                                            {slipFile ? "Slip Attached" : "Upload Slip"}
                                        </button>
                                    </div>
                                    {slipFile && <div className="text-xs text-blue-100 mt-2 text-center truncate">{slipFile.name}</div>}
                                </div>
                            </div>

                            {submissionStatus === 'error' && (
                                <div className="text-red-500 text-sm text-center">Something went wrong. Please try again.</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Bottom Bar */}
                {step < 5 && (
                    <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-50 bg-white z-30">
                        {step > 1 && step < 4 && (
                            <div className="flex justify-between items-center mb-4 px-2">
                                <span className="text-xs font-semibold text-gray-500 line-clamp-1">
                                    {selectedService?.title}
                                    {selectedBarber && ` • ${selectedBarber.name}`}
                                </span>
                            </div>
                        )}

                        <button
                            disabled={!isStepValid() || submissionStatus !== 'idle'}
                            onClick={step === 4 ? handleConfirmBooking : handleNext}
                            className={cn(
                                "w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg",
                                isStepValid() && submissionStatus === 'idle'
                                    ? "bg-black text-white hover:bg-gray-900 shadow-black/20 active:scale-95"
                                    : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
                            )}
                        >
                            {submissionStatus !== 'idle' ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Processing...
                                </>
                            ) : (
                                <>
                                    {step === 4 ? "Confirm Booking" : "Next Step"}
                                    {step < 4 && <ChevronRight className="w-4 h-4" />}
                                </>
                            )}
                        </button>
                    </div>
                )}

                {/* Success Modal Overlay */}
                {step === 5 && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
                        <div className="bg-white w-full max-w-[320px] rounded-3xl p-8 flex flex-col items-center text-center shadow-2xl animate-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6 text-green-600 animate-in zoom-in delay-150 duration-500">
                                <Check className="w-10 h-10" strokeWidth={3} />
                            </div>
                            <h3 className="text-2xl font-bold mb-2 text-black">จองสำเร็จ!</h3>
                            <p className="text-gray-400 text-sm mb-8">
                                Redirecting to status page...
                            </p>
                            <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
