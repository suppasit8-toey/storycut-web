"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getBarbers, getServices, addBooking, getBookingsByBarberAndDate, getBarberPricesForService } from "@/lib/db";
import {
  ChevronRight,
  Check,
  Calendar,
  Clock,
  Upload,
  Loader2,
  ChevronLeft
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Types ---
interface Barber {
  id: string;
  name?: string; // Legacy
  name_th?: string;
  name_en?: string;
  position?: string;
  profile_image?: string;
  initial?: string;
  weekly_off_days?: number[];
}

interface BarberPricing {
  price_normal: number;
  price_promo?: number | null;
}

interface Service {
  id: string;
  name_th: string;
  name_en: string;
  duration_min: number;
  base_price: number;
  price_promo?: number | null;
  deposit_amount?: number;
}

// --- Helpers ---
const formatPrice = (price?: number) => price ? `฿ ${price.toLocaleString()}` : "฿ 0";

const getNext30Days = () => {
  const dates = [];
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    dates.push(d);
  }
  return dates;
};

const formatThaiDate = (date: Date) => {
  return date.toLocaleDateString("th-TH", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  });
};

const formatTimeRange = (startTime: string, duration: number = 60) => {
  const [hours, minutes] = startTime.split(":").map(Number);
  const start = new Date();
  start.setHours(hours, minutes, 0, 0);
  const end = new Date(start.getTime() + duration * 60000);
  const endHours = end.getHours().toString().padStart(2, "0");
  const endMinutes = end.getMinutes().toString().padStart(2, "0");
  return `เวลา ${startTime} - ${endHours}:${endMinutes} น.`;
};

const HOURLY_SLOTS = [
  "10:00", "11:00", "12:00", "13:00", "14:00",
  "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
];

export default function Home() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [loading, setLoading] = useState(true);

  // Data from Firestore
  const [allBarbers, setAllBarbers] = useState<Barber[]>([]);
  const [allServices, setAllServices] = useState<Service[]>([]);

  // Selection State
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedBarber, setSelectedBarber] = useState<Barber | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookedSlots, setBookedSlots] = useState<string[]>([]);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);
  const [existingBookings, setExistingBookings] = useState<any[]>([]);
  const [barberPricingMap, setBarberPricingMap] = useState<Record<string, BarberPricing>>({});

  // Form & Submission State
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [slipFile, setSlipFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const availableDates = getNext30Days();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [barbersData, servicesData] = await Promise.all([
          getBarbers(),
          getServices()
        ]);
        setAllBarbers(barbersData as Barber[]);
        // Sort services by price (promo price if exists, otherwise base price)
        const sortedServices = (servicesData as Service[]).sort((a, b) => {
          const priceA = a.price_promo || a.base_price;
          const priceB = b.price_promo || b.base_price;
          return priceA - priceB;
        });
        setAllServices(sortedServices);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // Rule 1: Fetch Booked Slots
  const fetchBookings = useCallback(async () => {
    if (selectedBarber && selectedDate) {
      setIsFetchingSlots(true);
      try {
        const dateStr = selectedDate.toLocaleDateString();
        const bookings = await getBookingsByBarberAndDate(selectedBarber.id, dateStr) as any[];
        setExistingBookings(bookings);
        setBookedSlots(bookings.map(b => b.time));
      } catch (error) {
        console.error("Error fetching booked slots:", error);
      } finally {
        setIsFetchingSlots(false);
      }
    }
  }, [selectedBarber, selectedDate]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Fetch Barber Pricing when service is selected
  useEffect(() => {
    const fetchPricing = async () => {
      if (selectedService) {
        try {
          const pricing = await getBarberPricesForService(selectedService.id);
          setBarberPricingMap(pricing as Record<string, BarberPricing>);
        } catch (error) {
          console.error("Error fetching pricing:", error);
        }
      }
    };
    fetchPricing();
  }, [selectedService]);

  // Sorting and Filtering Logics
  const getPositionPriority = (pos?: string) => {
    const p = pos || "";
    if (p.includes("Senior")) return 1;
    if (p.includes("Master")) return 2;
    return 3;
  };

  const filteredAndSortedBarbers = allBarbers
    .filter(barber => barberPricingMap[barber.id]) // Only show barbers who offer this service
    .sort((a, b) => {
      const prioA = getPositionPriority(a.position);
      const prioB = getPositionPriority(b.position);

      if (prioA !== prioB) return prioA - prioB;

      // Secondary sort: Price
      const priceA = barberPricingMap[a.id].price_promo || barberPricingMap[a.id].price_normal;
      const priceB = barberPricingMap[b.id].price_promo || barberPricingMap[b.id].price_normal;
      return priceA - priceB;
    });

  // Handlers
  const handleNext = () => setStep((s) => (s + 1) as any);
  const handleBack = () => setStep((s) => (s - 1) as any);

  // Rule 2: Time Slot Validation Logic (Advanced)
  const isSlotAvailable = (time: string, date: Date) => {
    if (!selectedService || !selectedBarber) return false;

    // Check Barber Off-Days
    if (selectedBarber.weekly_off_days?.includes(date.getDay())) return false;

    const [h, m] = time.split(":").map(Number);
    const slotStartMinutes = h * 60 + m;
    const slotEndMinutes = slotStartMinutes + selectedService.duration_min;

    // 1. Closing Time Check (Shop closes at 21:00 = 1260 mins)
    if (slotEndMinutes > 1260) return false;

    // 2. Overlap Protection (Dynamic Duration)
    const hasOverlap = existingBookings.some(booking => {
      const [exH, exM] = booking.time.split(":").map(Number);
      const exDuration = booking.duration_min || 60; // Fallback to 60 for legacy
      const exStart = exH * 60 + exM;
      const exEnd = exStart + exDuration;

      // Overlap Condition: (NewStart < ExEnd) AND (NewEnd > ExStart)
      return slotStartMinutes < exEnd && slotEndMinutes > exStart;
    });

    if (hasOverlap) return false;

    // 3. 30-Minute Buffer (Only for Today)
    const now = new Date();
    if (date.toLocaleDateString() === now.toLocaleDateString()) {
      const slotStartTime = new Date(date);
      slotStartTime.setHours(h, m, 0, 0);
      const slotExpiryTime = slotStartTime.getTime() + (30 * 60 * 1000);
      return now.getTime() < slotExpiryTime;
    }

    return true;
  };

  const validatePhone = (p: string) => {
    return p.startsWith("0") && p.length === 10 && /^\d+$/.test(p);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSlipFile(e.target.files[0]);
    }
  };

  const handleConfirm = async () => {
    if (!validatePhone(phone) || !name || !selectedService || !selectedBarber || !selectedDate || !selectedTime) {
      return;
    }

    setIsSubmitting(true);
    try {
      let slipUrl = null;
      if (slipFile) {
        const formData = new FormData();
        formData.append("file", slipFile);
        formData.append("upload_preset", "storycut_uploads");
        const response = await fetch(`https://api.cloudinary.com/v1_1/dcspjhgdj/image/upload`, {
          method: "POST",
          body: formData,
        });
        const data = await response.json();
        slipUrl = data.secure_url;
      }

      const dateStr = selectedDate.toLocaleDateString();
      const dateTimeString = `${dateStr} ${selectedTime}`;
      const finalPrice = selectedBarber ? (barberPricingMap[selectedBarber.id]?.price_promo || barberPricingMap[selectedBarber.id]?.price_normal || selectedService.price_promo || selectedService.base_price) : (selectedService.price_promo || selectedService.base_price);

      await addBooking({
        barberId: selectedBarber.id,
        barberName: selectedBarber.name_th || selectedBarber.name || "Unknown Barber",
        serviceId: selectedService.id,
        serviceName: selectedService.name_th,
        dateTime: dateTimeString,
        date: dateStr,
        time: selectedTime,
        customerName: name,
        phone: phone,
        slipUrl,
        price: finalPrice,
        duration_min: selectedService.duration_min,
        status: "pending"
      });

      router.push(`/booking/status?phone=${phone}`);
    } catch (error) {
      console.error("Booking error:", error);
      alert("Booking failed. Please try again.");
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-900 flex flex-col items-center font-sans tracking-tight">
      {/* Header */}
      <header className="w-full max-w-[400px] flex justify-between items-center px-6 py-6 text-white shrink-0">
        <div className="font-black text-2xl tracking-tighter uppercase italic">STORYCUT</div>
        <button
          onClick={() => router.push("/booking/status")}
          className="text-[10px] font-black uppercase tracking-widest border border-white/20 px-4 py-2 rounded-full hover:bg-white/10 transition-all active:scale-95"
        >
          เช็คสถานะ
        </button>
      </header>

      {/* Content Card */}
      <main className="w-full max-w-[400px] bg-white rounded-t-[40px] md:rounded-[40px] flex-1 md:flex-none md:min-h-[750px] shadow-2xl relative overflow-hidden flex flex-col mb-0 md:mb-10">

        {/* Progress Bar */}
        <div className="px-8 pt-8 pb-4">
          <div className="flex justify-between items-center mb-4">
            {["SERVICES", "BARBERS", "DATE & TIME", "PAYMENT"].map((label, idx) => {
              const active = step >= idx + 1;
              return (
                <div key={label} className={cn("text-[9px] font-black tracking-widest uppercase transition-colors", active ? "text-gray-900" : "text-gray-200")}>
                  {label}
                </div>
              );
            })}
          </div>
          <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-black transition-all duration-700 ease-in-out"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        <style jsx global>{`
          .custom-scrollbar-visible::-webkit-scrollbar {
            height: 4px;
            display: block !important;
          }
          .custom-scrollbar-visible::-webkit-scrollbar-track {
            background: #f1f1f1;
            border-radius: 10px;
          }
          .custom-scrollbar-visible::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 10px;
          }
          .custom-scrollbar-visible::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}</style>

        {/* Steps Area */}
        <div className="flex-1 overflow-y-auto px-6 py-4">

          {/* Step 1: Select Service */}
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500 pb-10">
              <h2 className="flex flex-col mb-4">
                <span className="text-3xl font-black text-gray-900 tracking-tighter">เลือกบริการ</span>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] italic -mt-1">SELECT SERVICE</span>
              </h2>
              <div className="space-y-2">
                {allServices.map(service => (
                  <button
                    key={service.id}
                    onClick={() => {
                      setSelectedService(service);
                    }}
                    className={cn(
                      "w-full flex items-center justify-between p-4 rounded-[28px] border-2 transition-all active:scale-[0.97]",
                      selectedService?.id === service.id
                        ? "border-black bg-black text-white shadow-xl shadow-black/10"
                        : "border-gray-50 bg-gray-50 hover:border-gray-200 text-gray-900"
                    )}
                  >
                    <div className="text-left">
                      <div className="font-black text-lg mb-0">{service.name_th}</div>
                      <div className={cn("text-[10px] font-bold opacity-40 uppercase tracking-widest", selectedService?.id === service.id ? "text-white" : "text-gray-900")}>
                        {service.name_en}
                      </div>
                      <div className={cn("text-[9px] font-black uppercase tracking-widest mt-1", selectedService?.id === service.id ? "text-white/60" : "text-gray-400")}>
                        {service.duration_min} MINS
                      </div>
                    </div>
                    <div className="text-right">
                      {service.price_promo ? (
                        <div className="flex flex-col items-end">
                          <div className="text-[10px] line-through opacity-50 font-bold mb-[-4px]">{formatPrice(service.base_price)}</div>
                          <div className="font-black text-xl italic text-green-500">{formatPrice(service.price_promo)}</div>
                        </div>
                      ) : (
                        <div className="font-black text-xl italic">{formatPrice(service.base_price)}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2: Select Barber */}
          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 pb-10">
              <div className="flex items-center gap-4 mb-4">
                <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-all active:scale-90">
                  <ChevronLeft className="w-6 h-6 text-gray-900" />
                </button>
                <h2 className="flex flex-col">
                  <span className="text-3xl font-black text-gray-900 tracking-tighter">เลือกช่าง</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] italic -mt-1">SELECT BARBER</span>
                </h2>
              </div>
              <div className="space-y-2">
                {filteredAndSortedBarbers.map(barber => {
                  const pricing = barberPricingMap[barber.id];
                  return (
                    <div
                      key={barber.id}
                      onClick={() => {
                        setSelectedBarber(barber);
                      }}
                      className={cn(
                        "w-full flex items-center justify-between p-4 rounded-[32px] border-2 transition-all active:scale-[0.97] cursor-pointer",
                        selectedBarber?.id === barber.id
                          ? "border-black bg-black text-white"
                          : "border-gray-50 bg-gray-50 hover:border-gray-200 text-gray-900"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl border shadow-sm overflow-hidden",
                          selectedBarber?.id === barber.id ? "bg-white/10 border-white/20" : "bg-white border-gray-100"
                        )}>
                          {barber.profile_image ? (
                            <img src={barber.profile_image} className="w-full h-full object-cover" alt={barber.name_en || barber.name} />
                          ) : (
                            barber.name_th?.[0] || barber.name_en?.[0] || barber.name?.[0] || 'B'
                          )}
                        </div>
                        <div className="text-left">
                          <div className="font-black text-lg mb-0">{barber.name_th || barber.name}</div>
                          <div className={cn("text-[10px] font-bold opacity-40 uppercase tracking-widest", selectedBarber?.id === barber.id ? "text-white" : "text-gray-900")}>
                            {barber.name_en}
                          </div>
                          <div className={cn("text-[10px] font-black uppercase tracking-widest mt-0.5", selectedBarber?.id === barber.id ? "text-white/60" : "text-gray-400")}>
                            {barber.position || "MASTER BARBER"}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        {pricing?.price_promo ? (
                          <div className="flex flex-col items-end">
                            <div className={cn("text-[9px] line-through font-bold opacity-40", selectedBarber?.id === barber.id ? "text-white" : "text-gray-400")}>
                              {formatPrice(pricing.price_normal)}
                            </div>
                            <div className={cn("font-black text-lg italic", selectedBarber?.id === barber.id ? "text-white" : "text-green-500")}>
                              {formatPrice(pricing.price_promo)}
                            </div>
                          </div>
                        ) : (
                          <div className="font-black text-lg italic">
                            {formatPrice(pricing?.price_normal)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Date & Time */}
          {step === 3 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 pb-10">
              <div className="flex items-center gap-4 mb-4">
                <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-all active:scale-90">
                  <ChevronLeft className="w-6 h-6 text-gray-900" />
                </button>
                <h2 className="flex flex-col">
                  <span className="text-3xl font-black text-gray-900 tracking-tighter">วันและเวลา</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] italic -mt-1">DATE & TIME</span>
                </h2>
              </div>

              <div className="flex gap-3 overflow-x-auto -mx-6 px-6 pb-6 no-scrollbar snap-x scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent custom-scrollbar-visible">
                {availableDates.map((date, i) => {
                  const isSelected = selectedDate.toDateString() === date.toDateString();
                  const isOffDay = selectedBarber?.weekly_off_days?.includes(date.getDay());

                  return (
                    <button
                      key={i}
                      disabled={isOffDay}
                      onClick={() => {
                        setSelectedDate(date);
                        setSelectedTime(null);
                      }}
                      className={cn(
                        "min-w-[75px] h-[100px] flex flex-col items-center justify-center rounded-[28px] border-2 transition-all snap-start active:scale-[0.95]",
                        isOffDay ? "opacity-20 cursor-not-allowed grayscale" :
                          isSelected
                            ? "bg-black border-black text-white shadow-xl shadow-black/20"
                            : "bg-white border-gray-50 text-gray-900 hover:border-gray-200"
                      )}
                    >
                      <div className={cn("text-[9px] font-black uppercase tracking-widest mb-1", isSelected ? "text-white/60" : "text-gray-400")}>
                        {date.toLocaleDateString("th-TH", { weekday: "short" })}
                      </div>
                      <div className="text-2xl font-black italic">{date.getDate()}</div>
                      {isOffDay && <span className="text-[7px] font-black uppercase tracking-tighter mt-1">Off</span>}
                    </button>
                  );
                })}
              </div>

              {/* Time Slots Area */}
              <div className="relative">
                {isFetchingSlots && (
                  <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-[1px] rounded-3xl">
                    <Loader2 className="w-8 h-8 text-black animate-spin" />
                  </div>
                )}
                <div className={cn(
                  "overflow-y-auto p-2 custom-scrollbar -mx-2 transition-all duration-300 pb-4"
                )}>
                  <div className="grid grid-cols-3 gap-3">
                    {HOURLY_SLOTS.map(time => {
                      const available = isSlotAvailable(time, selectedDate);
                      const isSelected = selectedTime === time;
                      return (
                        <button
                          key={time}
                          disabled={!available}
                          onClick={() => setSelectedTime(time)}
                          className={cn(
                            "py-5 rounded-[24px] font-black text-sm border-2 transition-all active:scale-[0.95] flex flex-col items-center gap-1.5 min-h-[85px] justify-center",
                            !available ? "bg-gray-100 border-gray-100 text-gray-300 cursor-not-allowed" :
                              isSelected ? "bg-black border-black text-white shadow-lg" :
                                "bg-white border-gray-50 hover:border-black text-gray-900"
                          )}
                        >
                          {time}
                          {/* Dots indicator for status */}
                          <div className="flex items-center gap-1">
                            {!available ? (
                              <>
                                <div className="w-1.5 h-1.5 rounded-full bg-red-400" />
                                <span className="text-[8px] font-black uppercase text-red-400">เต็ม</span>
                              </>
                            ) : isSelected ? (
                              <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Contact & Payment */}
          {step === 4 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 pb-10">
              <div className="flex items-center gap-4 mb-4">
                <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-full transition-all active:scale-90">
                  <ChevronLeft className="w-6 h-6 text-gray-900" />
                </button>
                <h2 className="flex flex-col">
                  <span className="text-3xl font-black text-gray-900 tracking-tighter">ข้อมูลติดต่อ & ชำระเงิน</span>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em] italic -mt-1">CONTACT & PAYMENT</span>
                </h2>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block ml-2">YOUR NAME</label>
                    <input
                      type="text"
                      placeholder="กรอกชื่อของคุณ"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full bg-gray-50 border-2 border-gray-50 rounded-[24px] p-5 font-bold text-gray-900 focus:bg-white focus:border-black transition-all outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2 block ml-2">PHONE NUMBER (10 DIGITS)</label>
                    <input
                      type="tel"
                      placeholder="08XXXXXXXX"
                      value={phone}
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, "");
                        if (val.length <= 10) setPhone(val);
                      }}
                      className={cn(
                        "w-full border-2 rounded-[24px] p-5 font-bold text-gray-900 transition-all outline-none",
                        phone && !validatePhone(phone) && phone.length === 10 ? "border-red-500 bg-red-50" : "border-gray-50 bg-gray-50 focus:bg-white focus:border-black"
                      )}
                    />
                  </div>
                </div>

                <div className="bg-zinc-900 rounded-[40px] p-8 text-white space-y-5 shadow-2xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20 blur-2xl" />

                  <div className="flex justify-between items-center">
                    <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Service Price</span>
                    <span className="font-black text-sm">
                      {formatPrice(selectedBarber ? (barberPricingMap[selectedBarber.id]?.price_promo || barberPricingMap[selectedBarber.id]?.price_normal) : (selectedService?.price_promo || selectedService?.base_price))}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-white/5 p-3 rounded-2xl border border-white/10">
                    <span className="text-[9px] font-black text-green-400 uppercase tracking-widest">Deposit Due Now</span>
                    <span className="text-xl font-black italic text-green-400">
                      {formatPrice(selectedService?.deposit_amount || 100)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center opacity-50">
                    <span className="text-[9px] font-black uppercase tracking-widest">Balance at Shop</span>
                    <span className="font-bold text-sm">
                      {formatPrice(
                        (selectedBarber ? (barberPricingMap[selectedBarber.id]?.price_promo || barberPricingMap[selectedBarber.id]?.price_normal) : (selectedService?.price_promo || selectedService?.base_price || 0)) - (selectedService?.deposit_amount || 100)
                      )}
                    </span>
                  </div>
                </div>

                <div className="bg-blue-600 rounded-[40px] p-8 text-white shadow-xl shadow-blue-100 relative overflow-hidden border-2 border-blue-500">
                  <div className="relative z-10">
                    <div className="flex items-center gap-4 mb-8">
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center font-black text-blue-600 shadow-xl">KB</div>
                      <div>
                        <div className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-0.5">Kasikorn Bank</div>
                        <div className="font-black text-xl italic tracking-widest">012-3-45678-9</div>
                      </div>
                    </div>
                    <div className="relative group">
                      <input
                        type="file"
                        onChange={handleFileChange}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                      />
                      <div className="bg-white/10 hover:bg-white/20 border-2 border-dashed border-white/30 rounded-[24px] py-5 flex items-center justify-center gap-3 font-black text-[10px] uppercase tracking-widest transition-all active:scale-[0.98]">
                        <Upload className="w-4 h-4" />
                        {slipFile ? <span className="truncate max-w-[180px]">{slipFile.name}</span> : "Upload Transfer Slip"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sticky Footer Summary (Now part of flow in scrollable container as Relative) */}
          {step < 5 && ((step === 1 && selectedService) || (step === 2 && selectedBarber) || (step === 3 && selectedTime) || step === 4) && (
            <div className="mt-10 p-8 border-t border-gray-100 flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-4 duration-700 bg-white z-20">
              {step < 4 && (
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">Selected</span>
                    <div className="text-[11px] font-black text-gray-900 truncate max-w-[200px] uppercase">
                      {selectedService?.name_th}
                      {selectedBarber && ` • ${selectedBarber.name_th || selectedBarber.name}`}
                      {selectedBarber?.position && <span className="text-[9px] opacity-40 ml-1">({selectedBarber.position})</span>}
                      {selectedTime && ` • ${selectedTime}`}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 block">Price</span>
                    <span className="text-xl font-black text-black leading-none italic">
                      {formatPrice(
                        selectedBarber ? (barberPricingMap[selectedBarber.id]?.price_promo || barberPricingMap[selectedBarber.id]?.price_normal) : (selectedService?.price_promo || selectedService?.base_price)
                      )}
                    </span>
                  </div>
                </div>
              )}

              {step === 3 && selectedDate && selectedTime && (
                <div className="text-right text-gray-900 space-y-1 animate-in fade-in slide-in-from-right-4 duration-500 border-t border-gray-50 pt-4">
                  <div className="text-xl font-bold">{formatThaiDate(selectedDate)}</div>
                  <div className="text-lg font-bold">{formatTimeRange(selectedTime, selectedService?.duration_min)}</div>
                </div>
              )}

              <button
                disabled={
                  (step === 1 && !selectedService) ||
                  (step === 2 && !selectedBarber) ||
                  (step === 3 && (!selectedDate || !selectedTime)) ||
                  (step === 4 && (!name || !validatePhone(phone) || isSubmitting))
                }
                onClick={step === 4 ? handleConfirm : handleNext}
                className={cn(
                  "w-full py-6 rounded-[30px] font-black text-xs uppercase tracking-[0.25em] transition-all active:scale-[0.98] flex items-center justify-center gap-3 shadow-2xl",
                  ((step === 1 && selectedService) || (step === 2 && selectedBarber) || (step === 3 && selectedTime) || (step === 4 && name && validatePhone(phone) && !isSubmitting))
                    ? "bg-black text-white shadow-black/20"
                    : "bg-gray-100 text-gray-300 cursor-not-allowed shadow-none"
                )}
              >
                {isSubmitting ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    {step === 4 ? "ยืนยันและชำระมัดจำ" : "NEXT STEP"}
                    {step < 4 && <ChevronRight className="w-5 h-5 stroke-[3px]" />}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </main>

      <footer className="w-full max-w-[400px] text-center p-10 opacity-20 shrink-0">
        <p className="text-[9px] font-black uppercase tracking-[0.5em] text-white">STORYCUT • EST 2024</p>
      </footer>
    </div>
  );
}
