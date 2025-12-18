"use client";
import { useState, useEffect } from 'react';
import { getBarbers } from '@/lib/db';
import Link from 'next/link';

export default function Home() {
  const [barbers, setBarbers] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getBarbers();
        setBarbers(data);
      } catch (error) {
        console.error("Failed to fetch barbers", error);
      }
    };
    fetchData();
  }, []);

  return (
    <main className="min-h-screen bg-zinc-50 flex flex-col items-center py-20 px-4">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-extrabold text-black tracking-tight mb-4">StoryCut</h1>
        <p className="text-xl text-zinc-600 font-light">Choose your Professional</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 w-full max-w-6xl">
        {barbers.map((barber) => (
          <Link
            key={barber.id}
            href={`/book/${barber.id}`}
            className="group bg-white rounded-lg border border-black p-6 transition-all duration-300 hover:shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-1 cursor-pointer block"
          >
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 bg-zinc-100 rounded-full mb-4 flex items-center justify-center border border-zinc-200 group-hover:border-black transition-colors">
                <span className="text-3xl font-bold text-zinc-400 group-hover:text-black">
                  {barber.nickname ? barber.nickname[0].toUpperCase() : (barber.name ? barber.name[0].toUpperCase() : '?')}
                </span>
              </div>
              <h2 className="text-2xl font-bold text-black mb-1">{barber.name}</h2>
              <p className="text-zinc-500 font-medium">{barber.nickname && `"${barber.nickname}"`}</p>
            </div>
          </Link>
        ))}
        {barbers.length === 0 && (
          <div className="col-span-full text-center text-zinc-500">
            Loading professionals...
          </div>
        )}
      </div>
    </main>
  );
}
