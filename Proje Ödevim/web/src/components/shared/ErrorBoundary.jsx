import { Component } from "react";

/**
 * Error Boundary — Yakalanmayan React render hatalarını güzel bir UI ile gösterir.
 * Class component olmalıdır çünkü React hooks ile error boundary yapılamaz.
 */
export default class ErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null });
        window.location.href = "/";
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: "100vh",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#0f0f1a",
                    color: "#f8fafc",
                    fontFamily: "'Inter', -apple-system, sans-serif",
                    padding: "24px",
                }}>
                    <div style={{
                        maxWidth: 480,
                        padding: "40px 32px",
                        borderRadius: "16px",
                        background: "rgba(26, 26, 58, 0.8)",
                        border: "1px solid rgba(99, 102, 241, 0.2)",
                        backdropFilter: "blur(12px)",
                        textAlign: "center",
                    }}>
                        <div style={{ fontSize: 56, marginBottom: 16 }}>⚠️</div>
                        <h1 style={{
                            fontSize: 24,
                            fontWeight: 800,
                            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            marginBottom: 12,
                        }}>
                            Bir Hata Oluştu
                        </h1>
                        <p style={{
                            color: "#cbd5e1",
                            fontSize: 15,
                            lineHeight: 1.6,
                            marginBottom: 24,
                        }}>
                            Beklenmedik bir sorun oluştu. Lütfen sayfayı yenileyip tekrar deneyin.
                        </p>

                        {this.state.error && (
                            <details style={{
                                textAlign: "left",
                                marginBottom: 24,
                                padding: "12px 16px",
                                borderRadius: 8,
                                background: "rgba(239, 68, 68, 0.1)",
                                border: "1px solid rgba(239, 68, 68, 0.3)",
                                color: "#f87171",
                                fontSize: 12,
                            }}>
                                <summary style={{ cursor: "pointer", marginBottom: 8 }}>Hata Detayı</summary>
                                <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                    {this.state.error.toString()}
                                </pre>
                            </details>
                        )}

                        <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
                            <button
                                onClick={() => window.location.reload()}
                                style={{
                                    padding: "12px 24px",
                                    borderRadius: 12,
                                    border: "none",
                                    background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                    color: "white",
                                    fontWeight: 600,
                                    fontSize: 14,
                                    cursor: "pointer",
                                    fontFamily: "'Inter', sans-serif",
                                }}
                            >
                                🔄 Yenile
                            </button>
                            <button
                                onClick={this.handleReset}
                                style={{
                                    padding: "12px 24px",
                                    borderRadius: 12,
                                    border: "1px solid rgba(99, 102, 241, 0.2)",
                                    background: "transparent",
                                    color: "#a5b4fc",
                                    fontWeight: 600,
                                    fontSize: 14,
                                    cursor: "pointer",
                                    fontFamily: "'Inter', sans-serif",
                                }}
                            >
                                🏠 Ana Sayfa
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
