'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { RestrictionModal } from './RestrictionModal';
import { trackEvent } from '@/lib/analytics';

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
            const anchor = target.closest('a');
            const button = target.closest('button');
            const isInteractiveElement = anchor || button;

            if (isInteractiveElement) {
                // 1. Explicitly allowed selectors/roles
                const isAllowedSelector = !!target.closest([
                    '[role="dialog"]',
                    '.restriction-allow',
                    '.restriction-recovery',
                    '.help-link',
                    '.support-link',
                    '.bottom-navbar',
                    '[data-restriction-allow]'
                ].join(','));

                if (isAllowedSelector) return;

                // 2. Recovery-specific hrefs (support, mailto, etc)
                const href = anchor?.getAttribute('href')?.toLowerCase() || '';
                const isRecoveryRoute = [
                    '/support',
                    '/help',
                    '/contact',
                    'mailto:',
                    'tel:'
                ].some(path => href.includes(path));

                if (isRecoveryRoute) return;

                // 3. Robust Logout detection
                const text = target.textContent?.toLowerCase().trim() || '';
                const isLogout = text === 'log out' || text === 'sign out' || text.includes('logout') || text.includes('signout');
                if (isLogout) return;

                // Otherwise, prevent default and show modal
                e.preventDefault();
                e.stopPropagation();

                // Track blocked action in PostHog
                const elementLabel = target.textContent?.trim().slice(0, 50) || target.tagName;
                trackEvent('restricted_action_blocked', {
                    target_element: elementLabel,
                    url: window.location.pathname,
                    target_href: href || undefined
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
