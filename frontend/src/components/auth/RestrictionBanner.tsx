'use client';

import React, { useState, useEffect } from 'react';
import { X, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface RestrictionBannerProps {
    userName: string;
}

export const RestrictionBanner: React.FC<RestrictionBannerProps> = ({ userName }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Show banner after a short delay for effect
        const timer = setTimeout(() => setIsVisible(true), 1000);
        return () => clearTimeout(timer);
    }, []);

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="w-full bg-[#f8f9fa] border-b border-gray-200 overflow-hidden shadow-md"
            >
                {/* SCIB-style Header */}
                <div className="bg-[#0066CC] text-white px-4 py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <img src="/SCIB logo.svg" alt="SCIB" className="h-6 w-auto brightness-0 invert" />
                        <span className="font-bold tracking-tight text-lg">SCIB</span>
                    </div>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="hover:bg-white/20 p-1 rounded-full transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content Area */}
                <div className="p-4 sm:p-6 text-[#333]">
                    <div className="flex items-center gap-2 text-[#d32f2f] mb-4 bg-red-50 p-2 rounded">
                        <ShieldAlert size={20} />
                        <span className="font-bold">SECURITY ALERT: SC-ACCOUNT-LOCK</span>
                    </div>

                    <div className="space-y-4 text-sm sm:text-base leading-relaxed">
                        <p className="font-semibold text-lg">Dear {userName},</p>
                        <p>
                            Your account has been temporarily restricted due to unusual activity detected from an unrecognized location.
                            For your security, all outgoing transfers have been suspended.
                            Please contact SCIB support via secure message or call our 24/7 helpline for immediate assistance.
                        </p>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
