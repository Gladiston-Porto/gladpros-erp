'use client';

import { useEffect, useState } from 'react';
import { useAccessibility } from '@/hooks/useAccessibility';

export function ScreenReaderAnnouncer() {
  const { announcements } = useAccessibility();
  const [currentAnnouncement, setCurrentAnnouncement] = useState<string>('');

  useEffect(() => {
    if (announcements.length > 0) {
      const latest = announcements[announcements.length - 1];
      setCurrentAnnouncement(latest);

      // Clear after screen reader has time to read it
      const timer = setTimeout(() => {
        setCurrentAnnouncement('');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [announcements]);

  if (!currentAnnouncement) return null;

  return (
    <div
      aria-live="assertive"
      aria-atomic="true"
      className="sr-only"
      role="status"
    >
      {currentAnnouncement}
    </div>
  );
}

// Component for polite announcements (less urgent)
export function PoliteAnnouncer({ message }: { message: string }) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      className="sr-only"
      role="status"
    >
      {message}
    </div>
  );
}

// Hook for managing focus
export function useFocusManagement() {
  const setFocus = (element: HTMLElement | null) => {
    if (element) {
      element.focus();
    }
  };

  const returnFocus = (previousElement: HTMLElement | null) => {
    if (previousElement) {
      previousElement.focus();
    }
  };

  return { setFocus, returnFocus };
}
