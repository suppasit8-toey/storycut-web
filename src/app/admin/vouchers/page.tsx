"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";
import { Search, Loader2, Plus, Trash2, Tag } from "lucide-react";

interface Voucher {
    id: string;
    code: string;
    discount: number; // Amount in THB
    type: "fixed" | "percent";
    active: boolean;
}

export default function VouchersPage() {
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ code: "", discount: "", type: "fixed" });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "vouchers"), orderBy("date_created", "desc")); // Assuming date_created or just fetch all
        // Fallback for sorting if field missing
        const unsub = onSnapshot(collection(db, "vouchers"), (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Voucher));
            setVouchers(data);
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreating(true);
        try {
            await addDoc(collection(db, "vouchers"), {
                code: formData.code.toUpperCase(),
                discount: Number(formData.discount),
                type: formData.type,
                active: true,
                date_created: new Date().toISOString()
            });
            setIsModalOpen(false);
            setFormData({ code: "", discount: "", type: "fixed" });
        } catch (error) {
            console.error(error);
            alert("Failed to create voucher");
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Delete this voucher?")) return;
        try {
            await deleteDoc(doc(db, "vouchers", id));
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-10 pb-20 font-sans animate-in fade-in duration-500">
            <div className="max-w-[1600px] mx-auto">
                <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-3xl font-black italic tracking-tighter text-white mb-2 font-inter">Vouchers</h1>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Manage Promo Codes</p>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-white text-black px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest hover:bg-gray-200 hover:scale-105 transition-all flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> New Voucher
                    </button>
                </header>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-white opacity-50" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {vouchers.length === 0 ? (
                            <div className="col-span-full bg-[#1A1A1A] rounded-[32px] p-20 text-center border border-white/5 opacity-50">
                                <p className="text-gray-500 font-bold uppercase tracking-widest">No vouchers yet</p>
                            </div>
                        ) : (
                            vouchers.map((voucher) => (
                                <div key={voucher.id} className="bg-[#1A1A1A] rounded-[32px] p-8 flex flex-col gap-6 border border-white/5 hover:border-white/20 transition-all group relative">
                                    <div className="flex justify-between items-start">
                                        <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10">
                                            <span className="text-xl font-black text-white tracking-widest uppercase font-mono">{voucher.code}</span>
                                        </div>
                                        <button onClick={() => handleDelete(voucher.id)} className="text-gray-600 hover:text-red-500 transition-colors">
                                            <Trash2 className="w-5 h-5" />
                                        </button>
                                    </div>

                                    <div>
                                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Discount Value</div>
                                        <div className="text-4xl font-black text-white italic tracking-tighter">
                                            {voucher.type === 'fixed' ? `฿${voucher.discount}` : `${voucher.discount}%`}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-white/5 flex justify-between items-center text-xs font-bold text-gray-400 uppercase tracking-wider">
                                        <span>Status</span>
                                        <span className={voucher.active ? "text-green-500" : "text-red-500"}>{voucher.active ? "Active" : "Inactive"}</span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-[#1A1A1A] w-full max-w-md rounded-[40px] border border-white/10 shadow-2xl overflow-hidden p-8">
                            <h2 className="text-2xl font-black italic text-white mb-6 uppercase tracking-tight">Create Voucher</h2>
                            <form onSubmit={handleCreate} className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Code</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-lg font-black text-white placeholder-gray-700 outline-none focus:border-white/30 transition-all uppercase font-mono tracking-wider"
                                        placeholder="CODE2024"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Discount Amount</label>
                                        <input
                                            type="number"
                                            value={formData.discount}
                                            onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                                            className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-lg font-black text-white placeholder-gray-700 outline-none focus:border-white/30 transition-all"
                                            placeholder="100"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Type</label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                                            className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-lg font-bold text-white outline-none focus:border-white/30 transition-all appearance-none"
                                        >
                                            <option value="fixed">Fixed (฿)</option>
                                            <option value="percent">Percent (%)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-4 mt-8 pt-4">
                                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest text-gray-500 hover:bg-white/5 transition-all">
                                        Cancel
                                    </button>
                                    <button type="submit" disabled={creating} className="flex-1 bg-white text-black py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-200 transition-all">
                                        {creating ? "Creating..." : "Create"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
