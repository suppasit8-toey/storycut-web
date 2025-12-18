"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getBarberById, getServices, addBooking } from '@/lib/db';

export default function BookingPage() {
    const params = useParams();
    const router = useRouter();
    const id = params.id as string;

    const [barber, setBarber] = useState<any>(null);
    const [services, setServices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Form State
    const [selectedService, setSelectedService] = useState('');
    const [dateTime, setDateTime] = useState('');
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [status, setStatus] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            try {
                const [barberData, servicesData] = await Promise.all([
                    getBarberById(id),
                    getServices()
                ]);
                setBarber(barberData);
                setServices(servicesData);
            } catch (error) {
                console.error("Error fetching data:", error);
                setStatus('Error loading data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('Processing booking...');
        try {
            await addBooking({
                barberId: id,
                barberName: barber?.name,
                serviceId: selectedService,
                dateTime,
                customerName: name,
                phone
            });
            router.push('/success');
        } catch (error) {
            console.error("Booking failed:", error);
            setStatus('Error confirming booking. Please try again.');
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center text-zinc-500">Loading booking...</div>;
    if (!barber) return <div className="min-h-screen flex items-center justify-center text-red-500">Barber not found</div>;

    return (
        <div className="min-h-screen bg-zinc-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md mx-auto bg-white rounded-lg border border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-black mb-2">{barber.name}</h2>
                    <p className="text-zinc-600">Complete your booking</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Services */}
                    <div>
                        <label className="block text-sm font-bold text-black mb-3">Select Service</label>
                        <div className="space-y-3">
                            {services.map((service) => (
                                <div key={service.id} className="flex items-center">
                                    <input
                                        id={service.id}
                                        name="service"
                                        type="radio"
                                        required
                                        value={service.id}
                                        onChange={(e) => setSelectedService(e.target.value)}
                                        className="h-4 w-4 border-zinc-300 text-black focus:ring-black"
                                    />
                                    <label htmlFor={service.id} className="ml-3 block text-sm font-medium text-zinc-700 w-full cursor-pointer">
                                        <span className="flex justify-between w-full">
                                            <span>{service.title} ({service.duration}m)</span>
                                            <span className="font-semibold">${service.price}</span>
                                        </span>
                                    </label>
                                </div>
                            ))}
                            {services.length === 0 && <p className="text-sm text-zinc-500">No services available.</p>}
                        </div>
                    </div>

                    {/* Date/Time */}
                    <div>
                        <label htmlFor="datetime" className="block text-sm font-bold text-black mb-1">Date & Time</label>
                        <input
                            type="datetime-local"
                            id="datetime"
                            required
                            value={dateTime}
                            onChange={(e) => setDateTime(e.target.value)}
                            className="block w-full rounded-md border-zinc-300 shadow-sm focus:border-black focus:ring-black sm:text-sm p-2 border"
                        />
                    </div>

                    {/* Customer Info */}
                    <div>
                        <label htmlFor="name" className="block text-sm font-bold text-black mb-1">Your Name</label>
                        <input
                            type="text"
                            id="name"
                            required
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="block w-full rounded-md border-zinc-300 shadow-sm focus:border-black focus:ring-black sm:text-sm p-2 border"
                        />
                    </div>

                    <div>
                        <label htmlFor="phone" className="block text-sm font-bold text-black mb-1">Phone Number</label>
                        <input
                            type="tel"
                            id="phone"
                            required
                            placeholder="(555) 123-4567"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            className="block w-full rounded-md border-zinc-300 shadow-sm focus:border-black focus:ring-black sm:text-sm p-2 border"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-black hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black transition-colors"
                    >
                        Confirm Booking
                    </button>
                </form>
                {status && <p className="mt-4 text-center text-sm font-medium text-black">{status}</p>}
            </div>
        </div>
    );
}
