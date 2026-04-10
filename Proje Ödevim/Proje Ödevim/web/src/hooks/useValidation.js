import { useState, useCallback } from "react";

/**
 * Standardized Hook for Form/Modal Validation & State Management
 * Ensures 100% synchronization of error handling and loading indicators.
 */
export function useValidation() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [modalError, setModalError] = useState("");

    const clearStatus = useCallback(() => {
        setError("");
        setModalError("");
        setSuccess("");
    }, []);

    const setStatusError = useCallback((msg, isModal = false) => {
        if (isModal) {
            setModalError(msg);
        } else {
            setError(msg);
        }
    }, []);

    return {
        loading,
        setLoading,
        error,
        setError: (msg) => setStatusError(msg, false),
        success,
        setSuccess,
        modalError,
        setModalError: (msg) => setStatusError(msg, true),
        clearStatus
    };
}
