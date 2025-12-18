"use client";
import Link from 'next/link';

export default function SuccessPage() {
    return (
        <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center p-4 text-center">
            <div className="bg-white p-8 rounded-lg border border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] max-w-md w-full">
                <h1 className="text-4xl font-extrabold text-black mb-4">Thank You!</h1>
                <p className="text-xl text-zinc-600 mb-8">Your booking has been confirmed.</p>

                <Link
                    href="/"
                    className="inline-block w-full py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-bold text-white bg-black hover:bg-zinc-800 transition-colors"
                >
                    Back to Home
                </Link>
            </div>
        </div>
    );
}
