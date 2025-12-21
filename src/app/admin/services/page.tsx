"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { addService, updateService, deleteService } from "@/lib/db";
import {
    Plus,
    Search,
    Edit3,
    Trash2,
    X,
    Loader2
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
        <div className="min-h-screen bg-black text-white p-6 md:p-10 pb-20 font-sans">
            <div className="max-w-[1600px] mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
                    <div>
                        <h1 className="text-4xl font-black italic tracking-tighter text-white mb-2 font-inter uppercase">Services</h1>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">SERVICE MENU</p>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search services..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-[#1A1A1A] border border-gray-800 rounded-full pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
                            />
                        </div>
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-white text-black px-6 py-3 rounded-full font-bold text-sm hover:bg-gray-200 transition-colors flex items-center gap-2 whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" /> Add Service
                        </button>
                    </div>
                </header>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-white" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredServices.map((service) => (
                            <div key={service.id} className="bg-[#1A1A1A] rounded-[32px] p-8 flex flex-col md:flex-row items-center justify-between border border-transparent hover:border-gray-800 transition-colors group">
                                <div className="flex flex-col gap-1 w-full md:w-auto text-center md:text-left mb-4 md:mb-0">
                                    <h3 className="text-2xl font-bold text-white uppercase tracking-tight">{service.name_th}</h3>
                                    <div className="flex items-center justify-center md:justify-start gap-2 text-sm text-gray-400 font-medium">
                                        <span className="uppercase tracking-wider">{service.name_en}</span>
                                        <span className="text-gray-600">•</span>
                                        <span>{service.duration_min} MIN</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end">
                                    <div className="text-right flex-1 md:flex-none">
                                        <div className="text-white font-bold text-2xl tracking-tight">฿{service.base_price.toLocaleString()}</div>
                                        {service.price_promo && (
                                            <div className="text-xs text-green-500 font-bold uppercase tracking-wider">Promo Active</div>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleOpenModal(service)}
                                            className="w-10 h-10 flex items-center justify-center rounded-full bg-black border border-gray-800 text-gray-400 hover:text-white hover:border-gray-600 transition-colors"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(service.id)}
                                            className="w-10 h-10 flex items-center justify-center rounded-full bg-black border border-gray-800 text-gray-400 hover:text-red-400 hover:border-red-900/50 transition-colors"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-[#111] rounded-[32px] w-full max-w-lg border border-gray-800 shadow-2xl flex flex-col max-h-[90vh]">
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0A0A0A] rounded-t-[32px]">
                                <h2 className="text-xl font-bold text-white">
                                    {editingService ? "Edit Service" : "New Service"}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Thai Name</label>
                                            <input
                                                required
                                                type="text"
                                                value={formData.name_th}
                                                onChange={e => setFormData({ ...formData, name_th: e.target.value })}
                                                className="w-full bg-[#0A0A0A] border border-gray-800 rounded-xl px-4 py-3 text-white focus:border-white outline-none font-bold"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase">English Name</label>
                                            <input
                                                required
                                                type="text"
                                                value={formData.name_en}
                                                onChange={e => setFormData({ ...formData, name_en: e.target.value })}
                                                className="w-full bg-[#0A0A0A] border border-gray-800 rounded-xl px-4 py-3 text-white focus:border-white outline-none font-bold"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Duration</label>
                                        <div className="flex gap-2">
                                            {[60, 120, 180].map(m => (
                                                <button
                                                    key={m}
                                                    type="button"
                                                    onClick={() => setFormData({ ...formData, duration_min: m })}
                                                    className={cn(
                                                        "flex-1 py-3 rounded-xl text-sm font-bold border transition-all",
                                                        formData.duration_min === m
                                                            ? "bg-white text-black border-white"
                                                            : "bg-[#0A0A0A] text-gray-500 border-gray-800 hover:border-gray-600"
                                                    )}
                                                >
                                                    {m} min
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Base Price</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono">฿</span>
                                                <input
                                                    required
                                                    type="number"
                                                    value={formData.base_price}
                                                    onChange={e => setFormData({ ...formData, base_price: Number(e.target.value) })}
                                                    className="w-full bg-[#0A0A0A] border border-gray-800 rounded-xl pl-8 pr-4 py-3 text-white focus:border-white outline-none font-bold text-lg"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-500 uppercase">Deposit</label>
                                            <div className="relative">
                                                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono">฿</span>
                                                <input
                                                    type="number"
                                                    value={formData.deposit_amount}
                                                    onChange={e => setFormData({ ...formData, deposit_amount: Number(e.target.value) })}
                                                    className="w-full bg-[#0A0A0A] border border-gray-800 rounded-xl pl-8 pr-4 py-3 text-white focus:border-white outline-none font-bold text-lg"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-500 uppercase">Promo Price (Optional)</label>
                                        <div className="relative">
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-mono">฿</span>
                                            <input
                                                type="number"
                                                value={formData.price_promo}
                                                onChange={e => setFormData({ ...formData, price_promo: e.target.value })}
                                                className="w-full bg-[#0A0A0A] border border-gray-800 rounded-xl pl-8 pr-4 py-3 text-white focus:border-white outline-none placeholder:text-gray-700 font-bold text-lg"
                                                placeholder="None"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8">
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors disabled:opacity-50"
                                    >
                                        {isSaving ? "Saving..." : (editingService ? "Update Service" : "Create Service")}
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
