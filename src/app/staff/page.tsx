"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import {
    Lock,
    Delete,
    CheckCircle2,
    Loader2,
    Scissors
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export default function StaffLoginPage() {
    const [pin, setPin] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    useEffect(() => {
        // Auto-check if pin is 4 digits
        if (pin.length === 4) {
            handleLogin();
        }
    }, [pin]);

    const handleLogin = async () => {
        setLoading(true);
        setError("");
        try {
            const q = query(collection(db, "barbers"), where("pin_code", "==", pin));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const barberDoc = querySnapshot.docs[0];
                const barberData = { id: barberDoc.id, ...barberDoc.data() };

                // Store in localStorage
                localStorage.setItem("staff_barber", JSON.stringify(barberData));

                // Redirect
                router.push("/staff/dashboard");
            } else {
                setError("Incorrect Access Code. Please try again.");
                setPin("");
                setLoading(false);
            }
        } catch (e) {
            console.error("Login Error:", e);
            setError("Something went wrong. Contact Admin.");
            setLoading(false);
        }
    };

    const handleNumberClick = (num: string) => {
        if (pin.length < 4) {
            setPin(prev => prev + num);
        }
    };

    const handleDeleteClick = () => {
        setPin(prev => prev.slice(0, -1));
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 text-white overflow-hidden relative">
            {/* Background Aesthetic */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
                <div className="absolute -top-24 -left-24 w-96 h-96 bg-white rounded-full blur-[160px]" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full border border-white/5 rounded-full scale-[1.5]" />
            </div>

            <div className="w-full max-w-sm relative z-10 flex flex-col items-center">
                {/* Logo & Header */}
                <div className="mb-12 text-center group">
                    <div className="w-20 h-20 bg-white text-black rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-white/10 group-active:scale-95 transition-all rotate-3 group-hover:-rotate-3">
                        <Scissors className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl font-black uppercase tracking-[0.2em] italic mb-2">Staff Access</h1>
                    <p className="text-white/40 text-[10px] uppercase tracking-[0.3em] font-bold">Authorized Personnel Only</p>
                </div>

                {/* PIN Display */}
                <div className="mb-12 flex gap-4">
                    {[0, 1, 2, 3].map((idx) => (
                        <div
                            key={idx}
                            className={cn(
                                "w-4 h-4 rounded-full border-2 transition-all duration-300",
                                pin.length > idx
                                    ? "bg-white border-white scale-125 shadow-lg shadow-white/50"
                                    : "border-white/20"
                            )}
                        />
                    ))}
                </div>

                {/* Error Message */}
                <div className="h-6 mb-6">
                    {error && (
                        <p className="text-red-400 text-[10px] font-black uppercase tracking-widest animate-bounce">
                            {error}
                        </p>
                    )}
                    {loading && (
                        <div className="flex items-center gap-2 text-white/40">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Validating...</span>
                        </div>
                    )}
                </div>

                {/* Pinpad */}
                <div className="grid grid-cols-3 gap-6 w-full px-4">
                    {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((num) => (
                        <button
                            key={num}
                            onClick={() => handleNumberClick(num)}
                            disabled={loading}
                            className="bg-white/5 border border-white/10 w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black hover:bg-white hover:text-black transition-all active:scale-90"
                        >
                            {num}
                        </button>
                    ))}
                    <div />
                    <button
                        onClick={() => handleNumberClick("0")}
                        disabled={loading}
                        className="bg-white/5 border border-white/10 w-20 h-20 rounded-full flex items-center justify-center text-2xl font-black hover:bg-white hover:text-black transition-all active:scale-90"
                    >
                        0
                    </button>
                    <button
                        onClick={handleDeleteClick}
                        disabled={loading}
                        className="bg-white/5 border border-white/10 w-20 h-20 rounded-full flex items-center justify-center text-xl font-black hover:bg-red-500 hover:border-red-500 transition-all active:scale-90"
                    >
                        <Delete className="w-6 h-6" />
                    </button>
                </div>

                {/* Footer Link */}
                <button
                    onClick={() => router.push("/")}
                    className="mt-16 text-[9px] font-black text-white/20 uppercase tracking-[0.4em] hover:text-white transition-colors"
                >
                    Back to Customer App
                </button>
            </div>
        </div>
    );
}
