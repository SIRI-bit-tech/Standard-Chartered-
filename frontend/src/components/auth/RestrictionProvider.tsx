'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { RestrictionModal } from './RestrictionModal';
import posthog from 'posthog-js';

interface RestrictionContextType {
    isRestricted: boolean;
    showRestrictionModal: () => void;
}

const RestrictionContext = createContext<RestrictionContextType | undefined>(undefined);

export const RestrictionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { user } = useAuth();
    const [isModalOpen, setIsModalOpen] = useState(false);

    const isRestricted = !!user?.is_restricted;

    const showRestrictionModal = useCallback(() => {
        setIsModalOpen(true);
    }, []);

    // Intercept link clicks if restricted
    useEffect(() => {
        if (!isRestricted) return;

        const handleGlobalClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;

            // Check if clicked element or its parent is a Link (a tag) or an action Button
            const isInteractiveElement = target.closest('a') || target.closest('button');

            if (isInteractiveElement) {
                // Special case: Allow closing the banner or modal itself
                if (target.closest('[role="dialog"]') || target.closest('.restriction-allow')) {
                    return;
                }

                // Allow logout button? Usually yes.
                const isLogout = target.textContent?.toLowerCase().includes('log out') || target.textContent?.toLowerCase().includes('sign out');
                if (isLogout) return;

                // Otherwise, prevent default and show modal
                e.preventDefault();
                e.stopPropagation();

                // Track blocked action in PostHog
                const elementLabel = target.textContent?.trim().slice(0, 50) || target.tagName;
                posthog.capture('restricted_action_blocked', {
                    target_element: elementLabel,
                    url: window.location.pathname
                });

                showRestrictionModal();
            }
        };

        window.addEventListener('click', handleGlobalClick, true);
        return () => window.removeEventListener('click', handleGlobalClick, true);
    }, [isRestricted, showRestrictionModal]);

    return (
        <RestrictionContext.Provider value={{ isRestricted, showRestrictionModal }}>
            {children}
            <RestrictionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />
        </RestrictionContext.Provider>
    );
};

export const useRestriction = () => {
    const context = useContext(RestrictionContext);
    if (context === undefined) {
        throw new Error('useRestriction must be used within a RestrictionProvider');
    }
    return context;
};
