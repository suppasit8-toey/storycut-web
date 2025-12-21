"use client";

import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { Search, Loader2, Edit3, Trash2 } from "lucide-react";

interface Customer {
    id: string;
    name: string;
    phone: string;
    totalVisits?: number;
    lastVisit?: string;
    totalSpent?: number;
}

export default function CustomersPage() {
    // Mock Data integration point - in real app, fetch from 'customers' or aggregate from bookings
    // For now, let's fetch unique customers from bookings or a customers collection if it existed.
    // The prompt implies "Customers" module. I will assume a customers collection or mock it if empty.

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    useEffect(() => {
        // Fetch customers - assume 'customers' collection exists or we aggregate from bookings
        // For this task, I'll attempt to fetch from 'customers' collection.
        // If it doesn't exist, it will be empty which is handled.

        const q = query(collection(db, "customers"), orderBy("name"));
        const unsub = onSnapshot(q, (snap) => {
            const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Customer));
            setCustomers(data);
            setLoading(false);
        }, (err) => {
            console.log("No customers collection found or permission denied, using mock/empty", err);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const filteredCustomers = customers.filter(c =>
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone.includes(searchTerm)
    );

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-10 pb-20 font-sans animate-in fade-in duration-500">
            <div className="max-w-[1600px] mx-auto">
                <header className="mb-10 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-3xl font-black italic tracking-tighter text-white mb-2 font-inter">Customers</h1>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Client Database</p>
                    </div>

                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Search client..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-[#1A1A1A] border border-white/5 rounded-full pl-10 pr-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-white/20 transition-colors font-bold"
                        />
                    </div>
                </header>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-white opacity-50" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredCustomers.length === 0 ? (
                            <div className="bg-[#1A1A1A] rounded-[32px] p-20 text-center border border-white/5">
                                <p className="text-gray-600 font-bold uppercase tracking-widest">No customers found</p>
                            </div>
                        ) : (
                            filteredCustomers.map((customer) => (
                                <div key={customer.id} className="bg-[#1A1A1A] rounded-[32px] p-8 flex flex-col md:flex-row items-center justify-between border border-transparent hover:border-white/10 transition-colors group">
                                    <div className="flex flex-col md:flex-row items-center gap-6 w-full md:w-auto text-center md:text-left">
                                        <div className="w-16 h-16 rounded-full bg-[#0A0A0A] border border-white/5 flex items-center justify-center text-white font-black text-xl shadow-lg">
                                            {customer.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h3 className="text-2xl font-black text-white uppercase tracking-tight mb-1">{customer.name}</h3>
                                            <div className="text-sm font-bold text-gray-500 font-mono tracking-wide">{customer.phone}</div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-12 w-full md:w-auto mt-6 md:mt-0 justify-between md:justify-end">
                                        <div className="text-right hidden md:block">
                                            <div className="text-[10px] text-gray-600 uppercase font-black tracking-widest mb-1">Total Visits</div>
                                            <div className="text-white font-bold text-xl">{customer.totalVisits || 0}</div>
                                        </div>

                                        <div className="text-right hidden md:block">
                                            <div className="text-[10px] text-gray-600 uppercase font-black tracking-widest mb-1">Total Spent</div>
                                            <div className="text-white font-bold text-xl">฿{(customer.totalSpent || 0).toLocaleString()}</div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button className="w-12 h-12 flex items-center justify-center rounded-full bg-black border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition-colors">
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
