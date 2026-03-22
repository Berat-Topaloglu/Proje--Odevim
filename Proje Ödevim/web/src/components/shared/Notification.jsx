import { useState } from "react";
import { useNotification } from "../../context/NotificationContext";
import "./Notification.css";

export default function Notification() {
    const { notification, hideNotification } = useNotification();
    const [promptValue, setPromptValue] = useState("");

    if (!notification) return null;

    const { message, type, title, isConfirm, isPrompt, placeholder, onConfirm, onCancel } = notification;

    const getIcon = () => {
        switch (type) {
            case "success": return "✅";
            case "error":   return "❌";
            case "warning": return "⚠️";
            default:        return "ℹ️";
        }
    };

    const handlePromptConfirm = () => {
        if (!promptValue.trim()) return;
        onConfirm(promptValue.trim());
        setPromptValue("");
    };

    const handlePromptCancel = () => {
        onCancel();
        setPromptValue("");
    };

    return (
        <div className="notification-overlay" onClick={isPrompt || isConfirm ? undefined : hideNotification}>
            <div className={`notification-modal animate-scale-up ${type || 'info'}`} onClick={e => e.stopPropagation()}>
                <div className="notification-header">
                    <span className="notification-icon">{getIcon()}</span>
                    <h2 className="notification-title">{title || (type === "error" ? "Sistem Hatası" : "Bilgi")}</h2>
                </div>
                <div className="notification-body">
                    <p>{message}</p>
                    {isPrompt && (
                        <input
                            type="text"
                            className="form-input mt-12"
                            placeholder={placeholder || "Mesajınızı yazın..."}
                            value={promptValue}
                            onChange={e => setPromptValue(e.target.value)}
                            onKeyDown={e => e.key === "Enter" && handlePromptConfirm()}
                            autoFocus
                            style={{ width: "100%", marginTop: "12px" }}
                        />
                    )}
                </div>
                <div className="notification-actions">
                    {isPrompt ? (
                        <div className="confirm-actions">
                            <button
                                className="btn btn-primary-omega"
                                onClick={handlePromptConfirm}
                                disabled={!promptValue.trim()}
                            >
                                Gönder
                            </button>
                            <button className="btn btn-secondary-omega" onClick={handlePromptCancel}>
                                Vazgeç
                            </button>
                        </div>
                    ) : isConfirm ? (
                        <div className="confirm-actions">
                            <button className="btn btn-primary-omega" onClick={onConfirm}>
                                İşlemi Onayla
                            </button>
                            <button className="btn btn-secondary-omega" onClick={onCancel}>
                                Vazgeç
                            </button>
                        </div>
                    ) : (
                        <button className="btn btn-primary-omega btn-block" onClick={hideNotification}>
                            Anladım
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
