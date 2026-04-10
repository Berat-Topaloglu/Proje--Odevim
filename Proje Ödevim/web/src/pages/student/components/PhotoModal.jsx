import { useRef, useState } from "react";

export default function PhotoModal({ show, onClose, handlePhotoUpload, uploadingPhoto }) {
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [previewPhoto, setPreviewPhoto] = useState(null);

    if (!show) return null;

    const startCamera = async () => {
        setIsCameraActive(true);
        setPreviewPhoto(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" },
                audio: false
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Kamera açılamadı:", err);
            setIsCameraActive(false);
        }
    };

    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = videoRef.current.srcObject.getTracks();
            tracks.forEach(track => {
                track.stop();
                track.enabled = false;
            });
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const dataUrl = canvas.toDataURL("image/jpeg");
            setPreviewPhoto(dataUrl);
            stopCamera();
        }
    };

    const saveCapturedPhoto = () => {
        if (previewPhoto) {
            fetch(previewPhoto)
                .then(res => res.blob())
                .then(blob => {
                    const file = new File([blob], "profile-photo.jpg", { type: "image/jpeg" });
                    handlePhotoUpload(file);
                });
        }
    };

    const retakePhoto = () => {
        setPreviewPhoto(null);
        startCamera();
    };

    const handleClose = () => {
        stopCamera();
        setPreviewPhoto(null);
        onClose();
    };

    return (
        <div className="modal-overlay" onClick={handleClose} role="dialog" aria-modal="true" aria-label="Profil fotoğrafı yükleme">
            <div className="modal-content photo-modal card" onClick={e => e.stopPropagation()}>
                <h3>Profil Fotoğrafı</h3>

                {(!isCameraActive && !previewPhoto) ? (
                    <div className="photo-options mt-24">
                        <label className="photo-option-btn card" tabIndex={0}>
                            <span aria-hidden="true">📁</span>
                            <p>Dosyalarından Seç</p>
                            <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => handlePhotoUpload(e)} />
                        </label>
                        <button className="photo-option-btn card" onClick={startCamera}>
                            <span aria-hidden="true">📷</span>
                            <p>Kamera ile Çek</p>
                        </button>
                    </div>
                ) : (
                    <div className="camera-wrapper mt-16">
                        <div className="camera-container">
                            {previewPhoto ? (
                                <img src={previewPhoto} className="photo-preview-img" alt="Fotoğraf önizleme" />
                            ) : (
                                <video ref={videoRef} autoPlay playsInline className="video-preview" />
                            )}
                            <canvas ref={canvasRef} style={{ display: "none" }} />

                            {!previewPhoto && (
                                <button className="shutter-btn" onClick={capturePhoto} title="Fotoğraf Çek" aria-label="Fotoğraf çek">
                                    <div className="shutter-icon"></div>
                                </button>
                            )}
                        </div>

                        <div className="camera-controls mt-16">
                            {previewPhoto ? (
                                <div style={{ display: "flex", gap: "12px", width: "100%", flexDirection: "column" }}>
                                    <button className="btn btn-primary w-full" onClick={saveCapturedPhoto} disabled={uploadingPhoto}>
                                        {uploadingPhoto ? "Yükleniyor..." : "✅ Profil Fotoğrafı Yap"}
                                    </button>
                                    <button className="btn btn-secondary w-full" onClick={retakePhoto}>🔄 Yeniden Çek</button>
                                </div>
                            ) : (
                                <button className="btn btn-secondary w-full" onClick={() => { stopCamera(); setPreviewPhoto(null); }}>❌ Vazgeç</button>
                            )}
                        </div>
                    </div>
                )}

                <button className="btn btn-sm btn-secondary mt-24" onClick={handleClose}>Kapat</button>
            </div>
        </div>
    );
}
