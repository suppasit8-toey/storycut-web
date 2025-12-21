"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc } from "firebase/firestore";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface Voucher {
    id: string;
    code: string;
    discount: number; // Amount in THB or Percentage
    type: "fixed" | "percent";
    active: boolean;
    expiryDate?: string;
}

export default function VoucherPage() {
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ code: "", discount: "", type: "fixed", expiryDate: "" });
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "vouchers"), orderBy("date_created", "desc"));
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
                expiryDate: formData.expiryDate,
                active: true,
                date_created: new Date().toISOString()
            });
            setIsModalOpen(false);
            setFormData({ code: "", discount: "", type: "fixed", expiryDate: "" });
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
            console.error("Error deleting voucher:", error);
        }
    };

    const toggleStatus = async (voucher: Voucher) => {
        try {
            // In a real app, updateDoc would optionally go here
            // await updateDoc(doc(db, "vouchers", voucher.id), { active: !voucher.active });
            // For now, functionality assumed similar to create/delete primarily
            console.log("Toggle status for", voucher.id);
        } catch (error) {
            console.error(error);
        }
    }

    return (
        <div className="min-h-screen bg-black text-white font-sans animate-in fade-in duration-500">
            <div className="max-w-[1600px] mx-auto">
                <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-4xl font-extrabold italic tracking-tighter text-white mb-2 font-inter">Voucher</h1>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">PROMOTION & DISCOUNT CONTROL</p>
                    </div>

                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="bg-white text-black px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest hover:bg-gray-200 hover:scale-105 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.2)]"
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
                                <p className="text-gray-500 font-bold uppercase tracking-widest">No vouchers active</p>
                            </div>
                        ) : (
                            vouchers.map((voucher) => (
                                <div key={voucher.id} className="bg-[#1A1A1A] rounded-[32px] p-8 flex flex-col justify-between gap-6 border border-white/5 hover:border-white/20 transition-all group relative hover:shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
                                    <div className="flex justify-between items-start">
                                        <div className="bg-white/10 px-4 py-2 rounded-xl border border-white/10 backdrop-blur-md">
                                            <span className="text-xl font-bold text-white tracking-widest uppercase font-mono">{voucher.code}</span>
                                        </div>
                                        <button onClick={() => handleDelete(voucher.id)} className="text-gray-600 hover:text-red-500 transition-colors bg-white/5 p-2 rounded-full hover:bg-white/10">
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <div>
                                        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Discount Value</div>
                                        <div className="text-5xl font-bold text-white italic tracking-tighter">
                                            {voucher.type === 'fixed' ? `฿${voucher.discount}` : `${voucher.discount}%`}
                                        </div>
                                    </div>

                                    <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</span>
                                            <span className={voucher.active ? "text-green-500 font-bold text-xs uppercase" : "text-red-500 font-bold text-xs uppercase"}>
                                                {voucher.active ? "Active" : "Expired"}
                                            </span>
                                        </div>
                                        {voucher.expiryDate && (
                                            <div className="text-right">
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider block">Expires</span>
                                                <span className="text-xs font-bold text-white">{new Date(voucher.expiryDate).toLocaleDateString('th-TH')}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}

                {/* Create Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
                        <div className="bg-[#1A1A1A] w-full max-w-md rounded-[32px] border border-white/10 shadow-2xl overflow-hidden p-8 relative">
                            <h2 className="text-2xl font-black italic text-white mb-6 uppercase tracking-tight">Add New Voucher</h2>
                            <form onSubmit={handleCreate} className="space-y-6">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Voucher Code</label>
                                    <input
                                        type="text"
                                        value={formData.code}
                                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                        className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-lg font-bold text-white placeholder-gray-700 outline-none focus:border-white/30 transition-all uppercase font-mono tracking-wider"
                                        placeholder="SALE2025"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Discount</label>
                                        <input
                                            type="number"
                                            value={formData.discount}
                                            onChange={(e) => setFormData({ ...formData, discount: e.target.value })}
                                            className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-lg font-bold text-white placeholder-gray-700 outline-none focus:border-white/30 transition-all"
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

                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2 block">Expiry Date</label>
                                    <input
                                        type="date"
                                        value={formData.expiryDate}
                                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                        className="w-full bg-black border border-white/10 rounded-2xl px-6 py-4 text-sm font-bold text-white placeholder-gray-700 outline-none focus:border-white/30 transition-all"
                                    />
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
