"use client";
import { useState } from 'react';
import { addBarber } from '@/lib/db';

export default function AddBarberPage() {
    const [name, setName] = useState('');
    const [nickname, setNickname] = useState('');
    const [status, setStatus] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('Loading...');
        try {
            await addBarber({ name, nickname });
            setStatus('Barber added successfully!');
            setName('');
            setNickname('');
        } catch (error) {
            console.error(error);
            setStatus('Error adding barber.');
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
                <h1 className="text-2xl font-bold mb-6 text-gray-800">Add New Barber</h1>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700">Barber Name</label>
                        <input
                            type="text"
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                            placeholder="e.g. John Doe"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="nickname" className="block text-sm font-medium text-gray-700">Nickname</label>
                        <input
                            type="text"
                            id="nickname"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
                            placeholder="e.g. Johnny"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Add Barber
                    </button>
                </form>
                {status && <p className="mt-4 text-center text-sm text-gray-600">{status}</p>}
            </div>
        </div>
    );
}
