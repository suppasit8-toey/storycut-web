"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import {
    addBarber,
    updateBarber,
    deleteBarber,
    getServices,
    getBarberServices,
    updateBarberService
} from "@/lib/db";
import {
    Plus,
    Search,
    Edit3,
    Trash2,
    Lock,
    X,
    Loader2,
    Camera,
    Check
} from "lucide-react";
import { CldUploadWidget } from 'next-cloudinary';
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

// --- Types ---
interface Barber {
    id: string;
    name_th: string;
    name_en: string;
    nickname: string;
    position: string;
    pin_code: string;
    profile_image: string;
    status: "active" | "inactive";
    weekly_off_days: number[]; // 0 for Sun, 1 for Mon, etc.
}

interface Service {
    id: string;
    name_th: string;
    name_en: string;
    base_price: number;
    price_promo?: number | null;
}

interface BarberServiceMapping {
    service_id: string;
    price_normal: number;
    price_promo: number | null; // Used for Barber-Specific Promotion Price
    commission_fixed: number;
    promotion_text: string; // Deprecated in UI but kept for compatibility
    enabled: boolean;
    promotion_active: boolean;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function BarbersPage() {
    const [barbers, setBarbers] = useState<Barber[]>([]);
    const [allServices, setAllServices] = useState<Service[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"profile" | "services">("profile");
    const [editingBarber, setEditingBarber] = useState<Barber | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        name_th: "",
        name_en: "",
        nickname: "",
        position: "Barber",
        pin_code: "",
        profile_image: "",
        status: "active" as "active" | "inactive",
        weekly_off_days: [] as number[]
    });

    // Services Mapping State
    const [mappingStates, setMappingStates] = useState<Record<string, BarberServiceMapping>>({});
    const [isMappingLoading, setIsMappingLoading] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "barbers"), orderBy("name_th", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Barber[];
            setBarbers(data);
            setLoading(false);
        });

        getServices().then((data) => setAllServices(data as Service[]));

        return () => unsubscribe();
    }, []);

    const handleOpenModal = async (barber?: Barber) => {
        setActiveTab("profile");
        if (barber) {
            setEditingBarber(barber);
            setFormData({
                name_th: barber.name_th || "",
                name_en: barber.name_en || "",
                nickname: barber.nickname || "",
                position: barber.position || "Staff",
                pin_code: barber.pin_code || "",
                profile_image: barber.profile_image || "",
                status: barber.status || "active",
                weekly_off_days: barber.weekly_off_days || []
            });

            setIsMappingLoading(true);
            try {
                const currentMappings = await getBarberServices(barber.id) as any[];
                const newStates: Record<string, BarberServiceMapping> = {};

                allServices.forEach(s => {
                    const found = currentMappings.find(m => m.service_id === s.id);
                    if (found) {
                        newStates[s.id] = {
                            service_id: s.id,
                            price_normal: found.price_normal,
                            price_promo: found.price_promo || null,
                            commission_fixed: found.commission_fixed || 0,
                            promotion_text: found.promotion_text || "",
                            enabled: true,
                            promotion_active: !!found.promotion_active
                        };
                    } else {
                        newStates[s.id] = {
                            service_id: s.id,
                            price_normal: s.base_price || 0,
                            price_promo: null,
                            commission_fixed: 0,
                            promotion_text: "",
                            enabled: false,
                            promotion_active: false
                        };
                    }
                });
                setMappingStates(newStates);
            } catch (e) {
                console.error("Mapping load failed", e);
                // Fallback
                const newStates: Record<string, BarberServiceMapping> = {};
                allServices.forEach(s => {
                    newStates[s.id] = {
                        service_id: s.id,
                        price_normal: s.base_price || 0,
                        price_promo: null,
                        commission_fixed: 0,
                        promotion_text: "",
                        enabled: false,
                        promotion_active: false
                    };
                });
                setMappingStates(newStates);
            } finally {
                setIsMappingLoading(false);
            }
        } else {
            setEditingBarber(null);
            setFormData({
                name_th: "",
                name_en: "",
                nickname: "",
                position: "Barber",
                pin_code: "",
                profile_image: "",
                status: "active",
                weekly_off_days: []
            });
            // Default mappings
            const newStates: Record<string, BarberServiceMapping> = {};
            allServices.forEach(s => {
                newStates[s.id] = {
                    service_id: s.id,
                    price_normal: s.base_price || 0,
                    price_promo: null,
                    commission_fixed: 0,
                    promotion_text: "",
                    enabled: false,
                    promotion_active: false
                };
            });
            setMappingStates(newStates);
        }
        setIsModalOpen(true);
    };

    const handleToggleService = (serviceId: string, currentMapping: BarberServiceMapping) => {
        const isEnabling = !currentMapping.enabled;

        let newState = { ...currentMapping, enabled: isEnabling };

        if (isEnabling) {
            // Logic: Auto-populate if turning ON
            const globalService = allServices.find(s => s.id === serviceId);
            if (globalService) {
                // Set BASE price first (Price Override defaults to Base)
                newState.price_normal = globalService.base_price;

                // Check Global Promo
                if (globalService.price_promo && globalService.price_promo > 0) {
                    newState.promotion_active = true;
                    newState.price_promo = globalService.price_promo; // Set Barber Promo Price to Global Promo
                } else {
                    // Fallback
                    newState.promotion_active = false;
                    newState.price_promo = null; // No promo
                }
            }
        }

        setMappingStates(prev => ({
            ...prev,
            [serviceId]: newState
        }));
    };

    const handleSaveAll = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            let barberId = editingBarber?.id;
            if (editingBarber) {
                await updateBarber(editingBarber.id, formData);
            } else {
                barberId = await addBarber(formData);
            }

            // Persistence Loop
            const targetId = editingBarber ? editingBarber.id : barberId;
            if (targetId) {
                const promises = Object.values(mappingStates).map(m => {
                    return updateBarberService(targetId, m.service_id, {
                        ...m,
                        price_promo: m.promotion_active && m.price_promo ? Number(m.price_promo) : null,
                        promotion_active: m.promotion_active
                    });
                });
                await Promise.all(promises);
            }
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            alert("Save failed");
        } finally {
            setIsSaving(false);
        }
    };

    const filteredBarbers = barbers.filter(b =>
        (b.name_th || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.nickname || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-10 pb-20">
            <div className="max-w-[1600px] mx-auto">
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-10">
                    <div>
                        <h1 className="text-4xl font-black italic tracking-tighter text-white mb-2 font-inter uppercase">Barbers</h1>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">STAFF MANAGEMENT</p>
                    </div>
                    <div className="flex gap-4 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                            <input
                                type="text"
                                placeholder="Search barbers..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                className="w-full bg-[#1A1A1A] border border-gray-800 rounded-full pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
                            />
                        </div>
                        <button
                            onClick={() => handleOpenModal()}
                            className="bg-white text-black px-6 py-3 rounded-full font-bold text-sm hover:bg-gray-200 transition-colors flex items-center gap-2 whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" /> Add Barber
                        </button>
                    </div>
                </header>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-white" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredBarbers.map((barber) => (
                            <div key={barber.id} className="bg-[#1A1A1A] rounded-[32px] p-6 hover:bg-[#222] transition-colors border border-transparent hover:border-gray-800 group relative">
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleOpenModal(barber); }}
                                        className="p-2 bg-black text-white rounded-full hover:bg-gray-800"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex flex-col items-center text-center">
                                    <div className="relative w-24 h-24 mb-4">
                                        <img
                                            src={barber.profile_image || "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"}
                                            alt={barber.nickname}
                                            className="w-full h-full object-cover rounded-full border-2 border-gray-800"
                                        />
                                        <div className={cn(
                                            "absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-[#1A1A1A]",
                                            barber.status === 'active' ? "bg-green-500" : "bg-gray-500"
                                        )} />
                                    </div>
                                    <h3 className="text-lg font-bold text-white mb-1">{barber.name_th} ({barber.nickname})</h3>
                                    <div className="bg-white/10 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full mb-4">
                                        {barber.position}
                                    </div>

                                    <div className="w-full pt-4 border-t border-gray-800 flex justify-between items-center text-xs text-gray-500">
                                        <span className="font-mono">PIN: ****</span>
                                        <span>OFF: {barber.weekly_off_days.length > 0 ? barber.weekly_off_days.map(d => DAYS[d]).join(', ') : 'None'}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-[#111] rounded-[32px] w-full max-w-2xl border border-gray-800 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
                            {/* Modal Header */}
                            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-[#0A0A0A]">
                                <h2 className="text-xl font-bold text-white">
                                    {editingBarber ? "Edit Barber" : "New Barber"}
                                </h2>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Tabs */}
                            <div className="flex border-b border-gray-800">
                                <button
                                    onClick={() => setActiveTab("profile")}
                                    className={cn(
                                        "flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors",
                                        activeTab === "profile" ? "bg-[#111] text-white" : "bg-[#0A0A0A] text-gray-500 hover:bg-[#111] hover:text-gray-300"
                                    )}
                                >
                                    Profile Info
                                </button>
                                <button
                                    onClick={() => setActiveTab("services")}
                                    className={cn(
                                        "flex-1 py-4 text-sm font-bold uppercase tracking-wider transition-colors",
                                        activeTab === "services" ? "bg-[#111] text-white" : "bg-[#0A0A0A] text-gray-500 hover:bg-[#111] hover:text-gray-300"
                                    )}
                                >
                                    Service Config
                                </button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
                                {activeTab === "profile" ? (
                                    <div className="space-y-6">
                                        {/* Image Upload */}
                                        <div className="flex justify-center">
                                            <CldUploadWidget
                                                uploadPreset="storycut_uploads"
                                                onSuccess={(result: any) => {
                                                    if (result.info?.secure_url) {
                                                        setFormData(prev => ({ ...prev, profile_image: result.info.secure_url }));
                                                    }
                                                }}
                                            >
                                                {({ open }) => (
                                                    <div onClick={() => open()} className="cursor-pointer group relative w-32 h-32 rounded-full overflow-hidden border-2 border-gray-800 hover:border-white transition-colors">
                                                        {formData.profile_image ? (
                                                            <img src={formData.profile_image} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full bg-[#222] flex items-center justify-center text-gray-500 group-hover:text-white">
                                                                <Camera className="w-8 h-8" />
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </CldUploadWidget>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Thai Name</label>
                                                <input
                                                    type="text"
                                                    value={formData.name_th}
                                                    onChange={e => setFormData({ ...formData, name_th: e.target.value })}
                                                    className="w-full bg-[#0A0A0A] border border-gray-800 rounded-xl px-4 py-3 text-white focus:border-white outline-none"
                                                    placeholder="Name (TH)"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">English Name</label>
                                                <input
                                                    type="text"
                                                    value={formData.name_en}
                                                    onChange={e => setFormData({ ...formData, name_en: e.target.value })}
                                                    className="w-full bg-[#0A0A0A] border border-gray-800 rounded-xl px-4 py-3 text-white focus:border-white outline-none"
                                                    placeholder="Name (EN)"
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Nickname</label>
                                                <input
                                                    type="text"
                                                    value={formData.nickname}
                                                    onChange={e => setFormData({ ...formData, nickname: e.target.value })}
                                                    className="w-full bg-[#0A0A0A] border border-gray-800 rounded-xl px-4 py-3 text-white focus:border-white outline-none"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Position</label>
                                                <input
                                                    type="text"
                                                    value={formData.position}
                                                    onChange={e => setFormData({ ...formData, position: e.target.value })}
                                                    className="w-full bg-[#0A0A0A] border border-gray-800 rounded-xl px-4 py-3 text-white focus:border-white outline-none"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Weekly Off Days</label>
                                            <div className="flex flex-wrap gap-2">
                                                {DAYS.map((day, idx) => (
                                                    <button
                                                        key={day}
                                                        type="button"
                                                        onClick={() => {
                                                            const current = formData.weekly_off_days;
                                                            const updated = current.includes(idx)
                                                                ? current.filter(d => d !== idx)
                                                                : [...current, idx];
                                                            setFormData({ ...formData, weekly_off_days: updated });
                                                        }}
                                                        className={cn(
                                                            "w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                                                            formData.weekly_off_days.includes(idx)
                                                                ? "bg-white text-black"
                                                                : "bg-[#222] text-gray-400 hover:bg-[#333]"
                                                        )}
                                                    >
                                                        {day.charAt(0)}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Access PIN</label>
                                                <div className="relative">
                                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                                                    <input
                                                        type="text"
                                                        value={formData.pin_code}
                                                        onChange={e => setFormData({ ...formData, pin_code: e.target.value })}
                                                        maxLength={6}
                                                        className="w-full bg-[#0A0A0A] border border-gray-800 rounded-xl pl-10 pr-4 py-3 text-white focus:border-white outline-none"
                                                        placeholder="4-6 Digits"
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Status</label>
                                                <div className="flex bg-[#0A0A0A] rounded-xl p-1 border border-gray-800">
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, status: 'active' })}
                                                        className={cn(
                                                            "flex-1 py-2 rounded-lg text-xs font-bold transition-colors",
                                                            formData.status === 'active' ? "bg-green-900/30 text-green-400" : "text-gray-500"
                                                        )}
                                                    >
                                                        Enabled
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, status: 'inactive' })}
                                                        className={cn(
                                                            "flex-1 py-2 rounded-lg text-xs font-bold transition-colors",
                                                            formData.status === 'inactive' ? "bg-gray-800 text-white" : "text-gray-500"
                                                        )}
                                                    >
                                                        On Vacation
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {isMappingLoading ? (
                                            <div className="flex justify-center py-10">
                                                <Loader2 className="w-8 h-8 animate-spin text-white" />
                                            </div>
                                        ) : (
                                            allServices.map(service => {
                                                const mapping = mappingStates[service.id];
                                                if (!mapping) return null;
                                                return (
                                                    <div key={service.id} className={cn(
                                                        "p-5 rounded-[32px] border transition-all duration-300",
                                                        mapping.enabled ? "bg-[#1A1A1A] border-gray-800 shadow-xl" : "bg-black border-gray-900 opacity-60"
                                                    )}>
                                                        {/* Header */}
                                                        <div className="flex items-center justify-between mb-4">
                                                            <div className="flex flex-col">
                                                                <h4 className="font-bold text-white text-base">{service.name_th}</h4>
                                                                <span className="text-[10px] uppercase text-gray-500 tracking-wider">{service.name_en}</span>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleToggleService(service.id, mapping)}
                                                                className={cn(
                                                                    "w-14 h-8 rounded-full relative transition-colors duration-300",
                                                                    mapping.enabled ? "bg-white" : "bg-gray-800"
                                                                )}
                                                            >
                                                                <span className={cn(
                                                                    "absolute top-1 w-6 h-6 rounded-full transition-all duration-300 shadow-md",
                                                                    mapping.enabled ? "left-7 bg-black" : "left-1 bg-gray-500"
                                                                )} />
                                                            </button>
                                                        </div>

                                                        {/* Body */}
                                                        {mapping.enabled && (
                                                            <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-300">

                                                                {/* Price & Commission Row */}
                                                                <div className="grid grid-cols-2 gap-4">
                                                                    {/* Price Override */}
                                                                    <div>
                                                                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5 pl-1">Price Override</label>
                                                                        <div className="relative">
                                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs font-mono">฿</span>
                                                                            <input
                                                                                type="number"
                                                                                value={mapping.price_normal}
                                                                                onChange={e => setMappingStates(prev => ({
                                                                                    ...prev,
                                                                                    [service.id]: { ...mapping, price_normal: Number(e.target.value) }
                                                                                }))}
                                                                                onBlur={() => {
                                                                                    // Fallback logic on blur
                                                                                    if (!mapping.price_normal) {
                                                                                        setMappingStates(prev => ({
                                                                                            ...prev,
                                                                                            [service.id]: { ...mapping, price_normal: service.base_price }
                                                                                        }));
                                                                                    }
                                                                                }}
                                                                                className="w-full bg-[#0A0A0A] border border-gray-800 rounded-xl pl-8 pr-3 py-2.5 text-white text-sm focus:border-white transition-colors outline-none font-bold"
                                                                                placeholder={String(service.base_price)}
                                                                            />
                                                                        </div>
                                                                    </div>

                                                                    {/* Commission */}
                                                                    <div>
                                                                        <label className="text-[10px] font-bold text-green-500 uppercase block mb-1.5 pl-1">Commission</label>
                                                                        <div className="relative">
                                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-green-500/50 text-xs font-mono">฿</span>
                                                                            <input
                                                                                type="number"
                                                                                value={mapping.commission_fixed}
                                                                                onChange={e => setMappingStates(prev => ({
                                                                                    ...prev,
                                                                                    [service.id]: { ...mapping, commission_fixed: Number(e.target.value) }
                                                                                }))}
                                                                                onBlur={() => {
                                                                                    // Fallback logic on blur
                                                                                    if (!mapping.commission_fixed) {
                                                                                        setMappingStates(prev => ({
                                                                                            ...prev,
                                                                                            [service.id]: { ...mapping, commission_fixed: 0 }
                                                                                        }));
                                                                                    }
                                                                                }}
                                                                                className="w-full bg-[#0A0A0A] border border-green-900/30 rounded-xl pl-8 pr-3 py-2.5 text-green-400 font-bold text-sm focus:border-green-600 transition-colors outline-none"
                                                                                placeholder="0"
                                                                            />
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {/* Promotion Toggle Area */}
                                                                <div className="bg-black/50 rounded-xl p-3 border border-gray-800/50">
                                                                    <div className="flex items-center justify-between mb-2">
                                                                        <label className="text-[10px] font-bold text-blue-400 uppercase flex items-center gap-2">
                                                                            Individual Barber Promotion Price
                                                                        </label>
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => setMappingStates(prev => ({
                                                                                ...prev,
                                                                                [service.id]: {
                                                                                    ...mapping,
                                                                                    promotion_active: !mapping.promotion_active
                                                                                }
                                                                            }))}
                                                                            className={cn(
                                                                                "text-[10px] font-bold px-2 py-0.5 rounded-full transition-colors",
                                                                                mapping.promotion_active ? "bg-blue-500/20 text-blue-400" : "bg-gray-800 text-gray-500"
                                                                            )}
                                                                        >
                                                                            {mapping.promotion_active ? "ACTIVE" : "OFF"}
                                                                        </button>
                                                                    </div>

                                                                    {mapping.promotion_active && (
                                                                        <div className="relative mt-2">
                                                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-500/50 text-xs font-mono">฿</span>
                                                                            <input
                                                                                type="number"
                                                                                value={mapping.price_promo || ""}
                                                                                onChange={e => setMappingStates(prev => ({
                                                                                    ...prev,
                                                                                    [service.id]: { ...mapping, price_promo: Number(e.target.value) }
                                                                                }))}
                                                                                className="w-full bg-[#0A0A0A] border border-blue-900/20 rounded-lg pl-8 pr-3 py-2 text-white text-xs focus:border-blue-500/50 outline-none transition-all placeholder:text-gray-700"
                                                                                placeholder="Enter promotion price"
                                                                            />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                )
                                            })
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-gray-800 bg-[#0A0A0A] flex justify-between gap-4">
                                {editingBarber && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (confirm("Delete this barber?")) {
                                                deleteBarber(editingBarber.id);
                                                setIsModalOpen(false);
                                            }
                                        }}
                                        className="text-red-500 hover:text-red-400 font-bold text-sm px-4"
                                    >
                                        Delete
                                    </button>
                                )}
                                <div className="flex gap-3 flex-1 justify-end">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-6 py-3 rounded-full font-bold text-sm text-gray-400 hover:bg-[#222] transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveAll}
                                        disabled={isSaving}
                                        className="px-8 py-3 rounded-full font-bold text-sm bg-white text-black hover:bg-gray-200 transition-colors disabled:opacity-50"
                                    >
                                        {isSaving ? "Saving..." : "Save Changes"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
