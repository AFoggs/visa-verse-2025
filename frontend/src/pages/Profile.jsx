import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  MapPin,
  Calendar,
  Globe,
  MessageSquare,
  Edit2,
  ArrowLeft,
  Sparkles,
  Users,
  Save,
  Lock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../services/api';
import LocationSearch from '../components/LocationSearch';
import ProfilePhoto from '../components/ProfilePhoto';

const INTERESTS = [
  'Technology', 'Gaming', 'Music', 'Movies', 'Travel', 'Fitness',
  'Cooking', 'Reading', 'Art', 'Photography', 'Nature', 'Science',
  'Sports', 'Fashion', 'Writing', 'Podcasts', 'Anime', 'Pets',
  'Entrepreneurship', 'Philosophy', 'Languages', 'Dancing', 'Yoga',
  'Hiking', 'Board Games', 'Crafts', 'Volunteering', 'Meditation',
];

function Profile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user, userProfile, updateUserProfile } = useAuth();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState({});

  const isOwnProfile = !userId || userId === user?.uid;

  useEffect(() => {
    async function loadProfile() {
      if (isOwnProfile) {
        setProfile(userProfile);
        setEditData({
          name: userProfile?.profile?.name || '',
          bio: userProfile?.extendedProfile?.bio || '',
          location: userProfile?.profile?.location || { city: '', country: '' },
          interests: userProfile?.profile?.interests || [],
          preferences: userProfile?.profile?.preferences || {},
          photoUrl: userProfile?.profile?.photoUrl || null,
        });
        setLoading(false);
      } else {
        try {
          const data = await userApi.getProfile(userId);
          setProfile(data.user);
        } catch (error) {
          console.error('Error loading profile:', error);
          navigate(-1);
        } finally {
          setLoading(false);
        }
      }
    }
    loadProfile();
  }, [userId, userProfile, isOwnProfile, navigate]);

  const toggleInterest = (interest) => {
    setEditData((prev) => ({
      ...prev,
      interests: prev.interests.includes(interest)
        ? prev.interests.filter((i) => i !== interest)
        : prev.interests.length < 10
          ? [...prev.interests, interest]
          : prev.interests,
    }));
  };

  const handlePhotoChange = async (photoUrl) => {
    // Update photo immediately without needing to save the whole form
    try {
      await updateUserProfile({
        profile: {
          ...userProfile.profile,
          photoUrl,
        },
      });
      setEditData((prev) => ({ ...prev, photoUrl }));
    } catch (error) {
      console.error('Photo update error:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateUserProfile({
        profile: {
          ...userProfile.profile,
          name: editData.name,
          location: editData.location,
          interests: editData.interests,
          preferences: editData.preferences,
          photoUrl: editData.photoUrl,
        },
        extendedProfile: {
          ...userProfile.extendedProfile,
          bio: editData.bio,
        },
      });
      setEditing(false);
    } catch (error) {
      console.error('Save error:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <Users className="mx-auto text-dark-400 mb-4" size={48} />
        <h2 className="text-xl font-bold mb-2">Profile Not Found</h2>
        <p className="text-dark-300">This profile doesn't exist or you don't have access.</p>
      </div>
    );
  }

  const displayProfile = editing ? editData : profile.profile;
  const displayExtended = editing ? editData : profile.extendedProfile;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      {/* Back button for other profiles */}
      {!isOwnProfile && (
        <button
          onClick={() => navigate(-1)}
          className="btn-ghost flex items-center gap-2 mb-4"
        >
          <ArrowLeft size={20} />
          Back
        </button>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="card overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-br from-primary-400/20 to-accent-400/20 p-8 text-center relative">
          {isOwnProfile && !editing && (
            <button
              onClick={() => setEditing(true)}
              className="absolute top-4 right-4 btn-ghost p-2"
            >
              <Edit2 size={20} />
            </button>
          )}

          <div className="flex justify-center mb-4">
            <ProfilePhoto
              userId={isOwnProfile ? user?.uid : userId}
              photoUrl={editing ? editData.photoUrl : displayProfile?.photoUrl}
              onPhotoChange={handlePhotoChange}
              canEdit={isOwnProfile && editing}
              isFriend={!isOwnProfile && profile.status === 'friends'}
              size="lg"
              name={editing ? editData.name : displayProfile?.name}
            />
          </div>
          {editing && (
            <p className="text-dark-400 text-xs flex items-center justify-center gap-1 mb-4">
              <Lock size={12} />
              Your photo is only visible to friends
            </p>
          )}

          {editing ? (
            <input
              type="text"
              value={editData.name}
              onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              className="input text-center text-2xl font-bold bg-dark-700/50 max-w-xs mx-auto"
            />
          ) : (
            <h1 className="text-2xl font-bold mb-1">
              {displayProfile?.name}
              {displayProfile?.age && `, ${displayProfile.age}`}
            </h1>
          )}

          {!editing && (
            <p className="text-dark-300 flex items-center justify-center gap-1">
              <MapPin size={16} />
              {displayProfile?.location?.city}, {displayProfile?.location?.country}
            </p>
          )}
        </div>

        {/* Bio (Extended Profile - Friends only or own) */}
        {(isOwnProfile || profile.status === 'friends') && (
          <div className="p-6 border-b border-dark-600">
            <h3 className="text-sm text-dark-300 mb-2 flex items-center gap-2">
              <Sparkles size={16} />
              About
            </h3>
            {editing ? (
              <textarea
                value={editData.bio || ''}
                onChange={(e) => setEditData({ ...editData, bio: e.target.value })}
                placeholder="Tell people about yourself..."
                className="input resize-none"
                rows={3}
              />
            ) : (
              <p className={displayExtended?.bio ? '' : 'text-dark-400 italic'}>
                {displayExtended?.bio || 'No bio yet'}
              </p>
            )}
          </div>
        )}

        {/* Location (Editable) */}
        {editing && (
          <div className="p-6 border-b border-dark-600">
            <h3 className="text-sm text-dark-300 mb-3 flex items-center gap-2">
              <MapPin size={16} />
              Location
            </h3>
            <LocationSearch
              value={editData.location || { city: '', state: '', country: '', displayPreference: 'city' }}
              onChange={(location) => setEditData({ ...editData, location })}
              placeholder="Search for your city..."
            />
          </div>
        )}

        {/* Why Here */}
        <div className="p-6 border-b border-dark-600">
          <h3 className="text-sm text-dark-300 mb-2 flex items-center gap-2">
            <Users size={16} />
            Looking for
          </h3>
          <p>{displayProfile?.whyHere || 'Not specified'}</p>
        </div>

        {/* Interests */}
        <div className="p-6 border-b border-dark-600">
          <h3 className="text-sm text-dark-300 mb-3">
            Interests ({(editing ? editData.interests : displayProfile?.interests)?.length || 0}/10)
          </h3>
          {editing ? (
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((interest) => (
                <button
                  key={interest}
                  onClick={() => toggleInterest(interest)}
                  className={`px-3 py-1 rounded-full text-sm transition-all ${
                    editData.interests?.includes(interest)
                      ? 'bg-primary-400 text-white'
                      : 'bg-dark-600 hover:bg-dark-500'
                  }`}
                >
                  {interest}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {displayProfile?.interests?.map((interest) => (
                <span
                  key={interest}
                  className="px-3 py-1 bg-primary-400/20 text-primary-400 rounded-full text-sm"
                >
                  {interest}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Preferences */}
        <div className="p-6">
          <h3 className="text-sm text-dark-300 mb-3">Preferences</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Globe size={18} className="text-dark-400" />
              <span className="capitalize">
                {displayProfile?.preferences?.geographic || 'Global'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-dark-400" />
              <span>
                {displayProfile?.preferences?.ageRange || 'Any age'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-dark-400" />
              <span className="capitalize">
                {displayProfile?.preferences?.communication || 'Both'}
              </span>
            </div>
          </div>
        </div>

        {/* Edit Actions */}
        {editing && (
          <div className="p-6 border-t border-dark-600 flex gap-3">
            <button
              onClick={() => {
                setEditing(false);
                setEditData({
                  name: userProfile?.profile?.name || '',
                  bio: userProfile?.extendedProfile?.bio || '',
                  location: userProfile?.profile?.location || { city: '', country: '' },
                  interests: userProfile?.profile?.interests || [],
                  preferences: userProfile?.profile?.preferences || {},
                  photoUrl: userProfile?.profile?.photoUrl || null,
                });
              }}
              className="btn-secondary flex-1"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {saving ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save size={20} />
                  Save Changes
                </>
              )}
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

export default Profile;
