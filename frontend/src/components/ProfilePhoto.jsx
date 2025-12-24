import { useState, useRef } from 'react';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../services/firebase';
import { Camera, Loader2, X, User, Lock } from 'lucide-react';

function ProfilePhoto({
  userId,
  photoUrl,
  onPhotoChange,
  canEdit = false,
  isFriend = false,
  size = 'lg',
  name = '',
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const sizeClasses = {
    sm: 'w-10 h-10 text-lg',
    md: 'w-14 h-14 text-xl',
    lg: 'w-24 h-24 text-4xl',
    xl: 'w-32 h-32 text-5xl',
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      // Create unique filename
      const timestamp = Date.now();
      const filename = `profile_photos/${userId}/${timestamp}_${file.name}`;
      const storageRef = ref(storage, filename);

      // Upload the file
      await uploadBytes(storageRef, file);

      // Get the download URL
      const downloadUrl = await getDownloadURL(storageRef);

      // Call the parent callback with the new URL
      if (onPhotoChange) {
        await onPhotoChange(downloadUrl);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError('Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = async () => {
    if (!photoUrl) return;

    setUploading(true);
    setError(null);

    try {
      // Try to delete the old file from storage
      if (photoUrl.includes('firebase')) {
        try {
          const oldRef = ref(storage, photoUrl);
          await deleteObject(oldRef);
        } catch {
          // File might not exist or be from old URL format
        }
      }

      if (onPhotoChange) {
        await onPhotoChange(null);
      }
    } catch (err) {
      console.error('Remove error:', err);
      setError('Failed to remove image');
    } finally {
      setUploading(false);
    }
  };

  // Show locked state for non-friends
  const showLockedState = photoUrl && !isFriend && !canEdit;

  return (
    <div className="relative inline-block">
      {/* Photo or Placeholder */}
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden flex items-center justify-center font-semibold relative ${
          photoUrl && (isFriend || canEdit)
            ? ''
            : 'bg-gradient-to-br from-primary-400 to-accent-400'
        }`}
      >
        {photoUrl && (isFriend || canEdit) ? (
          <img
            src={photoUrl}
            alt={name || 'Profile'}
            className="w-full h-full object-cover"
          />
        ) : showLockedState ? (
          // Blurred/locked state for non-friends
          <div className="w-full h-full bg-gradient-to-br from-primary-400/50 to-accent-400/50 flex items-center justify-center">
            <Lock className="text-white/80" size={size === 'lg' ? 32 : size === 'xl' ? 40 : 20} />
          </div>
        ) : (
          // Default avatar with initial
          <span className="text-white">{name?.charAt(0)?.toUpperCase() || '?'}</span>
        )}

        {/* Upload overlay when editing */}
        {canEdit && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center"
          >
            {uploading ? (
              <Loader2 className="text-white animate-spin" size={24} />
            ) : (
              <Camera className="text-white" size={24} />
            )}
          </button>
        )}
      </div>

      {/* Remove button */}
      {canEdit && photoUrl && !uploading && (
        <button
          onClick={handleRemovePhoto}
          className="absolute -top-1 -right-1 w-6 h-6 bg-error-400 rounded-full flex items-center justify-center text-white hover:bg-error-500 transition-colors"
          title="Remove photo"
        >
          <X size={14} />
        </button>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Error message */}
      {error && (
        <p className="absolute top-full mt-2 left-1/2 -translate-x-1/2 text-error-400 text-xs whitespace-nowrap">
          {error}
        </p>
      )}

      {/* Friends-only indicator */}
      {showLockedState && (
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-1 text-dark-400 text-xs whitespace-nowrap">
          <Lock size={10} />
          Friends only
        </div>
      )}
    </div>
  );
}

export default ProfilePhoto;
