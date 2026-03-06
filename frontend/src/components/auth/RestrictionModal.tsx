'use client';

import React from 'react';
import { X } from 'lucide-react';
import {
    Dialog,
    DialogContent,
} from "@/components/ui/dialog";

interface RestrictionModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const RestrictionModal: React.FC<RestrictionModalProps> = ({ isOpen, onClose }) => {
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
                <div className="p-8 bg-white text-center">
                    <p className="text-[#333] text-lg font-medium leading-snug">
                        This feature is temporarily unavailable for your account.
                    </p>
                </div>

                {/* Optional Footer/Action if needed, but the image shows a simple modal */}
            </DialogContent>
        </Dialog>
    );
};
