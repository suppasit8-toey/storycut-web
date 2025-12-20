"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
    LayoutDashboard,
    Calendar,
    Users,
    Scissors,
    ClipboardList,
    MapPin,
    DollarSign,
    User,
    Ticket,
    Menu,
    X,
    LogOut,
    ChevronRight,
    Search
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// Full Menu List
const MENU_ITEMS = [
    { label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
    { label: "Bookings", icon: Calendar, href: "/admin/bookings" },
    { label: "Customers", icon: Users, href: "/admin/customers" },
    { label: "Barbers", icon: Scissors, href: "/admin/barbers" },
    { label: "Services", icon: ClipboardList, href: "/admin/services" },
    { label: "Branches", icon: MapPin, href: "/admin/branches" },
    { label: "Salary", icon: DollarSign, href: "/admin/salary" },
    { label: "Account", icon: User, href: "/admin/account" },
    { label: "Voucher", icon: Ticket, href: "/admin/voucher" },
];

const MOBILE_MAIN_ITEMS = MENU_ITEMS.slice(0, 4);
const MOBILE_DRAWER_ITEMS = MENU_ITEMS.slice(4);

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Active State Helper
    const isItemActive = (href: string) => {
        if (pathname === href) return true;
        if (href === '/admin/dashboard' && pathname === '/admin') return true;
        return false;
    };

    return (
        <div className="flex min-h-screen bg-black text-white font-sans selection:bg-white selection:text-black">

            {/* --- DESKTOP/TABLET SIDEBAR (lg and up) --- */}
            <aside className="hidden lg:flex flex-col w-72 h-screen fixed inset-y-0 left-0 border-r border-white/5 bg-[#1A1A1A] z-50 shadow-2xl">
                <div className="p-8 flex items-center gap-4">
                    <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center rotate-3 shadow-[0_0_20px_rgba(255,255,255,0.2)]">
                        <Scissors className="w-6 h-6 text-black transform -rotate-3" />
                    </div>
                    <div>
                        <h1 className="text-xl font-black italic tracking-tighter text-white leading-none">StoryCut</h1>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40 mt-1">Admin Portal</p>
                    </div>
                </div>

                <div className="px-6 mb-6">
                    <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </div>

                <nav className="flex-1 px-4 space-y-2 overflow-y-auto custom-scrollbar py-2">
                    {MENU_ITEMS.map((item) => {
                        const isActive = isItemActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-4 px-6 py-4 rounded-2xl text-sm font-bold transition-all group relative overflow-hidden active:scale-[0.98]",
                                    isActive
                                        ? "bg-white text-black shadow-lg shadow-white/10"
                                        : "text-gray-500 hover:bg-white/5 hover:text-white"
                                )}
                            >
                                <item.icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive ? "text-black" : "text-gray-500 group-hover:text-white")} strokeWidth={isActive ? 2.5 : 2} />
                                <span className={cn("tracking-wide", isActive ? "font-black" : "font-semibold")}>{item.label}</span>
                                {isActive && <ChevronRight className="w-4 h-4 ml-auto opacity-50" />}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-6 mt-auto">
                    <div className="bg-[#272727] rounded-3xl p-5 border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-2xl -mr-10 -mt-10 pointer-events-none" />
                        <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-full bg-black border border-white/10 flex items-center justify-center">
                                <User className="w-5 h-5 text-white/70" />
                            </div>
                            <div>
                                <div className="text-xs font-bold text-white">Admin User</div>
                                <div className="text-[10px] text-green-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> Online
                                </div>
                            </div>
                        </div>
                        <button className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-black text-red-400 bg-red-500/10 hover:bg-red-500/20 active:scale-95 transition-all border border-red-500/10 uppercase tracking-widest">
                            <LogOut className="w-3 h-3" /> Sign Out
                        </button>
                    </div>
                </div>
            </aside>

            {/* --- MOBILE BOTTOM NAV (Below lg) --- */}
            <div className="lg:hidden fixed bottom-6 left-6 right-6 h-[80px] bg-[#1A1A1A]/90 backdrop-blur-xl border border-white/10 rounded-[32px] z-50 flex items-center justify-between px-6 shadow-2xl shadow-black/50">
                {MOBILE_MAIN_ITEMS.map((item) => {
                    const isActive = isItemActive(item.href);
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex flex-col items-center justify-center w-12 h-full gap-1 transition-all active:scale-90 relative",
                                isActive ? "text-white" : "text-gray-500"
                            )}
                        >
                            <div className={cn("w-full h-1 absolute -top-[1px] left-0 rounded-b-full bg-white transition-all duration-300", isActive ? "opacity-100" : "opacity-0")} />
                            <item.icon className={cn("w-6 h-6 transition-all duration-300", isActive ? "fill-current scale-110 drop-shadow-[0_0_10px_rgba(255,255,255,0.5)]" : "")} strokeWidth={isActive ? 0 : 2} />
                        </Link>
                    )
                })}
                <button
                    onClick={() => setIsDrawerOpen(true)}
                    className="flex flex-col items-center justify-center w-12 h-full gap-1 transition-all active:scale-90 text-gray-500"
                >
                    <Menu className="w-6 h-6" />
                </button>
            </div>

            {/* --- MOBILE FULL SCREEN MENU OVERLAY --- */}
            {isDrawerOpen && (
                <div className="fixed inset-0 z-[60] bg-black/95 backdrop-blur-xl animate-in fade-in duration-300 lg:hidden flex flex-col p-6 pb-32">
                    <div className="flex justify-between items-center mb-8">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center rotate-3">
                                <Scissors className="w-5 h-5 text-black" />
                            </div>
                            <span className="text-xl font-black italic text-white tracking-tighter">Menu</span>
                        </div>
                        <button onClick={() => setIsDrawerOpen(false)} className="w-12 h-12 bg-[#272727] rounded-full flex items-center justify-center text-white active:scale-90 transition-all border border-white/10">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="grid grid-cols-2 gap-4 overflow-y-auto pb-8 custom-scrollbar">
                        {MENU_ITEMS.map((item) => {
                            const isActive = isItemActive(item.href);
                            return (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setIsDrawerOpen(false)}
                                    className={cn(
                                        "flex flex-col items-center justify-center aspect-square rounded-[32px] gap-4 transition-all active:scale-95 border",
                                        isActive
                                            ? "bg-white text-black border-white shadow-[0_0_30px_rgba(255,255,255,0.2)]"
                                            : "bg-[#1A1A1A] text-gray-400 border-white/5 hover:bg-[#272727] hover:text-white"
                                    )}
                                >
                                    <item.icon className={cn("w-8 h-8", isActive ? "fill-black" : "")} strokeWidth={isActive ? 1.5 : 2} />
                                    <span className="text-[10px] font-black uppercase tracking-widest leading-none text-center">{item.label}</span>
                                </Link>
                            )
                        })}
                        <button className="flex flex-col items-center justify-center aspect-square rounded-[32px] gap-4 transition-all active:scale-95 border border-red-500/20 bg-red-500/10 text-red-500 col-span-2 h-20 flex-row">
                            <LogOut className="w-6 h-6" />
                            <span className="text-xs font-black uppercase tracking-widest">Sign Out</span>
                        </button>
                    </div>
                </div>
            )}

            {/* --- MAIN CONTENT AREA --- */}
            <main className={cn(
                "flex-1 w-full min-h-screen transition-all duration-300",
                "lg:pl-72", // Desktop padding to push content right of sidebar
                "pb-32 lg:pb-0" // Mobile bottom padding for nav
            )}>
                <div className="p-4 sm:p-6 lg:p-10 max-w-[1920px] mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
