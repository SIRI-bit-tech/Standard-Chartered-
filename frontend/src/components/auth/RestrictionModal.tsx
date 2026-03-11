'use client';

import React from 'react';
import { X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";
import { ShieldAlert } from 'lucide-react';

interface RestrictionModalProps {
    isOpen: boolean;
    onClose: () => void;
    userName?: string;
}

export const RestrictionModal: React.FC<RestrictionModalProps> = ({ isOpen, onClose, userName = 'Valued Customer' }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-[400px] p-0 overflow-hidden border-none rounded-lg shadow-2xl">
                {/* Standard Chartered Header */}
                <div className="bg-[#0066CC] text-white px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <img src="/logo.png" alt="Standard Chartered" className="h-5 w-auto brightness-0 invert" />
                        <span className="font-bold tracking-tight text-base">Standard Chartered</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="hover:bg-white/20 p-1 rounded transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 bg-white">
                    <div className="flex items-center gap-2 text-[#d32f2f] mb-4 bg-red-50 p-2 rounded border border-red-100">
                        <ShieldAlert size={20} />
                        <span className="font-bold text-sm">SECURITY ALERT: SC-ACCOUNT-LOCK</span>
                    </div>

                    <div className="space-y-4 text-sm leading-relaxed text-[#333]">
                        <p className="font-semibold text-base italic">Dear {userName},</p>
                        <p>
                            Your account has been temporarily restricted due to unusual activity detected from an unrecognized location. 
                            For your security, all outgoing transfers have been suspended. 
                            Please contact Standard Chartered support via secure message or call our 24/7 helpline for immediate assistance.
                        </p>
                    </div>

                    <div className="mt-6">
                        <button
                            onClick={onClose}
                            className="w-full py-2.5 bg-[#0066CC] text-white font-medium rounded hover:bg-[#0052a3] transition-colors"
                        >
                            Understood
                        </button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};
