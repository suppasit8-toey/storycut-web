"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function BranchesPage() {
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({ name: "", slug: "", lineContactLink: "" });
    const [error, setError] = useState("");
    const [creating, setCreating] = useState(false);

    const router = useRouter();

    useEffect(() => {
        fetchBranches();
    }, []);

    const fetchBranches = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "branches"));
            const branchList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setBranches(branchList);
        } catch (err) {
            console.error("Error fetching branches:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setCreating(true);

        const { name, slug, lineContactLink } = formData;

        // Basic Slug Validation
        if (!/^[a-z0-9-]+$/.test(slug)) {
            setError("Slug must contain only lowercase letters, numbers, and hyphens.");
            setCreating(false);
            return;
        }

        try {
            // Check Uniqueness
            const docRef = doc(db, "branches", slug);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                setError("This slug is already taken. Please choose another.");
                setCreating(false);
                return;
            }

            // Create Branch
            await setDoc(docRef, {
                name,
                slug,
                lineContactLink,
                createdAt: new Date().toISOString(),
                // Initialize other fields as empty or defaults if needed
                active: true
            });

            router.push(`/admin/branches/${slug}`);
        } catch (err) {
            console.error("Error creating branch:", err);
            setError("Failed to create branch. Please try again.");
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-black text-white p-6 md:p-10">
            <div className="max-w-7xl mx-auto">
                <div className="flex justify-between items-end mb-8">
                    <div>
                        <h1 className="text-4xl font-black italic tracking-tighter text-white mb-2 font-inter uppercase">BRANCHES</h1>
                        <p className="text-gray-400 text-xs font-bold uppercase tracking-[0.2em]">BRANCH LOCATIONS</p>
                    </div>

                    {/* Icon-only Button for Mobile Optimization */}
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="w-12 h-12 bg-white text-black rounded-lg flex items-center justify-center hover:bg-gray-200 transition-all shadow-lg hover:scale-105 active:scale-95"
                        aria-label="Create Branch"
                    >
                        <Plus className="w-6 h-6 stroke-[3]" />
                    </button>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {branches.map((branch) => (
                            <Link
                                key={branch.id}
                                href={`/admin/branches/${branch.slug}`}
                                className="block group"
                            >
                                <div className="bg-[#1A1A1A] rounded-[32px] p-6 border border-transparent group-hover:border-gray-700 transition-all h-full flex flex-col justify-between min-h-[160px]">
                                    <div>
                                        <h3 className="text-xl font-bold text-white mb-2">{branch.name}</h3>
                                        <p className="text-gray-500 font-mono text-sm">/{branch.slug}</p>
                                    </div>
                                    <div className="flex items-center text-sm font-medium text-gray-400 group-hover:text-white mt-4 transition-colors">
                                        Manage Location
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 ml-1">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                        </svg>
                                    </div>
                                </div>
                            </Link>
                        ))}

                        {branches.length === 0 && (
                            <div className="col-span-full text-center py-20 text-gray-500 bg-[#0A0A0A] rounded-[32px] border border-[#1A1A1A]">
                                <p>No branches found. Create your first one.</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Modal */}
                {isModalOpen && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <div className="bg-[#1A1A1A] rounded-[32px] w-full max-w-md p-8 border border-gray-800 shadow-2xl">
                            <h2 className="text-2xl font-black italic text-white mb-6 uppercase tracking-tight">New Branch</h2>

                            <form onSubmit={handleCreate} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Branch Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
                                        placeholder="e.g. StoryCut Siam"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Slug (URL ID)</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.slug}
                                        onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                        className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
                                        placeholder="e.g. siam-branch"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">Only lowercase letters, numbers, and hyphens.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-400 mb-1">Line@ Link (Optional)</label>
                                    <input
                                        type="url"
                                        value={formData.lineContactLink}
                                        onChange={(e) => setFormData({ ...formData, lineContactLink: e.target.value })}
                                        className="w-full bg-black border border-gray-800 rounded-lg px-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-white transition-colors"
                                        placeholder="https://line.me/ti/p/..."
                                    />
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-900/20 border border-red-900/50 rounded-lg text-red-200 text-sm">
                                        {error}
                                    </div>
                                )}

                                <div className="flex gap-3 mt-8 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="flex-1 px-4 py-3 rounded-lg font-medium text-gray-400 hover:bg-white/5 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="flex-1 bg-white text-black px-4 py-3 rounded-lg font-bold hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {creating ? "Creating..." : "Create Branch"}
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
