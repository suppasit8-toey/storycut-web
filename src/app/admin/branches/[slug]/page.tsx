"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { formatDateDDMMYYYY, parseDDMMYYYY } from "@/utils/dateUtils";

export default function BranchDetailPage() {
    const { slug } = useParams();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Data State
    const [formData, setFormData] = useState({
        name: "",
        locationLink: "",
        adminPhone: "",
        openTime: "",
        closeTime: "",
        bankName: "",
        accountNumber: "",
        accountName: "",
    });

    const [holidays, setHolidays] = useState<{ date: string }[]>([]); // Using object for future proofing/consistency
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
                    adminPhone: data.adminPhone || "",
                    openTime: data.openTime || "",
                    closeTime: data.closeTime || "",
                    bankName: data.bankName || "",
                    accountNumber: data.accountNumber || "",
                    accountName: data.accountName || "",
                });
                setHolidays(data.holidays || []);
            } else {
                // Handle 404
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

        // Convert date picker format (YYYY-MM-DD) to DD/MM/YYYY for consistency with app standards
        // Or keep YYYY-MM-DD for storage? Utils seem to prefer DD/MM/YYYY. 
        // Let's standardize to DD/MM/YYYY for storage/display as per utils.
        // Date picker gives YYYY-MM-DD.

        // Parse input date (YYYY-MM-DD)
        const [y, m, d] = newHolidayDate.split("-");
        const formattedDate = `${d}/${m}/${y}`; // DD/MM/YYYY

        // Check if already exists
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
        <div className="min-h-screen bg-black text-white p-6 md:p-10 pb-20">
            <div className="max-w-4xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <button onClick={() => router.push("/admin/branches")} className="text-gray-400 hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
                        </svg>
                    </button>
                    <h1 className="text-3xl font-bold tracking-tight">{formData.name || slug}</h1>
                </div>

                <form onSubmit={handleSaveSettings} className="space-y-8">
                    {/* Section 1: General Info */}
                    <section className="bg-[#1A1A1A] rounded-[32px] p-8 border border-transparent">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-white"></span>
                            General Info
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-400 mb-2">Branch Name</label>
                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
                                />
                            </div>
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-400 mb-2">Location Link (Google Maps)</label>
                                <input
                                    type="url"
                                    name="locationLink"
                                    value={formData.locationLink}
                                    onChange={handleChange}
                                    placeholder="https://maps.google.com/..."
                                    className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Admin Phone</label>
                                <input
                                    type="tel"
                                    name="adminPhone"
                                    value={formData.adminPhone}
                                    onChange={handleChange}
                                    placeholder="0812345678"
                                    className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Open Time</label>
                                    <input
                                        type="time"
                                        name="openTime"
                                        value={formData.openTime}
                                        onChange={handleChange}
                                        className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-2">Close Time</label>
                                    <input
                                        type="time"
                                        name="closeTime"
                                        value={formData.closeTime}
                                        onChange={handleChange}
                                        className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
                                    />
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Section 2: Financial Config */}
                    <section className="bg-[#1A1A1A] rounded-[32px] p-8 border border-transparent">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-white"></span>
                            Financial Config
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-400 mb-2">Bank Name</label>
                                <input
                                    type="text"
                                    name="bankName"
                                    value={formData.bankName}
                                    onChange={handleChange}
                                    placeholder="KBank, SCB, etc."
                                    className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Account Number</label>
                                <input
                                    type="text"
                                    name="accountNumber"
                                    value={formData.accountNumber}
                                    onChange={handleChange}
                                    className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Account Name</label>
                                <input
                                    type="text"
                                    name="accountName"
                                    value={formData.accountName}
                                    onChange={handleChange}
                                    className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
                                />
                            </div>
                        </div>
                    </section>

                    {/* Save Button for Sections 1 & 2 */}
                    <div className="flex justify-end sticky bottom-6 z-10">
                        <button
                            type="submit"
                            disabled={saving}
                            className="bg-white text-black px-8 py-4 rounded-full font-bold text-lg shadow-xl hover:bg-gray-200 transition-all disabled:opacity-50"
                        >
                            {saving ? "Saving..." : "Save Settings"}
                        </button>
                    </div>
                </form>

                {/* Section 3: Branch Holidays */}
                <section className="bg-[#1A1A1A] rounded-[32px] p-8 border border-transparent">
                    <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-white"></span>
                        Branch Holidays
                    </h2>
                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 w-full">
                                <label className="block text-sm font-medium text-gray-400 mb-2">Select Date</label>
                                <input
                                    type="date"
                                    value={newHolidayDate}
                                    onChange={(e) => setNewHolidayDate(e.target.value)}
                                    className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors [color-scheme:dark]"
                                />
                            </div>
                            <button
                                type="button"
                                onClick={handleAddHoliday}
                                disabled={!newHolidayDate}
                                className="w-full md:w-auto bg-white/10 text-white border border-white/20 px-6 py-3 rounded-lg font-medium hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                            >
                                Add Holiday
                            </button>
                        </div>

                        <div className="mt-8">
                            <h3 className="text-sm font-medium text-gray-400 mb-4 uppercase tracking-wider">Upcoming Holidays</h3>
                            {holidays.length === 0 ? (
                                <p className="text-gray-600 italic">No holidays added.</p>
                            ) : (
                                <div className="grid gap-3">
                                    {holidays
                                        .sort((a, b) => {
                                            // dd/mm/yyyy sort
                                            const [d1, m1, y1] = a.date.split("/").map(Number);
                                            const [d2, m2, y2] = b.date.split("/").map(Number);
                                            return new Date(y1, m1 - 1, d1).getTime() - new Date(y2, m2 - 1, d2).getTime();
                                        })
                                        .map((holiday, idx) => (
                                            <div key={idx} className="flex justify-between items-center bg-black p-4 rounded-xl border border-gray-800 group hover:border-gray-700 transition-colors">
                                                <span className="font-mono text-lg">{holiday.date}</span>
                                                <button
                                                    onClick={() => handleDeleteHoliday(holiday)}
                                                    className="text-gray-500 hover:text-red-400 transition-colors p-2"
                                                    title="Delete Holiday"
                                                >
                                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                                        <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                </div>
                            )}
                        </div>
                    </div>
                </section>

            </div>
        </div>
    );
}
