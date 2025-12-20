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
    User,
    CheckCircle2,
    X,
    Loader2,
    Camera,
    Star,
    Settings,
    Calendar,
    Lock,
    ChevronRight,
    ShieldCheck,
    Save,
    Clock,
    Briefcase,
    AlertCircle,
    Smartphone
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
    base_price: number;
}

interface BarberServiceMapping {
    service_id: string;
    price_normal: number;
    price_promo: number | null;
    commission_fixed: number;
}

const THAI_DAYS = ["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"];

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

    // Form Data (Profile)
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

    // Services State (Config)
    const [mappingStates, setMappingStates] = useState<Record<string, BarberServiceMapping & { enabled: boolean }>>({});
    const [isMappingLoading, setIsMappingLoading] = useState(false);

    useEffect(() => {
        // Fetch Barbers
        const q = query(collection(db, "barbers"), orderBy("name_th", "asc"));
        const unsubscribeBarbers = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Barber[];
            setBarbers(data);
            setLoading(false);
        });

        // Fetch All Services
        getServices().then((data) => setAllServices(data as Service[]));

        return () => unsubscribeBarbers();
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

            // Load Services Configuration
            setIsMappingLoading(true);
            try {
                const currentMappings = await getBarberServices(barber.id) as any[];
                const newStates: Record<string, BarberServiceMapping & { enabled: boolean }> = {};

                allServices.forEach(s => {
                    const found = currentMappings.find(m => m.service_id === s.id);
                    if (found) {
                        newStates[s.id] = {
                            service_id: s.id,
                            price_normal: found.price_normal,
                            price_promo: found.price_promo,
                            commission_fixed: found.commission_fixed,
                            enabled: true
                        };
                    } else {
                        newStates[s.id] = {
                            service_id: s.id,
                            price_normal: s.base_price || 0,
                            price_promo: null,
                            commission_fixed: 0,
                            enabled: false
                        };
                    }
                });
                setMappingStates(newStates);
            } catch (e) {
                console.error("Mapping load failed", e);
            } finally {
                setIsMappingLoading(false);
            }
        } else {
            setEditingBarber(null);
            setFormData({
                name_th: "",
                name_en: "",
                nickname: "",
                position: "Master Stylist",
                pin_code: "",
                profile_image: "",
                status: "active",
                weekly_off_days: []
            });

            // Default mappings for new barber
            const newStates: Record<string, BarberServiceMapping & { enabled: boolean }> = {};
            allServices.forEach(s => {
                newStates[s.id] = {
                    service_id: s.id,
                    price_normal: s.base_price || 0,
                    price_promo: null,
                    commission_fixed: 0,
                    enabled: false
                };
            });
            setMappingStates(newStates);
        }
        setIsModalOpen(true);
    };

    const handleToggleOffDay = (day: number) => {
        setFormData(prev => ({
            ...prev,
            weekly_off_days: prev.weekly_off_days.includes(day)
                ? prev.weekly_off_days.filter(d => d !== day)
                : [...prev.weekly_off_days, day]
        }));
    };

    const handleToggleMapping = (serviceId: string) => {
        setMappingStates(prev => ({
            ...prev,
            [serviceId]: {
                ...prev[serviceId],
                enabled: !prev[serviceId]?.enabled
            }
        }));
    };

    const handleDelete = async (id: string) => {
        if (confirm("Are you sure you want to delete this barber?")) {
            try {
                await deleteBarber(id);
                setIsModalOpen(false);
            } catch (error) {
                alert("Deleting barber failed");
            }
        }
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

            if (barberId) {
                const promises = Object.values(mappingStates).map(m =>
                    updateBarberService(barberId, m.service_id, m)
                );
                await Promise.all(promises);
            }

            setIsModalOpen(false);
        } catch (error) {
            alert("Save failed");
        } finally {
            setIsSaving(false);
        }
    };

    const handleUpdateMappingField = (serviceId: string, field: string, value: any) => {
        setMappingStates(prev => ({
            ...prev,
            [serviceId]: { ...prev[serviceId], [field]: value }
        }));
    };

    const filteredBarbers = barbers.filter(b =>
        (b.name_th || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.name_en || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.nickname || "").toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-4 md:p-8 max-w-[1600px] mx-auto">
            <header className="mb-8 md:mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black text-gray-900 mb-2 tracking-tighter italic uppercase">Barber HQ</h1>
                    <p className="text-xs md:text-sm text-gray-500 font-medium">บริหารจัดการช่างและตั้งค่าระบบค่าตอบแทนรายบุคคล</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <div className="relative flex-1 sm:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="ค้นหาช่าง..."
                            className="pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-[24px] md:rounded-[28px] w-full shadow-sm focus:ring-4 focus:ring-black/5 outline-none transition-all font-bold text-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-black text-white px-8 py-4 rounded-[24px] md:rounded-[28px] font-black text-[10px] md:text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-gray-800 transition-all active:scale-95 shadow-xl shadow-black/10 h-[56px]"
                    >
                        <Plus className="w-4 h-4" /> Add Master Barber
                    </button>
                </div>
            </header>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-6 grayscale">
                    <Loader2 className="w-12 h-12 text-black animate-spin" />
                    <p className="font-black text-gray-300 uppercase tracking-[0.4em] text-[10px]">Synchronizing Database...</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 md:gap-8">
                    {filteredBarbers.map((barber) => (
                        <div key={barber.id} className="bg-white rounded-[48px] border border-gray-100 p-8 shadow-sm hover:shadow-2xl transition-all group relative overflow-hidden flex flex-col items-center text-center cursor-pointer" onClick={() => handleOpenModal(barber)}>
                            <div className="absolute top-0 right-0 p-6 opacity-0 group-hover:opacity-100 transition-all">
                                <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center">
                                    <Edit3 className="w-4 h-4" />
                                </div>
                            </div>

                            <div className="relative w-40 h-40 mb-8 mt-4">
                                <div className="absolute inset-2 bg-gray-50 rounded-full border border-gray-100" />
                                <img
                                    src={barber.profile_image || "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg"}
                                    alt={barber.name_th}
                                    className="w-full h-full object-cover rounded-full border-4 border-white shadow-2xl relative z-10 grayscale-[0.5] group-hover:grayscale-0 transition-all duration-500"
                                />
                                <div className={cn(
                                    "absolute bottom-4 right-4 w-7 h-7 rounded-full border-[5px] border-white z-20 shadow-lg",
                                    barber.status === "active" ? "bg-green-500" : "bg-gray-300"
                                )} />
                            </div>

                            <div className="space-y-1 mb-8">
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight italic">{barber.name_th}</h3>
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest">{barber.name_en}</span>
                                </div>
                                <div className="mt-4 px-4 py-1.5 bg-gray-50 rounded-full inline-block border border-gray-100">
                                    <span className="text-[9px] font-black text-gray-500 uppercase tracking-[0.2em]">{barber.position}</span>
                                </div>
                            </div>

                            <div className="w-full pt-8 border-t border-gray-50 grid grid-cols-2 gap-4">
                                <div className="text-left">
                                    <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-1">Weekly Off</p>
                                    <div className="flex gap-1">
                                        {barber.weekly_off_days?.length > 0 ? (
                                            barber.weekly_off_days.map(d => (
                                                <span key={d} className="text-[9px] font-black text-black">{THAI_DAYS[d]}</span>
                                            ))
                                        ) : (
                                            <span className="text-[9px] font-black text-gray-200">No Day Off</span>
                                        )}
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mb-1">Staff Access</p>
                                    <div className="flex items-center justify-end gap-1 text-gray-400">
                                        <Lock className="w-2.5 h-2.5" />
                                        <span className="text-[9px] font-black">PIN: ****</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    {/* New Empty Card */}
                    <div
                        onClick={() => handleOpenModal()}
                        className="rounded-[48px] border-4 border-dashed border-gray-100 p-8 flex flex-col items-center justify-center text-center hover:border-black/10 hover:bg-gray-50/50 transition-all cursor-pointer min-h-[400px]"
                    >
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                            <Plus className="w-8 h-8 text-gray-300" />
                        </div>
                        <p className="text-xs font-black text-gray-300 uppercase tracking-[0.3em]">Recruit New Barber</p>
                    </div>
                </div>
            )}

            {/* Advanced Tabbed Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[70] flex items-end md:items-center justify-center md:p-6">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsModalOpen(false)} />
                    <form
                        onSubmit={handleSaveAll}
                        className="relative w-full md:max-w-4xl bg-white rounded-t-[40px] md:rounded-[56px] shadow-2xl overflow-hidden animate-in slide-in-from-bottom-full md:slide-in-from-bottom-0 md:zoom-in-95 duration-500 flex flex-col h-[95vh] md:max-h-[90vh]"
                    >
                        {/* Header / Tabs */}
                        <div className="px-6 md:px-10 py-6 md:py-8 border-b border-gray-100 bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4 md:gap-0">
                            <div className="flex flex-col md:flex-row items-center gap-4 md:gap-10 w-full md:w-auto">
                                <h2 className="text-xl md:text-2xl font-black italic tracking-tighter uppercase">{editingBarber ? "Manage Master" : "Recruit Staff"}</h2>
                                <nav className="flex bg-white p-1 rounded-2xl border border-gray-100 w-full md:w-auto">
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("profile")}
                                        className={cn(
                                            "flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all",
                                            activeTab === "profile" ? "bg-black text-white shadow-xl shadow-black/20" : "text-gray-400 hover:text-gray-600"
                                        )}
                                    >
                                        Profile Info
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setActiveTab("services")}
                                        className={cn(
                                            "flex-1 md:flex-none px-4 md:px-6 py-2.5 rounded-xl text-[9px] md:text-[10px] font-black uppercase tracking-widest transition-all",
                                            activeTab === "services" ? "bg-black text-white shadow-xl shadow-black/20" : "text-gray-400 hover:text-gray-600"
                                        )}
                                    >
                                        Service Config
                                    </button>
                                </nav>
                            </div>
                            <button type="button" onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 md:relative md:top-0 md:right-0 w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center shadow-lg hover:rotate-90 transition-all border border-gray-100">
                                <X className="w-5 h-5 md:w-6 md:h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                            {activeTab === "profile" ? (
                                <div className="p-6 md:p-10 space-y-8 md:space-y-10 animate-in fade-in slide-in-from-left-4 duration-500">
                                    <div className="flex flex-col lg:grid lg:grid-cols-12 gap-8 md:gap-10">
                                        <div className="lg:col-span-4 flex flex-col items-center">
                                            {process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME ? (
                                                <CldUploadWidget
                                                    uploadPreset="storycut_uploads"
                                                    onSuccess={(result: any) => {
                                                        if (result.info && typeof result.info !== 'string') {
                                                            setFormData(prev => ({ ...prev, profile_image: result.info.secure_url }));
                                                        }
                                                    }}
                                                >
                                                    {({ open }) => (
                                                        <div
                                                            onClick={() => open()}
                                                            className="relative group cursor-pointer w-48 h-48 bg-gray-50 rounded-full flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-200 hover:border-black transition-all"
                                                        >
                                                            {formData.profile_image ? (
                                                                <img src={formData.profile_image} className="w-full h-full object-cover grayscale-[0.3] hover:grayscale-0 transition-all" />
                                                            ) : (
                                                                <div className="text-center">
                                                                    <Camera className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                                                                    <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Select Image</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </CldUploadWidget>
                                            ) : (
                                                <div className="w-48 h-48 bg-gray-50 rounded-full flex flex-col items-center justify-center border-2 border-dashed border-gray-200 p-4 text-center">
                                                    <AlertCircle className="w-8 h-8 text-amber-500 mb-2" />
                                                    <span className="text-[8px] font-black text-amber-600 uppercase tracking-[0.1em] mb-2 leading-tight">Cloudinary Details Missing</span>
                                                    <input
                                                        type="text"
                                                        placeholder="URL รูปภาพ (Image URL)"
                                                        value={formData.profile_image}
                                                        onChange={e => setFormData({ ...formData, profile_image: e.target.value })}
                                                        className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 text-[8px] font-bold outline-none"
                                                    />
                                                </div>
                                            )}
                                            <p className="text-[9px] font-black text-gray-300 mt-4 uppercase tracking-[0.2em] italic">Portfolio Masterpiece</p>
                                        </div>

                                        <div className="lg:col-span-8 space-y-6 md:space-y-8">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">ชื่อไทย (Thai Name)</label>
                                                    <input
                                                        required
                                                        type="text"
                                                        value={formData.name_th}
                                                        onChange={e => setFormData({ ...formData, name_th: e.target.value })}
                                                        className="w-full bg-gray-50 border-transparent focus:bg-white focus:ring-4 focus:ring-black/5 rounded-2xl px-6 py-4 text-sm font-bold outline-none transition-all placeholder:text-gray-200"
                                                        placeholder="เช่น จอห์น วิค"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Name EN</label>
                                                    <input
                                                        required
                                                        type="text"
                                                        value={formData.name_en}
                                                        onChange={e => setFormData({ ...formData, name_en: e.target.value })}
                                                        className="w-full bg-gray-50 border-transparent focus:bg-white focus:ring-4 focus:ring-black/5 rounded-2xl px-6 py-4 text-sm font-bold outline-none transition-all uppercase placeholder:text-gray-200"
                                                        placeholder="JOHN WICK"
                                                    />
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-1">Nickname</label>
                                                    <input
                                                        required
                                                        type="text"
                                                        value={formData.nickname}
                                                        onChange={e => setFormData({ ...formData, nickname: e.target.value })}
                                                        className="w-full bg-gray-50 border-transparent focus:bg-white focus:ring-4 focus:ring-black/5 rounded-2xl px-6 py-4 text-sm font-bold outline-none transition-all italic placeholder:text-gray-200"
                                                        placeholder="Wick"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] px-1 italic">Professional Title</label>
                                                    <input
                                                        required
                                                        type="text"
                                                        value={formData.position}
                                                        onChange={e => setFormData({ ...formData, position: e.target.value })}
                                                        className="w-full bg-black text-white border-transparent rounded-2xl px-6 py-4 text-sm font-black outline-none transition-all tracking-wider"
                                                        placeholder="Master Barber"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="h-px bg-gray-100" />

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20">
                                        <div className="space-y-6">
                                            <label className="text-[10px] font-black text-gray-900 uppercase tracking-[0.3em] flex items-center gap-3">
                                                <Calendar className="w-4 h-4" /> Weekly Off Days
                                            </label>
                                            <div className="flex justify-between items-center max-w-sm gap-2">
                                                {THAI_DAYS.map((day, idx) => (
                                                    <button
                                                        key={idx}
                                                        type="button"
                                                        onClick={() => handleToggleOffDay(idx)}
                                                        className={cn(
                                                            "w-10 h-10 md:w-12 md:h-12 rounded-full font-black text-[10px] md:text-[12px] transition-all flex items-center justify-center border-2",
                                                            formData.weekly_off_days.includes(idx)
                                                                ? "bg-black text-white border-black shadow-xl shadow-black/20 scale-110"
                                                                : "bg-white text-gray-300 border-gray-100 hover:border-gray-300"
                                                        )}
                                                    >
                                                        {day}
                                                    </button>
                                                ))}
                                            </div>
                                            <p className="text-[9px] font-bold text-gray-300 uppercase italic">Select days when this barber is not available for booking.</p>
                                        </div>

                                        <div className="space-y-6">
                                            <label className="text-[10px] font-black text-gray-900 uppercase tracking-[0.3em] flex items-center gap-3">
                                                <Lock className="w-4 h-4" /> Staff Access Code
                                            </label>
                                            <div className="relative group">
                                                <Lock className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-200 group-focus-within:text-black transition-colors" />
                                                <input
                                                    type="password"
                                                    inputMode="numeric"
                                                    maxLength={4}
                                                    required
                                                    placeholder="4-Digit PIN"
                                                    value={formData.pin_code}
                                                    onChange={e => setFormData({ ...formData, pin_code: e.target.value })}
                                                    className="w-full pl-16 pr-8 py-5 bg-gray-50 border-transparent focus:bg-white focus:ring-4 focus:ring-black/5 rounded-3xl text-xl font-black tracking-[1em] outline-none transition-all placeholder:tracking-normal placeholder:text-sm placeholder:font-bold"
                                                />
                                            </div>
                                            <div className="flex gap-4">
                                                {["active", "inactive"].map((s) => (
                                                    <button
                                                        key={s}
                                                        type="button"
                                                        onClick={() => setFormData({ ...formData, status: s as any })}
                                                        className={cn(
                                                            "flex-1 md:flex-none px-4 md:px-8 py-4 rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all border h-[48px] flex items-center justify-center",
                                                            formData.status === s ? "bg-green-500 text-white border-green-500" : "bg-white text-gray-300 border-gray-100 hover:bg-gray-50"
                                                        )}
                                                    >
                                                        {s === "active" ? "Enabled" : "On Vacation"}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 md:p-10 space-y-4 animate-in fade-in slide-in-from-right-4 duration-500">
                                    {isMappingLoading ? (
                                        <div className="flex flex-col items-center justify-center py-32 gap-6 grayscale">
                                            <Loader2 className="w-10 h-10 text-black animate-spin" />
                                            <p className="font-black text-gray-300 uppercase tracking-[0.4em] text-[10px]">Configuring Services Mapping...</p>
                                        </div>
                                    ) : allServices.map(service => {
                                        const state = mappingStates[service.id];
                                        if (!state) return null;
                                        return (
                                            <div key={service.id} className={cn(
                                                "p-6 md:p-8 rounded-[32px] md:rounded-[40px] border-2 transition-all flex flex-col lg:flex-row items-start lg:items-center gap-6 lg:gap-10",
                                                state.enabled ? "bg-white border-black shadow-2xl" : "bg-gray-50/50 border-gray-100 grayscale opacity-40 shadow-none border-dashed"
                                            )}>
                                                <div className="flex items-center gap-6 flex-1 w-full">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleToggleMapping(service.id)}
                                                        className={cn(
                                                            "w-16 h-10 rounded-full relative p-1.5 transition-all outline-none flex-shrink-0",
                                                            state.enabled ? "bg-black" : "bg-gray-200"
                                                        )}
                                                    >
                                                        <div className={cn(
                                                            "w-7 h-7 bg-white rounded-full transition-all shadow-md",
                                                            state.enabled ? "translate-x-6" : "translate-x-0"
                                                        )} />
                                                    </button>
                                                    <div className="min-w-0">
                                                        <h4 className="font-black text-lg md:text-xl italic tracking-tight truncate">{service.name_th}</h4>
                                                        <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Base Price: ฿{service.base_price}</p>
                                                    </div>
                                                </div>

                                                {state.enabled && (
                                                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 w-full lg:w-auto animate-in zoom-in-95 duration-300">
                                                        <div className="space-y-1.5">
                                                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Normal Price</label>
                                                            <input
                                                                type="number"
                                                                disabled={!state.enabled}
                                                                value={state.price_normal}
                                                                onChange={e => handleUpdateMappingField(service.id, "price_normal", e.target.value)}
                                                                className="w-full lg:w-32 bg-gray-50 disabled:bg-gray-100/50 border-transparent focus:bg-white focus:ring-4 focus:ring-black/5 rounded-2xl px-5 py-3 text-sm font-black outline-none transition-all"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest px-1">Promo Price</label>
                                                            <input
                                                                type="number"
                                                                disabled={!state.enabled}
                                                                value={state.price_promo || ""}
                                                                onChange={e => handleUpdateMappingField(service.id, "price_promo", e.target.value)}
                                                                className="w-full lg:w-32 bg-gray-50 disabled:bg-gray-100/50 border-transparent focus:bg-white focus:ring-4 focus:ring-black/5 rounded-2xl px-5 py-3 text-sm font-black outline-none transition-all italic text-red-500"
                                                                placeholder="None"
                                                            />
                                                        </div>
                                                        <div className="space-y-1.5 col-span-2 md:col-span-1">
                                                            <label className="text-[8px] font-black text-green-500 uppercase tracking-widest px-1">Commission</label>
                                                            <div className="relative">
                                                                <input
                                                                    type="number"
                                                                    disabled={!state.enabled}
                                                                    value={state.commission_fixed}
                                                                    onChange={e => handleUpdateMappingField(service.id, "commission_fixed", e.target.value)}
                                                                    className="w-full lg:w-32 bg-green-50 disabled:bg-gray-100/50 border-transparent focus:bg-white focus:ring-4 focus:ring-green-100 rounded-2xl px-5 py-3 text-sm font-black outline-none transition-all text-green-700 h-[48px]"
                                                                />
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        <div className="p-6 md:p-10 bg-white border-t border-gray-100 flex flex-col md:flex-row gap-4">
                            {editingBarber && (
                                <button
                                    type="button"
                                    onClick={() => handleDelete(editingBarber.id)}
                                    className="w-full md:w-auto px-10 py-5 rounded-3xl text-[10px] font-black text-red-400 uppercase tracking-widest hover:bg-red-50 transition-all text-center h-[56px] flex items-center justify-center"
                                >
                                    Resign Barber
                                </button>
                            )}
                            <button
                                disabled={isSaving}
                                type="submit"
                                className="flex-1 bg-black text-white py-5 md:py-6 rounded-[24px] md:rounded-[32px] font-black text-[11px] uppercase tracking-[0.4em] flex items-center justify-center gap-4 hover:bg-gray-800 transition-all active:scale-95 disabled:opacity-50 shadow-2xl shadow-black/20 h-[56px] md:h-auto"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                                {editingBarber ? "Synchronize & Update HQ" : "Welcome to the Crew"}
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
