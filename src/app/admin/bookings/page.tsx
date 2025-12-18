"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { updateBookingStatus, updateBookingExtraDetails } from "@/lib/db";
import {
    CheckCircle2,
    XCircle,
    Clock,
    ExternalLink,
    Search,
    ChevronRight,
    User,
    Phone,
    Scissors,
    Calendar as CalendarIcon,
    CreditCard,
    Loader2,
    X,
    Filter,
    MoreHorizontal,
    MapPin,
    AlertCircle,
    Save,
    Plus,
    Settings
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- Types ---
interface Booking {
    id: string;
    customerName: string;
    phone: string;
    serviceName: string;
    barberName: string;
    date: string;
    time: string;
    price: number;
    status: "pending" | "confirmed" | "in_progress" | "rejected" | "done" | "cancelled" | "resubmit";
    slipUrl?: string;
    createdAt: any;
    extra_fee?: number;
    extra_note?: string;
    branch?: string;
}

const STATUS_TABS = [
    { id: "all", label: "รายการทั้งหมด" },
    { id: "pending", label: "รอตรวจสอบ" },
    { id: "confirmed", label: "ยืนยันแล้ว" },
    { id: "in_progress", label: "กำลังดำเนินการ" },
    { id: "resubmit", label: "ขอรูปราคาใหม่" },
    { id: "done", label: "สำเร็จแล้ว" },
    { id: "cancelled", label: "ยกเลิก" },
];

export default function BookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedBranch, setSelectedBranch] = useState("all");
    const [selectedDate, setSelectedDate] = useState("");

    // Modal State
    const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [extraFee, setExtraFee] = useState(0);
    const [extraNote, setExtraNote] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isSlipZoomed, setIsSlipZoomed] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Booking[];
            setBookings(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // Update form when selecting a booking
    useEffect(() => {
        if (selectedBooking) {
            setExtraFee(selectedBooking.extra_fee || 0);
            setExtraNote(selectedBooking.extra_note || "");
        }
    }, [selectedBooking]);

    const filteredBookings = bookings.filter(b => {
        const matchesTab = activeTab === "all" || b.status === activeTab;
        const matchesSearch = b.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || b.phone.includes(searchTerm);
        const matchesBranch = selectedBranch === "all" || b.branch === selectedBranch;
        const matchesDate = !selectedDate || b.date === new Date(selectedDate).toLocaleDateString();
        return matchesTab && matchesSearch && matchesBranch && matchesDate;
    });

    const getStatusBadge = (status: Booking["status"]) => {
        switch (status) {
            case "confirmed": return "bg-green-100 text-green-700 border-green-200";
            case "in_progress": return "bg-amber-100 text-amber-700 border-amber-200 animate-pulse";
            case "rejected": return "bg-red-100 text-red-700 border-red-200";
            case "done": return "bg-blue-100 text-blue-700 border-blue-200";
            case "resubmit": return "bg-purple-100 text-purple-700 border-purple-200";
            case "cancelled": return "bg-gray-100 text-gray-500 border-gray-200";
            default: return "bg-amber-100 text-amber-700 border-amber-200";
        }
    };

    const handleQuickStatus = async (id: string, status: Booking["status"]) => {
        try {
            await updateBookingStatus(id, status);
            if (selectedBooking?.id === id) {
                setSelectedBooking({ ...selectedBooking, status });
            }
        } catch (e) {
            alert("Failed to update status");
        }
    };

    const handleSaveExtra = async () => {
        if (!selectedBooking) return;
        setIsSaving(true);
        try {
            await updateBookingExtraDetails(selectedBooking.id, {
                extraFee,
                extraNote,
                status: selectedBooking.status
            });
            setIsModalOpen(false);
        } catch (e) {
            alert("Save failed");
        } finally {
            setIsSaving(false);
        }
    };

    const calculateDeposit = (price: number) => price * 0.2; // 20% Deposit
    const depositAmount = selectedBooking ? calculateDeposit(selectedBooking.price) : 0;
    const totalDue = selectedBooking ? (selectedBooking.price + extraFee) - depositAmount : 0;

    return (
        <div className="p-8 max-w-[1600px] mx-auto">
            <header className="mb-8 flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 mb-2">รายการจองทั้งหมด</h1>
                    <p className="text-gray-500 font-medium">จัดการสถานะและตรวจสอบข้อมูลการเข้าใช้บริการ</p>
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาชื่อหรือเบอร์โทร..."
                            className="pl-12 pr-6 py-3 bg-white border border-gray-200 rounded-2xl w-64 shadow-sm focus:ring-2 focus:ring-black/5 outline-none transition-all"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="date"
                            className="pl-12 pr-6 py-3 bg-white border border-gray-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-black/5 outline-none transition-all text-sm font-bold"
                            value={selectedDate}
                            onChange={e => setSelectedDate(e.target.value)}
                        />
                    </div>
                    <select
                        className="bg-white border border-gray-200 rounded-2xl px-6 py-3 font-bold text-sm shadow-sm outline-none"
                        value={selectedBranch}
                        onChange={e => setSelectedBranch(e.target.value)}
                    >
                        <option value="all">ทุกสาขา (All Branches)</option>
                        <option value="storycut_central">StoryCut - Central</option>
                    </select>
                </div>
            </header>

            {/* Tabs */}
            <div className="flex gap-1 bg-gray-100 p-1.5 rounded-[22px] mb-8 w-fit shadow-inner">
                {STATUS_TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={cn(
                            "px-6 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all",
                            activeTab === tab.id ? "bg-white text-gray-900 shadow-md" : "text-gray-400 hover:text-gray-600"
                        )}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-[40px] border border-gray-100 shadow-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50/50 border-b border-gray-100">
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status / ID</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Customer</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Schedule</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Service & Barber</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">Payment</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr><td colSpan={6} className="py-20 text-center"><Loader2 className="w-10 h-10 animate-spin mx-auto text-gray-200" /></td></tr>
                        ) : filteredBookings.map(b => (
                            <tr
                                key={b.id}
                                onClick={() => { setSelectedBooking(b); setIsModalOpen(true); }}
                                className="group cursor-pointer hover:bg-gray-50/80 transition-colors"
                            >
                                <td className="px-8 py-6">
                                    <div className={cn("inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider mb-2 border", getStatusBadge(b.status))}>
                                        {b.status}
                                    </div>
                                    <div className="text-[10px] font-medium text-gray-400 font-mono">#{b.id.slice(-6).toUpperCase()}</div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="font-bold text-gray-900">{b.customerName}</div>
                                    <div className="text-xs text-gray-500 font-medium">{b.phone}</div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="font-bold text-gray-900">{b.date}</div>
                                    <div className="text-xs text-gray-900 font-black italic">{b.time}</div>
                                </td>
                                <td className="px-8 py-6">
                                    <div className="font-bold flex items-center gap-2 mb-1">
                                        <Scissors className="w-3.5 h-3.5 text-black" />
                                        {b.serviceName}
                                    </div>
                                    <div className="text-xs text-gray-500 font-bold">Barber: {b.barberName}</div>
                                </td>
                                <td className="px-8 py-6">
                                    {b.slipUrl ? (
                                        <div className="w-12 h-16 bg-gray-100 rounded-xl overflow-hidden border border-gray-100 shadow-sm transition-transform group-hover:scale-105">
                                            <img src={b.slipUrl} className="w-full h-full object-cover" />
                                        </div>
                                    ) : (
                                        <div className="w-12 h-16 bg-gray-50 border border-dashed border-gray-200 rounded-xl flex items-center justify-center">
                                            <XCircle className="w-5 h-5 text-gray-200" />
                                        </div>
                                    )}
                                </td>
                                <td className="px-8 py-6 text-right">
                                    <button className="w-10 h-10 rounded-full hover:bg-white hover:shadow-md border border-transparent hover:border-gray-100 transition-all flex items-center justify-center">
                                        <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-black transition-colors" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Advanced Detail Modal */}
            {isModalOpen && selectedBooking && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 sm:p-12">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />

                    <div className="relative w-full max-w-5xl bg-white rounded-[48px] shadow-2xl overflow-hidden flex flex-col max-h-full animate-in zoom-in-95 duration-300">
                        {/* Header */}
                        <div className="px-10 py-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center gap-4">
                                <div className={cn("px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border shadow-sm", getStatusBadge(selectedBooking.status))}>
                                    {selectedBooking.status}
                                </div>
                                <h2 className="text-2xl font-black italic">Booking Details</h2>
                                <span className="text-xs font-mono text-gray-400">ID: {selectedBooking.id}</span>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 active:scale-90 transition-all border border-gray-100"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

                                {/* Left Column: Info & Slip */}
                                <div className="space-y-10">
                                    <section>
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                            <User className="w-3.5 h-3.5" /> Customer Identity
                                        </h3>
                                        <div className="grid grid-cols-2 gap-6 bg-gray-50 p-6 rounded-[32px] border border-gray-100">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Full Name</p>
                                                <p className="font-bold text-lg">{selectedBooking.customerName}</p>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Phone Number</p>
                                                <p className="font-bold text-lg">{selectedBooking.phone}</p>
                                            </div>
                                            <div className="col-span-2 pt-4 border-t border-gray-200/50">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Schedule</p>
                                                        <p className="font-black text-xl italic">{selectedBooking.date} • {selectedBooking.time}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Barber</p>
                                                        <p className="font-bold text-lg">{selectedBooking.barberName}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </section>

                                    <section>
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                            <CreditCard className="w-3.5 h-3.5" /> Deposit Verification
                                        </h3>
                                        <div className="relative group/slip">
                                            {selectedBooking.slipUrl ? (
                                                <div
                                                    className="bg-gray-100 rounded-[40px] overflow-hidden border-4 border-white shadow-xl cursor-zoom-in group"
                                                    onClick={() => setIsSlipZoomed(true)}
                                                >
                                                    <img src={selectedBooking.slipUrl} className="w-full h-auto" />
                                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                        <Search className="w-10 h-10 text-white" />
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-gray-50 border-4 border-dashed border-gray-200 rounded-[40px] py-20 flex flex-col items-center justify-center">
                                                    <AlertCircle className="w-12 h-12 text-gray-300 mb-4" />
                                                    <p className="font-bold text-gray-400 uppercase tracking-widest text-xs">No Payment Slip Uploaded</p>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>

                                {/* Right Column: Actions & Extra */}
                                <div className="space-y-10">
                                    <section>
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                                            <Settings className="w-3.5 h-3.5" /> Status Controls
                                        </h3>
                                        <div className="grid grid-cols-2 gap-3">
                                            <button
                                                onClick={() => handleQuickStatus(selectedBooking.id, "confirmed")}
                                                className={cn(
                                                    "py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                                    selectedBooking.status === "confirmed" ? "bg-green-600 text-white shadow-lg" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                                )}
                                            >
                                                <CheckCircle2 className="w-4 h-4" /> Approve
                                            </button>
                                            <button
                                                onClick={() => handleQuickStatus(selectedBooking.id, "resubmit")}
                                                className={cn(
                                                    "py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2",
                                                    selectedBooking.status === "resubmit" ? "bg-purple-600 text-white shadow-lg" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                                )}
                                            >
                                                <AlertCircle className="w-4 h-4" /> Resubmit Slip
                                            </button>
                                            <button
                                                onClick={() => handleQuickStatus(selectedBooking.id, "done")}
                                                className={cn(
                                                    "py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 col-span-2",
                                                    selectedBooking.status === "done" ? "bg-blue-600 text-white shadow-lg" : "bg-black text-white hover:bg-gray-800"
                                                )}
                                            >
                                                <CheckCircle2 className="w-4 h-4" /> Mark as Done
                                            </button>
                                            <button
                                                onClick={() => handleQuickStatus(selectedBooking.id, "cancelled")}
                                                className="py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest transition-all bg-red-50 text-red-500 hover:bg-red-100 col-span-2 mt-2"
                                            >
                                                <XCircle className="w-4 h-4" /> Cancel Booking
                                            </button>
                                        </div>
                                    </section>

                                    {(["confirmed", "done", "resubmit"].includes(selectedBooking.status)) && (
                                        <section className="bg-zinc-900 rounded-[40px] p-8 text-white space-y-8 shadow-2xl relative overflow-hidden">
                                            <div className="relative z-10">
                                                <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-6">In-Shop Billing Adjustment</h3>

                                                <div className="space-y-4">
                                                    <div>
                                                        <label className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2 block">Extra Techniques / Note</label>
                                                        <input
                                                            type="text"
                                                            value={extraNote}
                                                            onChange={e => setExtraNote(e.target.value)}
                                                            placeholder="e.g. ผมยาวพิเศษ / ย้อมสีเพิ่ม"
                                                            className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-sm font-bold focus:bg-white/10 focus:border-white/30 outline-none transition-all"
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-6 pb-4 border-b border-white/10">
                                                        <div>
                                                            <label className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2 block">Service Price</label>
                                                            <div className="text-xl font-bold">฿{selectedBooking.price}</div>
                                                        </div>
                                                        <div>
                                                            <label className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2 block text-red-400">Deposit Paid</label>
                                                            <div className="text-xl font-bold text-red-400">- ฿{depositAmount}</div>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-6">
                                                        <div className="col-span-2">
                                                            <label className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-2 block">Extra Fee (฿)</label>
                                                            <input
                                                                type="number"
                                                                value={extraFee}
                                                                onChange={e => setExtraFee(Number(e.target.value))}
                                                                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-xl font-black italic focus:bg-white/10 focus:border-white/30 outline-none transition-all"
                                                            />
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="h-px bg-white/10 my-8" />

                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <div className="text-[9px] font-black text-green-400 uppercase tracking-widest mb-1">Total Due at Shop</div>
                                                        <div className="text-4xl font-black italic text-green-400">฿{totalDue.toLocaleString()}</div>
                                                        <div className="text-[8px] text-white/40 mt-1 uppercase font-black tracking-widest">(Price + Extra) - Deposit</div>
                                                    </div>
                                                    <button
                                                        onClick={handleSaveExtra}
                                                        disabled={isSaving}
                                                        className="bg-white text-black px-8 py-4 rounded-3xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-200 transition-all flex items-center gap-2 active:scale-95"
                                                    >
                                                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                        Update Session
                                                    </button>
                                                </div>
                                            </div>
                                        </section>
                                    )}
                                </div>

                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Fullslip Zoom */}
            {isSlipZoomed && selectedBooking?.slipUrl && (
                <div className="fixed inset-0 z-[70] bg-black/98 flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <button onClick={() => setIsSlipZoomed(false)} className="absolute top-8 right-8 w-14 h-14 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-all">
                        <X className="w-8 h-8 text-white" />
                    </button>
                    <img src={selectedBooking.slipUrl} className="max-w-full max-h-[90vh] rounded-2xl shadow-2xl border-2 border-white/10" />
                </div>
            )}

        </div>
    );
}
