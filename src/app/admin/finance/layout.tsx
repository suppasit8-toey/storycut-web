"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { LayoutDashboard, Wallet, Receipt, Calculator } from "lucide-react";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

const NAV_ITEMS = [
    { label: "Dashboard", href: "/admin/finance", icon: LayoutDashboard },
    { label: "Fixed Cost", href: "/admin/finance/fixedcost", icon: Wallet },
    { label: "Commission", href: "/admin/finance/commission", icon: Calculator },
    { label: "Accounts", href: "/admin/finance/accounts", icon: Receipt },
];

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-4xl font-black italic tracking-tighter text-white mb-2 font-inter uppercase">FINANCE</h1>
                    <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">FINANCIAL CONTROL CENTER</p>
                </div>
            </div>

            {/* Sub-Navigation */}
            <nav className="flex flex-wrap gap-2 md:gap-4 bg-[#1A1A1A] p-2 rounded-[24px] border border-white/5 w-fit">
                {NAV_ITEMS.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                "flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all uppercase tracking-wide",
                                isActive
                                    ? "bg-white text-black shadow-lg shadow-white/10"
                                    : "text-gray-500 hover:text-white hover:bg-white/5"
                            )}
                        >
                            <item.icon className={cn("w-4 h-4", isActive ? "text-black" : "text-gray-500 group-hover:text-white")} />
                            {item.label}
                        </Link>
                    )
                })}
            </nav>

            {/* Content */}
            <div>
                {children}
            </div>
        </div>
    );
}
