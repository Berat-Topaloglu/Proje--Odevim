import { createContext, useContext, useState } from "react";

const NotificationContext = createContext();

export function useNotification() {
    return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
    const [notification, setNotification] = useState(null);

    const showNotification = (message, type = "info", title = "Bilgi") => {
        setNotification({ message, type, title, isConfirm: false });
    };

    const showConfirm = (message, title = "Onay Gerekli", type = "warning") => {
        return new Promise((resolve) => {
            setNotification({
                message,
                title,
                type,
                isConfirm: true,
                onConfirm: () => {
                    setNotification(null);
                    resolve(true);
                },
                onCancel: () => {
                    setNotification(null);
                    resolve(false);
                }
            });
        });
    };

    // Siteye özel metin giriş modalı — window.prompt() yerine kullanılır
    const showPrompt = (message, title = "Bilgi Gir", placeholder = "") => {
        return new Promise((resolve) => {
            setNotification({
                message,
                title,
                type: "info",
                isPrompt: true,
                placeholder,
                onConfirm: (value) => {
                    setNotification(null);
                    resolve(value);
                },
                onCancel: () => {
                    setNotification(null);
                    resolve(null);
                }
            });
        });
    };

    const hideNotification = () => {
        if (notification?.isConfirm || notification?.isPrompt) {
            notification.onCancel();
        } else {
            setNotification(null);
        }
    };

    return (
        <NotificationContext.Provider value={{ showNotification, showConfirm, showPrompt, hideNotification, notification }}>
            {children}
        </NotificationContext.Provider>
    );
}
