"use client";

import { useState } from "react";
import { DollarSign, Calendar, Download } from "lucide-react";

export default function SalaryPage() {
    // Mock Data for Salary
    const [period] = useState("December 2024");

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-10 pb-20 font-sans animate-in fade-in duration-500">
            <div className="max-w-[1600px] mx-auto">
                <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-3xl font-black italic tracking-tighter text-white mb-2 font-inter">Salary</h1>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Payroll Management</p>
                    </div>

                    <button className="bg-[#1A1A1A] text-white border border-white/10 px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-colors flex items-center gap-2">
                        <Calendar className="w-4 h-4" /> {period}
                    </button>
                </header>

                <div className="bg-[#1A1A1A] rounded-[32px] p-20 text-center border border-white/5 flex flex-col items-center justify-center opacity-70">
                    <DollarSign className="w-16 h-16 text-gray-600 mb-6" />
                    <h2 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Payroll System Coming Soon</h2>
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-sm max-w-md">
                        Automated salary calculation based on commission and bookings will be available here.
                    </p>
                </div>
            </div>
        </div>
    );
}
