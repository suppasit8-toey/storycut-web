"use client";

import { Search, MapPin, Calendar, Clock, CreditCard, ChevronRight } from "lucide-react";
import Link from "next/link";

export default function BookingStatusPage() {
    return (
        <div className="h-full flex flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white px-6 py-4 flex items-center gap-3 shadow-sm z-10">
                <Link href="/booking">
                    <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                        <ChevronRight className="w-5 h-5 rotate-180" />
                    </button>
                </Link>
                <h1 className="font-bold text-lg">สถานะการจองของคุณ</h1>
            </div>

            <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                {/* Search Section */}
                <div className="flex gap-2">
                    <input
                        type="tel"
                        placeholder="เบอร์โทรศัพท์"
                        className="flex-1 p-3 rounded-xl border border-gray-300 placeholder:text-gray-400 text-gray-900 focus:outline-none focus:ring-2 focus:ring-black"
                        defaultValue="081-234-5678"
                    />
                    <button className="bg-black text-white px-6 rounded-xl font-bold text-sm hover:bg-gray-800 transition-colors">
                        ค้นหา
                    </button>
                </div>

                {/* Booking Card */}
                <div className="bg-white rounded-3xl p-6 shadow-lg border border-gray-100 relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700 border border-yellow-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 mr-2 animate-pulse" />
                            รอการยืนยัน
                        </span>
                    </div>

                    <div className="mb-6">
                        <div className="text-gray-600 text-xs font-bold uppercase tracking-wider mb-2">เวลานัดหมาย</div>
                        <div className="flex items-center gap-3 mb-1">
                            <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-black">
                                <Calendar className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-bold text-lg text-gray-900">20 ธ.ค. 2567</div>
                                <div className="text-xs text-gray-600">วันศุกร์</div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-black/5 flex items-center justify-center text-black">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <div className="font-bold text-lg text-gray-900">14:00</div>
                                <div className="text-xs text-gray-600">ระยะเวลา 45 นาที</div>
                            </div>
                        </div>
                    </div>

                    <div className="h-px bg-gray-100 w-full mb-6" />

                    <div className="space-y-4 mb-6">
                        <div className="flex justify-between">
                            <span className="text-gray-600 text-sm">บริการ</span>
                            <span className="font-bold text-gray-900">ตัดผม + โกนหนวด</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 text-sm">ช่าง</span>
                            <span className="font-bold text-gray-900">ช่างเจ</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600 text-sm">ราคา</span>
                            <span className="font-bold text-gray-900">500 ฿</span>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl flex gap-3 items-start">
                        <div className="bg-blue-100 p-2 rounded-full text-blue-600 mt-0.5">
                            <CreditCard className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="font-bold text-sm text-blue-900 mb-0.5">แจ้งโอนเงินแล้ว</div>
                            <div className="text-xs text-blue-800 font-medium leading-relaxed">
                                เจ้าหน้าที่กำลังตรวจสอบสลิปการโอนเงินของคุณ กรุณารอการยืนยันสักครู่
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-6 text-center text-xs text-gray-300">
                StoryCut App v1.0
            </div>
        </div>
    );
}
