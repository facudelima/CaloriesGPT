import React, { useRef, useState, useEffect } from 'react';
import { Camera, Image } from 'lucide-react';

interface CameraCaptureProps {
  onImageCapture: (imageFile: File) => void;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onImageCapture }) => {
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;

    const initCamera = async () => {
      if (showCamera && videoRef.current) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: 'environment'
            }
          });
          videoRef.current.srcObject = stream;
        } catch (error) {
          console.error('Error accessing camera:', error);
          alert('Could not access camera. Please make sure you have granted camera permissions.');
          setShowCamera(false);
        }
      }
    };

    initCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [showCamera]);

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement('canvas');
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
            onImageCapture(file);
            setShowCamera(false);
          }
        }, 'image/jpeg');
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onImageCapture(file);
    }
  };

  return (
    <div className="relative">
      <input
        type="file"
        ref={galleryInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />
      
      {showCamera ? (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-4 rounded-lg max-w-2xl w-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="rounded-lg w-full h-auto"
            />
            <div className="flex justify-center gap-4 mt-4">
              <button
                onClick={handleCapture}
                className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-white"
              >
                Capture
              </button>
              <button
                onClick={() => setShowCamera(false)}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => setShowCamera(true)}
            className="bg-purple-600 hover:bg-purple-700 p-2 rounded-lg"
            title="Take Photo with Camera"
          >
            <Camera className="w-6 h-6" />
          </button>
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="bg-green-600 hover:bg-green-700 p-2 rounded-lg"
            title="Choose from Gallery"
          >
            <Image className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};

export default CameraCapture; 