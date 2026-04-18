'use client';

import { useEffect, useState, useCallback } from 'react';

export interface AccessibilityOptions {
  highContrast?: boolean;
  largeText?: boolean;
  reducedMotion?: boolean;
  screenReader?: boolean;
}

export function useAccessibility() {
  const [options, setOptions] = useState<AccessibilityOptions>({
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    screenReader: false,
  });

  const [announcements, setAnnouncements] = useState<string[]>([]);

  // Detect screen reader
  useEffect(() => {
    const detectScreenReader = () => {
      // Check for screen reader by testing if user is navigating with keyboard
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Tab') {
          setOptions(prev => ({ ...prev, screenReader: true }));
          document.removeEventListener('keydown', handleKeyDown);
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      // Also check for common screen reader indicators
      const hasScreenReader =
        navigator.userAgent.includes('NVDA') ||
        navigator.userAgent.includes('JAWS') ||
        navigator.userAgent.includes('VoiceOver') ||
        document.querySelector('[aria-live]') !== null;

      if (hasScreenReader) {
        setOptions(prev => ({ ...prev, screenReader: true }));
      }
    };

    detectScreenReader();
  }, []);

  // Detect user preferences
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const contrastQuery = window.matchMedia('(prefers-contrast: high)');

    const updateOptions = () => {
      setOptions(prev => ({
        ...prev,
        reducedMotion: mediaQuery.matches,
        highContrast: contrastQuery.matches,
      }));
    };

    updateOptions();

    mediaQuery.addEventListener('change', updateOptions);
    contrastQuery.addEventListener('change', updateOptions);

    return () => {
      mediaQuery.removeEventListener('change', updateOptions);
      contrastQuery.removeEventListener('change', updateOptions);
    };
  }, []);

  // Announce to screen readers
  const announce = useCallback((message: string) => {
    setAnnouncements(prev => [...prev, message]);

    // Clear announcements after they're read
    setTimeout(() => {
      setAnnouncements(prev => prev.filter(msg => msg !== message));
    }, 1000);
  }, []);

  // Skip to content
  const skipToContent = useCallback((targetId: string) => {
    const element = document.getElementById(targetId);
    if (element) {
      element.focus();
      element.scrollIntoView({ behavior: 'smooth' });
      announce(`Navegando para ${element.textContent || targetId}`);
    }
  }, [announce]);

  // Focus trap for modals
  const createFocusTrap = useCallback((container: HTMLElement) => {
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus();
          e.preventDefault();
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus();
          e.preventDefault();
        }
      }
    };

    container.addEventListener('keydown', handleTabKey);

    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  }, []);

  return {
    options,
    announce,
    skipToContent,
    createFocusTrap,
    announcements,
  };
}

// Hook for managing ARIA attributes
export function useAriaAttributes() {
  const generateId = useCallback(() => {
    return `aria-${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  const getAriaProps = useCallback((props: {
    label?: string;
    describedBy?: string;
    labelledBy?: string;
    expanded?: boolean;
    hasPopup?: boolean | 'menu' | 'listbox' | 'tree' | 'grid' | 'dialog';
    current?: boolean | 'page' | 'step' | 'location' | 'date' | 'time';
    invalid?: boolean;
    required?: boolean;
    disabled?: boolean;
    busy?: boolean;
    live?: 'off' | 'assertive' | 'polite';
    atomic?: boolean;
  }) => {
    const ariaProps: Record<string, string | boolean | number> = {};

    if (props.label) ariaProps['aria-label'] = props.label;
    if (props.describedBy) ariaProps['aria-describedby'] = props.describedBy;
    if (props.labelledBy) ariaProps['aria-labelledby'] = props.labelledBy;
    if (props.expanded !== undefined) ariaProps['aria-expanded'] = props.expanded;
    if (props.hasPopup) ariaProps['aria-haspopup'] = props.hasPopup;
    if (props.current) ariaProps['aria-current'] = props.current;
    if (props.invalid) ariaProps['aria-invalid'] = props.invalid;
    if (props.required) ariaProps['aria-required'] = props.required;
    if (props.disabled) ariaProps['aria-disabled'] = props.disabled;
    if (props.busy) ariaProps['aria-busy'] = props.busy;
    if (props.live) ariaProps['aria-live'] = props.live;
    if (props.atomic) ariaProps['aria-atomic'] = props.atomic;

    return ariaProps;
  }, []);

  return {
    generateId,
    getAriaProps,
  };
}
