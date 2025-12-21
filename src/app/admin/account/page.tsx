"use client";

import { useState } from "react";
import { User, LogOut, Settings, Shield } from "lucide-react";

export default function AccountPage() {
    // Mock Admin Profile - in real app fetch from auth context
    const [profile] = useState({
        name: "Admin User",
        email: "admin@storycut.com",
        role: "Super Admin"
    });

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-10 pb-20 font-sans animate-in fade-in duration-500">
            <div className="max-w-2xl mx-auto">
                <header className="mb-12">
                    <h1 className="text-3xl font-black italic tracking-tighter text-white mb-2 font-inter">Account</h1>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Profile & Settings</p>
                </header>

                <div className="bg-[#1A1A1A] rounded-[40px] border border-white/5 overflow-hidden p-10 flex flex-col gap-10">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-white flex items-center justify-center text-4xl text-black font-black shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                            {profile.name.charAt(0)}
                        </div>
                        <div>
                            <h2 className="text-3xl font-black text-white tracking-tight leading-none mb-2">{profile.name}</h2>
                            <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1 rounded-full border border-white/5">
                                <Shield className="w-3 h-3 text-white" />
                                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-300">{profile.role}</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Email Address</label>
                            <div className="text-lg font-bold text-white font-mono">{profile.email}</div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Password</label>
                            <div className="flex items-center gap-4">
                                <div className="text-lg font-bold text-white font-mono tracking-widest">••••••••••••••</div>
                                <button className="text-xs font-bold uppercase tracking-wider text-gray-500 hover:text-white transition-colors">Change</button>
                            </div>
                        </div>
                    </div>

                    <div className="pt-10 border-t border-white/5">
                        <button className="w-full bg-[#0A0A0A] hover:bg-white hover:text-black border border-white/10 text-white py-5 rounded-3xl font-black text-sm uppercase tracking-widest transition-all flex items-center justify-center gap-3 group">
                            <LogOut className="w-4 h-4 text-gray-500 group-hover:text-black transition-colors" />
                            Sign Out
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
