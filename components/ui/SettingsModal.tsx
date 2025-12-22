import React from 'react';

/**
 * This component is intentionally disabled and returns null.
 * Per project guidelines, API key management is handled via environment
 * variables (process.env.API_KEY) and not through a user interface.
 * This change resolves the original compilation error by removing the
 * dependency on a context that does not provide API key state.
 */
const SettingsModal: React.FC<{ isOpen: boolean; onClose: () => void; }> = () => {
  return null;
};

export default SettingsModal;
