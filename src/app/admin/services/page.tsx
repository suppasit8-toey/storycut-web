"use client";
import { useState, useEffect } from 'react';
import { addService, getServices } from '@/lib/db';

export default function ServicesPage() {
    const [title, setTitle] = useState('');
    const [price, setPrice] = useState('');
    const [duration, setDuration] = useState('');
    const [status, setStatus] = useState('');
    const [services, setServices] = useState<any[]>([]);

    const fetchServices = async () => {
        try {
            const data = await getServices();
            setServices(data);
        } catch (error) {
            console.error("Failed to fetch services", error);
        }
    };

    useEffect(() => {
        fetchServices();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('Adding service...');
        try {
            await addService({
                title,
                price: Number(price),
                duration: Number(duration)
            });
            setStatus('Service added successfully');
            setTitle('');
            setPrice('');
            setDuration('');
            fetchServices();
        } catch (error) {
            console.error(error);
            setStatus('Error adding service');
        }
    };

    return (
        <div className="min-h-screen bg-zinc-100 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
            <div className="w-full max-w-md space-y-8">
                <div className="bg-white p-8 rounded-lg shadow border border-zinc-200">
                    <h2 className="text-2xl font-bold text-center text-zinc-900 mb-8">Manage Services</h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-zinc-700">Service Title</label>
                            <input
                                type="text"
                                required
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="mt-1 block w-full rounded-md border text-zinc-900 border-zinc-300 px-3 py-2 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                                placeholder="e.g. Haircut"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-zinc-700">Price ($)</label>
                                <input
                                    type="number"
                                    required
                                    value={price}
                                    onChange={(e) => setPrice(e.target.value)}
                                    className="mt-1 block w-full rounded-md border text-zinc-900 border-zinc-300 px-3 py-2 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                                    placeholder="30"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-zinc-700">Duration (min)</label>
                                <input
                                    type="number"
                                    required
                                    value={duration}
                                    onChange={(e) => setDuration(e.target.value)}
                                    className="mt-1 block w-full rounded-md border text-zinc-900 border-zinc-300 px-3 py-2 focus:border-black focus:outline-none focus:ring-1 focus:ring-black sm:text-sm"
                                    placeholder="45"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            className="group relative flex w-full justify-center rounded-md bg-black px-3 py-2 text-sm font-semibold text-white hover:bg-zinc-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
                        >
                            Add Service
                        </button>
                    </form>
                    {status && <p className="mt-4 text-center text-sm text-zinc-600">{status}</p>}
                </div>

                <div className="bg-white shadow rounded-lg border border-zinc-200 overflow-hidden">
                    <div className="px-4 py-5 sm:px-6 border-b border-zinc-200">
                        <h3 className="text-lg font-medium leading-6 text-zinc-900">Existing Services</h3>
                    </div>
                    <ul role="list" className="divide-y divide-zinc-200">
                        {services.map((service) => (
                            <li key={service.id} className="px-4 py-4 sm:px-6 hover:bg-zinc-50 transition-colors">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <p className="text-sm font-medium text-zinc-900">{service.title}</p>
                                        <p className="flex items-center text-sm text-zinc-500">
                                            {service.duration} mins
                                        </p>
                                    </div>
                                    <div className="text-sm font-semibold text-zinc-900">
                                        ${service.price}
                                    </div>
                                </div>
                            </li>
                        ))}
                        {services.length === 0 && (
                            <li className="px-4 py-8 text-center text-sm text-zinc-500">
                                No services found. Add one above.
                            </li>
                        )}
                    </ul>
                </div>
            </div>
        </div>
    );
}
