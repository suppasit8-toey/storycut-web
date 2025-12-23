"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDateDDMMYYYY, parseDDMMYYYY } from "@/utils/dateUtils";
import { ArrowLeft, Trash2, Camera, Image as ImageIcon, QrCode } from "lucide-react";
import { CldUploadWidget } from 'next-cloudinary';

export default function BranchDetailPage() {
    const { slug } = useParams();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Data State
    const [formData, setFormData] = useState({
        name: "",
        locationLink: "",
        lineContactLink: "", // Added Field
        adminPhone: "",
        openTime: "",
        closeTime: "",
        bankName: "",
        accountNumber: "",
        accountName: "",
        // Logos
        logoSquareUrl: "",
        logoHorizontalBlackUrl: "",
        logoHorizontalWhiteUrl: "",
        // QR
        paymentQrUrl: "",
    });

    const [holidays, setHolidays] = useState<{ date: string }[]>([]);
    const [newHolidayDate, setNewHolidayDate] = useState("");

    const branchRef = doc(db, "branches", slug as string);

    useEffect(() => {
        if (slug) fetchBranchData();
    }, [slug]);

    const fetchBranchData = async () => {
        setLoading(true);
        try {
            const docSnap = await getDoc(branchRef);
            if (docSnap.exists()) {
                const data = docSnap.data();
                setFormData({
                    name: data.name || "",
                    locationLink: data.locationLink || "",
                    lineContactLink: data.lineContactLink || "", // Load It
                    adminPhone: data.adminPhone || "",
                    openTime: data.openTime || "",
                    closeTime: data.closeTime || "",
                    bankName: data.bankName || "",
                    accountNumber: data.accountNumber || "",
                    accountName: data.accountName || "",
                    logoSquareUrl: data.logoSquareUrl || "",
                    logoHorizontalBlackUrl: data.logoHorizontalBlackUrl || "",
                    logoHorizontalWhiteUrl: data.logoHorizontalWhiteUrl || "",
                    paymentQrUrl: data.paymentQrUrl || "",
                });
                setHolidays(data.holidays || []);
            } else {
                console.error("Branch not found");
                router.push("/admin/branches");
            }
        } catch (error) {
            console.error("Error fetching branch:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await updateDoc(branchRef, {
                ...formData
            });
            alert("Settings saved successfully!");
        } catch (error) {
            console.error("Error saving settings:", error);
            alert("Failed to save settings.");
        } finally {
            setSaving(false);
        }
    };

    const handleAddHoliday = async () => {
        if (!newHolidayDate) return;

        const [y, m, d] = newHolidayDate.split("-");
        const formattedDate = `${d}/${m}/${y}`; // DD/MM/YYYY

        if (holidays.some(h => h.date === formattedDate)) {
            alert("Holiday already exists for this date.");
            return;
        }

        const newHoliday = { date: formattedDate };

        try {
            await updateDoc(branchRef, {
                holidays: arrayUnion(newHoliday)
            });
            setHolidays(prev => [...prev, newHoliday]);
            setNewHolidayDate("");
        } catch (error) {
            console.error("Error adding holiday:", error);
            alert("Failed to add holiday.");
        }
    };

    const handleDeleteHoliday = async (holidayToDelete: { date: string }) => {
        if (!confirm(`Delete holiday on ${holidayToDelete.date}?`)) return;

        try {
            await updateDoc(branchRef, {
                holidays: arrayRemove(holidayToDelete)
            });
            setHolidays(prev => prev.filter(h => h.date !== holidayToDelete.date));
        } catch (error) {
            console.error("Error deleting holiday:", error);
            alert("Failed to delete holiday.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-10 pb-32">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center gap-4 mb-4">
                    <button onClick={() => router.push("/admin/branches")} className="w-10 h-10 flex items-center justify-center rounded-full bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-black italic tracking-tighter text-white uppercase font-inter">{formData.name || slug}</h1>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Branch Configuration</p>
                    </div>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Section 1: General Info */}
                    <section className="bg-[#1A1A1A] rounded-[32px] p-8 border border-white/5 shadow-2xl">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_white]"></span>
                            General Info
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Branch Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-all"
                                />
                            </div>

                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Location Link (Google Maps)</label>
                                <input
                                    type="url"
                                    name="locationLink"
                                    value={formData.locationLink}
                                    onChange={handleChange}
                                    placeholder="https://maps.google.com/..."
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-all"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Line@ Link (Official Account)</label>
                                <input
                                    type="url"
                                    name="lineContactLink"
                                    value={formData.lineContactLink}
                                    onChange={handleChange}
                                    placeholder="https://line.me/ti/p/@storycut"
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Admin Phone</label>
                                <input
                                    type="tel"
                                    name="adminPhone"
                                    value={formData.adminPhone}
                                    onChange={handleChange}
                                    placeholder="0812345678"
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-all"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Open Time</label>
                                    <input
                                        type="time"
                                        name="openTime"
                                        value={formData.openTime}
                                        onChange={handleChange}
                                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Close Time</label>
                                    <input
                                        type="time"
                                        name="closeTime"
                                        value={formData.closeTime}
                                        onChange={handleChange}
                                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-all"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section: Brand Assets */}
                    <section className="bg-[#1A1A1A] rounded-[32px] p-8 border border-white/5 shadow-2xl">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_white]"></span>
                            Brand Assets
                        </h2>
                        <div className="space-y-4">
                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Logos</label>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* 1:1 Square Logo */}
                                <div className="flex flex-col gap-2 items-center">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Logo 1:1 (Square)</span>
                                    <CldUploadWidget
                                        uploadPreset="storycut_uploads"
                                        onSuccess={(result: any) => {
                                            if (result.info?.secure_url) {
                                                setFormData(prev => ({ ...prev, logoSquareUrl: result.info.secure_url }));
                                            }
                                        }}
                                    >
                                        {({ open }) => (
                                            <div
                                                onClick={() => open()}
                                                className="cursor-pointer group relative w-32 h-32 rounded-[32px] overflow-hidden border-2 border-dashed border-white/10 hover:border-white/40 transition-all bg-black"
                                            >
                                                {formData.logoSquareUrl ? (
                                                    <img src={formData.logoSquareUrl} className="w-full h-full object-cover" alt="Square Logo" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-600 group-hover:text-gray-400">
                                                        <ImageIcon className="w-8 h-8" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </CldUploadWidget>
                                </div>

                                {/* 10:3 Black Text */}
                                <div className="flex flex-col gap-2 items-center">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Horizontal (Black Text)</span>
                                    <CldUploadWidget
                                        uploadPreset="storycut_uploads"
                                        onSuccess={(result: any) => {
                                            if (result.info?.secure_url) {
                                                setFormData(prev => ({ ...prev, logoHorizontalBlackUrl: result.info.secure_url }));
                                            }
                                        }}
                                    >
                                        {({ open }) => (
                                            <div
                                                onClick={() => open()}
                                                className="cursor-pointer group relative w-full h-32 md:w-48 md:h-24 rounded-[32px] overflow-hidden border-2 border-dashed border-white/10 hover:border-white/40 transition-all bg-white"
                                            >
                                                {formData.logoHorizontalBlackUrl ? (
                                                    <img src={formData.logoHorizontalBlackUrl} className="w-full h-full object-contain p-2" alt="Black Text Logo" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-300 group-hover:text-gray-400">
                                                        <ImageIcon className="w-8 h-8" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </CldUploadWidget>
                                </div>

                                {/* 10:3 White Text */}
                                <div className="flex flex-col gap-2 items-center">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Horizontal (White Text)</span>
                                    <CldUploadWidget
                                        uploadPreset="storycut_uploads"
                                        onSuccess={(result: any) => {
                                            if (result.info?.secure_url) {
                                                setFormData(prev => ({ ...prev, logoHorizontalWhiteUrl: result.info.secure_url }));
                                            }
                                        }}
                                    >
                                        {({ open }) => (
                                            <div
                                                onClick={() => open()}
                                                className="cursor-pointer group relative w-full h-32 md:w-48 md:h-24 rounded-[32px] overflow-hidden border-2 border-dashed border-white/10 hover:border-white/40 transition-all bg-black"
                                            >
                                                {formData.logoHorizontalWhiteUrl ? (
                                                    <img src={formData.logoHorizontalWhiteUrl} className="w-full h-full object-contain p-2" alt="White Text Logo" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-600 group-hover:text-gray-400">
                                                        <ImageIcon className="w-8 h-8" />
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </CldUploadWidget>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Financial Config */}
                    <section className="bg-[#1A1A1A] rounded-[32px] p-8 border border-white/5 shadow-2xl">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_white]"></span>
                            Financial Config
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Bank Name</label>
                                <input
                                    type="text"
                                    name="bankName"
                                    value={formData.bankName}
                                    onChange={handleChange}
                                    placeholder="KBank, SCB, etc."
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Account Number</label>
                                <input
                                    type="text"
                                    name="accountNumber"
                                    value={formData.accountNumber}
                                    onChange={handleChange}
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Account Name</label>
                                <input
                                    type="text"
                                    name="accountName"
                                    value={formData.accountName}
                                    onChange={handleChange}
                                    className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-all"
                                />
                            </div>
                        </div>

                        <div className="mt-8 pt-8 border-t border-white/5">
                            <h3 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-widest">Payment Methods</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                <div>
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-4">Bank Transfer QR Code</label>
                                    <CldUploadWidget
                                        uploadPreset="storycut_uploads"
                                        onSuccess={(result: any) => {
                                            if (result.info?.secure_url) {
                                                setFormData(prev => ({ ...prev, paymentQrUrl: result.info.secure_url }));
                                            }
                                        }}
                                    >
                                        {({ open }) => (
                                            <div
                                                onClick={() => open()}
                                                className="cursor-pointer group relative w-48 h-48 rounded-[32px] overflow-hidden border-2 border-dashed border-white/10 hover:border-white/40 transition-all bg-black mx-auto md:mx-0"
                                            >
                                                {formData.paymentQrUrl ? (
                                                    <img src={formData.paymentQrUrl} className="w-full h-full object-cover" alt="Payment QR" />
                                                ) : (
                                                    <div className="w-full h-full flex flex-col items-center justify-center text-gray-600 group-hover:text-gray-400 gap-2">
                                                        <QrCode className="w-8 h-8" />
                                                        <span className="text-[10px] uppercase font-bold">Upload QR</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </CldUploadWidget>
                                    <p className="mt-2 text-[10px] text-gray-600 uppercase text-center md:text-left">
                                        Displayed during checkout
                                    </p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 3: Branch Holidays */}
                    <section className="bg-[#1A1A1A] rounded-[32px] p-8 border border-white/5 shadow-2xl">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <span className="w-3 h-3 rounded-full bg-white shadow-[0_0_10px_white]"></span>
                            Branch Holidays
                        </h2>
                        <div className="space-y-6">
                            <div className="flex flex-col md:flex-row gap-4 items-end">
                                <div className="flex-1 w-full">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Select Date</label>
                                    <input
                                        type="date"
                                        value={newHolidayDate}
                                        onChange={(e) => setNewHolidayDate(e.target.value)}
                                        className="w-full bg-black border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder-gray-600 focus:outline-none focus:border-white/40 transition-all [color-scheme:dark]"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddHoliday}
                                    disabled={!newHolidayDate}
                                    className="w-full md:w-auto bg-white/10 text-white border border-white/20 px-8 py-3.5 rounded-xl font-bold hover:bg-white/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                                >
                                    Add Holiday
                                </button>
                            </div>

                            <div className="mt-8">
                                <h3 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-widest">Upcoming Holidays</h3>
                                {holidays.length === 0 ? (
                                    <div className="p-8 text-center text-gray-600 border border-white/5 rounded-2xl border-dashed">No holidays added.</div>
                                ) : (
                                    <div className="grid gap-3">
                                        {holidays
                                            .sort((a, b) => {
                                                const [d1, m1, y1] = a.date.split("/").map(Number);
                                                const [d2, m2, y2] = b.date.split("/").map(Number);
                                                return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
                                            })
                                            .map((holiday, idx) => (
                                                <div key={idx} className="flex justify-between items-center bg-black p-4 rounded-xl border border-white/10 group hover:border-white/30 transition-all">
                                                    <span className="font-mono text-lg font-bold tracking-tight">{holiday.date}</span>
                                                    <button
                                                        onClick={() => handleDeleteHoliday(holiday)}
                                                        className="text-gray-500 hover:text-red-500 hover:bg-red-500/10 transition-all p-2 rounded-lg"
                                                        title="Delete Holiday"
                                                    >
                                                        <Trash2 className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </section>

                    {/* Floating Save Button */}
                    <div className="fixed bottom-6 right-6 md:absolute md:bottom-auto md:right-auto md:relative flex justify-end z-20">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-white text-black px-8 py-4 rounded-full font-black text-lg shadow-2xl hover:scale-105 active:scale-95 transition-all disabled:opacity-70 disabled:scale-100"
                        >
                            {saving ? "Saving..." : "Save Changes"}
                        </button>
                    </div>
                </form>

            </div>
        </div>
    );
}
