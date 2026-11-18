import { createContext } from 'react';

export const TermsAcceptanceContext = createContext<(() => Promise<void>) | null>(null);
