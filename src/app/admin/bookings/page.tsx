"use client";
import { useState, useEffect } from 'react';
import { getBookings } from '@/lib/db';

interface Booking {
    id: string;
    dateTime: string;
    customerName: string;
    phone: string;
    barberName: string;
    serviceId: string;
    slipUrl?: string;
    createdAt?: { seconds: number };
}

export default function AdminBookingsPage() {
    const [bookings, setBookings] = useState<Booking[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const data = await getBookings();
                // Sort by date descending
                data.sort((a: any, b: any) => new Date(b.createdAt?.seconds * 1000).getTime() - new Date(a.createdAt?.seconds * 1000).getTime());
                setBookings(data as Booking[]);
            } catch (error) {
                console.error("Failed to fetch bookings", error);
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, []);

    if (loading) return <div className="p-8 text-center">Loading bookings...</div>;

    return (
        <div className="min-h-screen bg-zinc-50 p-8">
            <div className="max-w-6xl mx-auto">
                <h1 className="text-3xl font-bold text-black mb-8">Booking Management</h1>

                <div className="bg-white rounded-lg shadow border border-zinc-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-zinc-200">
                            <thead className="bg-zinc-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Date/Time</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Customer</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Barber</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Service ID</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-zinc-500 uppercase tracking-wider">Slip</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-zinc-200">
                                {bookings.map((booking) => (
                                    <tr key={booking.id} className="hover:bg-zinc-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900">
                                            {new Date(booking.dateTime).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900">
                                            <div className="font-medium">{booking.customerName}</div>
                                            <div className="text-zinc-500 text-xs">{booking.phone}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-900">
                                            {booking.barberName}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-500">
                                            {booking.serviceId}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                            {booking.slipUrl ? (
                                                <a
                                                    href={booking.slipUrl}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="text-indigo-600 hover:text-indigo-900 font-medium underline"
                                                >
                                                    View Slip
                                                </a>
                                            ) : (
                                                <span className="text-zinc-400">No Slip</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {bookings.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                                            No bookings found.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
