"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, orderBy } from "firebase/firestore";
import {
    Scissors,
    LogOut,
    Clock,
    User,
    ChevronRight,
    CheckCircle2,
    Loader2,
    AlertCircle,
    Play,
    Check
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Barber {
    id: string;
    name_th: string;
    nickname: string;
    profile_image: string;
}

interface Booking {
    id: string;
    customerName: string;
    serviceName: string;
    startTime: string;
    endTime: string;
    date: string;
    status: "pending" | "confirmed" | "in_progress" | "done" | "cancelled";
}

export default function StaffDashboard() {
    const [barber, setBarber] = useState<Barber | null>(null);
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        // Auth Guard
        const storedBarber = localStorage.getItem("staff_barber");
        if (!storedBarber) {
            router.push("/staff");
            return;
        }
        setBarber(JSON.parse(storedBarber));
    }, []);

    useEffect(() => {
        if (!barber) return;

        // Get Today's Date String (YYYY-MM-DD or whatever format used in the app)
        // Based on previous code, bookings might use simple date string
        const today = new Date().toLocaleDateString();

        const q = query(
            collection(db, "bookings"),
            where("barberId", "==", barber.id),
            where("date", "==", today),
            orderBy("time", "asc")
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
            setBookings(data.filter(b => b.status !== "cancelled"));
            setLoading(false);
        });

        return () => unsubscribe();
    }, [barber]);

    const handleUpdateStatus = async (bookingId: string, nextStatus: string) => {
        try {
            const docRef = doc(db, "bookings", bookingId);
            await updateDoc(docRef, { status: nextStatus });
        } catch (e) {
            console.error("Status Update Error:", e);
            alert("Failed to update status.");
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("staff_barber");
        router.push("/staff");
    };

    if (!barber) return null;

    return (
        <div className="min-h-screen bg-[#F8F9FA] flex flex-col pb-10">
            {/* Staff Header */}
            <header className="bg-black text-white p-6 pb-12 rounded-b-[40px] shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                    <Scissors className="w-32 h-32" />
                </div>

                <div className="flex justify-between items-center mb-8 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-white/20 backdrop-blur-md rounded-2xl p-1 border border-white/10">
                            <img src={barber.profile_image || "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"} className="w-full h-full object-cover rounded-xl" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Logged in as</p>
                            <h2 className="text-xl font-black italic">{barber.name_th}</h2>
                        </div>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center hover:bg-red-500 transition-all"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>

                <div className="relative z-10">
                    <h1 className="text-3xl font-black italic uppercase tracking-tighter">Today's Queue</h1>
                    <p className="text-white/40 text-xs font-bold">{new Date().toLocaleDateString('th-TH', { dateStyle: 'full' })}</p>
                </div>
            </header>

            {/* Queue List */}
            <main className="flex-1 px-6 -mt-6 relative z-10 space-y-4">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="w-10 h-10 text-black animate-spin" />
                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Updating Queue...</p>
                    </div>
                ) : bookings.length === 0 ? (
                    <div className="bg-white rounded-[32px] p-12 text-center border border-gray-100 shadow-sm">
                        <AlertCircle className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                        <h3 className="text-lg font-black text-gray-900 mb-1">No Bookings Found</h3>
                        <p className="text-xs text-gray-400 font-bold uppercase tracking-widest leading-relaxed">Relax! You have no more jobs for today.</p>
                    </div>
                ) : (
                    bookings.map((booking) => (
                        <div key={booking.id} className={cn(
                            "bg-white rounded-[32px] p-6 border transition-all flex flex-col gap-6 shadow-sm",
                            booking.status === "in_progress" ? "border-blue-500 shadow-blue-500/10 ring-4 ring-blue-500/5" : "border-gray-100"
                        )}>
                            <div className="flex justify-between items-start">
                                <div className="flex gap-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-2xl flex items-center justify-center",
                                        booking.status === "done" ? "bg-green-50 text-green-500" : "bg-gray-50 text-gray-900"
                                    )}>
                                        <Clock className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-black text-gray-900">{booking.startTime}</h4>
                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest">Time Slot</p>
                                    </div>
                                </div>
                                <div className={cn(
                                    "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest",
                                    booking.status === "confirmed" ? "bg-blue-50 text-blue-500" :
                                        booking.status === "in_progress" ? "bg-amber-50 text-amber-500 animate-pulse" :
                                            booking.status === "done" ? "bg-green-50 text-green-500" : "bg-gray-50 text-gray-500"
                                )}>
                                    {booking.status.replace("_", " ")}
                                </div>
                            </div>

                            <div className="h-px bg-gray-50" />

                            <div className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center">
                                        <User className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <span className="font-black text-gray-900">{booking.customerName}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gray-50 rounded-full flex items-center justify-center">
                                        <Scissors className="w-4 h-4 text-gray-400" />
                                    </div>
                                    <span className="font-bold text-gray-500">{booking.serviceName}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-2">
                                {booking.status === "confirmed" && (
                                    <button
                                        onClick={() => handleUpdateStatus(booking.id, "in_progress")}
                                        className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-blue-700 transition-all active:scale-95 shadow-xl shadow-blue-500/20"
                                    >
                                        <Play className="w-4 h-4 fill-current" /> เริ่มงาน (Start Job)
                                    </button>
                                )}
                                {booking.status === "in_progress" && (
                                    <button
                                        onClick={() => handleUpdateStatus(booking.id, "done")}
                                        className="w-full bg-green-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-green-700 transition-all active:scale-95 shadow-xl shadow-green-500/20"
                                    >
                                        <Check className="w-4 h-4" /> เสร็จสิ้น (Finish Job)
                                    </button>
                                )}
                                {booking.status === "done" && (
                                    <div className="w-full bg-gray-50 text-gray-400 py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 border border-dashed border-gray-200">
                                        <CheckCircle2 className="w-4 h-4" /> Completed
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </main>
        </div>
    );
}
