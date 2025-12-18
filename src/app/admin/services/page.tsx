"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { addService, updateService, deleteService } from "@/lib/db";
import {
    Plus,
    Search,
    Settings,
    Edit3,
    Trash2,
    Clock,
    DollarSign,
    CheckCircle2,
    X,
    Loader2,
    AlertTriangle
} from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface Service {
    id: string;
    name_th: string;
    name_en: string;
    duration_min: number;
    deposit_amount: number;
    base_price: number;
    price_promo?: number | null;
}

export default function ServicesPage() {
    const [services, setServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingService, setEditingService] = useState<Service | null>(null);
    const [formData, setFormData] = useState({
        name_th: "",
        name_en: "",
        duration_min: 60,
        deposit_amount: 100,
        base_price: 500,
        price_promo: "" as string | number
    });
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "services"), orderBy("name_th", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Service[];
            setServices(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleOpenModal = (service?: Service) => {
        if (service) {
            setEditingService(service);
            setFormData({
                name_th: service.name_th,
                name_en: service.name_en,
                duration_min: service.duration_min,
                deposit_amount: service.deposit_amount,
                base_price: service.base_price,
                price_promo: service.price_promo ?? ""
            });
        } else {
            setEditingService(null);
            setFormData({
                name_th: "",
                name_en: "",
                duration_min: 60,
                deposit_amount: 100,
                base_price: 500,
                price_promo: ""
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const dataToSave = {
                ...formData,
                price_promo: formData.price_promo === "" ? null : Number(formData.price_promo)
            };

            if (editingService) {
                await updateService(editingService.id, dataToSave);
            } else {
                await addService(dataToSave);
            }
            setIsModalOpen(false);
        } catch (error) {
            alert("Failed to save service");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this service?")) {
            try {
                await deleteService(id);
            } catch (error) {
                alert("Failed to delete service");
            }
        }
    };

    const filteredServices = services.filter(s =>
        s.name_th.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.name_en.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <header className="mb-10 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-black text-gray-900 mb-2">Service Management</h1>
                    <p className="text-gray-500 font-medium">จัดการรายการบริการและตั้งค่าราคามาตรฐาน</p>
                </div>
                <div className="flex gap-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาบริการ..."
                            className="pl-12 pr-6 py-3 bg-white border border-gray-200 rounded-2xl w-64 shadow-sm focus:ring-2 focus:ring-black/5 outline-none transition-all"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-black text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-gray-800 transition-all active:scale-95 shadow-lg shadow-black/10"
                    >
                        <Plus className="w-4 h-4" /> Add Service
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                    <Loader2 className="w-10 h-10 text-black animate-spin" />
                    <p className="font-bold text-gray-300 uppercase tracking-widest text-xs">Loading Services...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredServices.map((service) => (
                        <div key={service.id} className="bg-white rounded-[32px] border border-gray-100 p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-2 h-full bg-black" />

                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-xl font-black text-gray-900 mb-1">{service.name_th}</h3>
                                    <p className="text-sm font-bold text-gray-400 italic lowercase">{service.name_en}</p>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => handleOpenModal(service)} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
                                        <Edit3 className="w-4 h-4 text-gray-600" />
                                    </button>
                                    <button onClick={() => handleDelete(service.id)} className="p-2 hover:bg-red-50 rounded-xl transition-colors text-red-400">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 text-gray-600">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-bold">{service.duration_min} Minutes</span>
                                </div>
                                <div className="flex items-center gap-3 text-gray-600">
                                    <DollarSign className="w-4 h-4 text-gray-400" />
                                    <div className="flex flex-col">
                                        <span className={cn("text-sm font-bold", service.price_promo && "line-through text-gray-400 text-xs")}>
                                            Base: ฿{service.base_price.toLocaleString()}
                                        </span>
                                        {service.price_promo && (
                                            <span className="text-sm font-black text-red-500">
                                                Promo: ฿{service.price_promo.toLocaleString()}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-green-600 bg-green-50/50 p-3 rounded-2xl border border-green-100/50">
                                    <CheckCircle2 className="w-4 h-4" />
                                    <span className="text-xs font-black uppercase tracking-widest">Deposit: ฿{service.deposit_amount.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
                    <form
                        onSubmit={handleSave}
                        className="relative w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
                    >
                        <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-xl font-black italic">{editingService ? "Edit Service" : "Add New Service"}</h2>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">ชื่อภาษาไทย</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name_th}
                                        onChange={e => setFormData({ ...formData, name_th: e.target.value })}
                                        className="w-full bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-black/5 rounded-2xl px-5 py-3 text-sm font-bold outline-none transition-all"
                                        placeholder="เช่น ตัดผมชาย"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">English Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name_en}
                                        onChange={e => setFormData({ ...formData, name_en: e.target.value })}
                                        className="w-full bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-black/5 rounded-2xl px-5 py-3 text-sm font-bold outline-none transition-all uppercase"
                                        placeholder="HAIRCUT"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Duration</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {[60, 120, 180].map((mins) => (
                                        <button
                                            key={mins}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, duration_min: mins })}
                                            className={cn(
                                                "py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border",
                                                formData.duration_min === mins
                                                    ? "bg-black text-white border-black shadow-lg shadow-black/10"
                                                    : "bg-white text-gray-400 border-gray-100 hover:bg-gray-50"
                                            )}
                                        >
                                            {mins} Min
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Base Price (฿)</label>
                                    <input
                                        required
                                        type="number"
                                        value={formData.base_price}
                                        onChange={e => setFormData({ ...formData, base_price: Number(e.target.value) })}
                                        className="w-full bg-gray-50 border-transparent focus:bg-white focus:ring-2 focus:ring-black/5 rounded-2xl px-5 py-3 text-sm font-bold outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 text-red-400">Promo Price (฿) - Opt</label>
                                    <input
                                        type="number"
                                        value={formData.price_promo}
                                        onChange={e => setFormData({ ...formData, price_promo: e.target.value })}
                                        className="w-full bg-red-50/50 border-transparent focus:bg-white focus:ring-2 focus:ring-red-500/10 rounded-2xl px-5 py-3 text-sm font-bold text-red-700 outline-none transition-all placeholder:text-red-200"
                                        placeholder="None"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 text-green-600">Deposit Amount (฿)</label>
                                <input
                                    required
                                    type="number"
                                    value={formData.deposit_amount}
                                    onChange={e => setFormData({ ...formData, deposit_amount: Number(e.target.value) })}
                                    className="w-full bg-green-50/50 border-transparent focus:bg-white focus:ring-2 focus:ring-green-500/10 rounded-2xl px-5 py-3 text-sm font-bold text-green-700 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="p-8 bg-gray-50/50 border-t border-gray-100">
                            <button
                                disabled={isSaving}
                                type="submit"
                                className="w-full bg-black text-white py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                {editingService ? "Update Service" : "Create Service"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
