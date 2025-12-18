import { Kanit } from "next/font/google";
import type { Metadata } from "next";

const kanit = Kanit({
    weight: ['300', '400', '500', '600', '700'],
    subsets: ['latin', 'thai'],
    display: 'swap',
    variable: '--font-kanit',
});

export const metadata: Metadata = {
    title: "StoryCut Booking",
    description: "Book your haircut appointment",
};

export default function BookingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className={`${kanit.variable} font-[family-name:var(--font-kanit)] bg-[#121212] min-h-screen w-full flex items-center justify-center md:py-8`}>
            <div className="w-full max-w-[400px] bg-white min-h-[100dvh] md:min-h-[812px] md:h-auto md:max-h-[850px] md:rounded-[32px] shadow-2xl overflow-hidden relative flex flex-col">
                {children}
            </div>
        </div>
    );
}
