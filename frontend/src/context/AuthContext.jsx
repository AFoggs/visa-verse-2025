import { createContext, useContext, useState, useEffect } from 'react';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../services/firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileComplete, setProfileComplete] = useState(false);

  // Register new user
  async function register(email, password, displayName) {
    const { user: newUser } = await createUserWithEmailAndPassword(auth, email, password);

    // Update display name
    await updateProfile(newUser, { displayName });

    // Create initial user document
    await setDoc(doc(db, 'users', newUser.uid), {
      userId: newUser.uid,
      email: newUser.email,
      profile: {
        name: displayName,
        age: null,
        location: { city: '', country: '' },
        whyHere: '',
        interests: [],
        preferences: {
          geographic: 'global',
          ageRange: 'any',
          communication: 'both',
        },
      },
      extendedProfile: {
        bio: '',
        additionalInterests: [],
      },
      companionData: {
        personalityFingerprint: {
          conversationalStyle: '',
          energyLevel: 5,
          humorStyle: '',
          depthPreference: '',
          values: [],
        },
      },
      connections: {
        strangers: [],
        connections: [],
        friends: [],
      },
      createdAt: serverTimestamp(),
      lastActive: serverTimestamp(),
      onboardingComplete: false,
    });

    return newUser;
  }

  // Login
  async function login(email, password) {
    const { user: loggedInUser } = await signInWithEmailAndPassword(auth, email, password);

    // Update last active
    await updateDoc(doc(db, 'users', loggedInUser.uid), {
      lastActive: serverTimestamp(),
    });

    return loggedInUser;
  }

  // Logout
  async function logout() {
    if (user) {
      await updateDoc(doc(db, 'users', user.uid), {
        lastActive: serverTimestamp(),
      });
    }
    await signOut(auth);
  }

  // Fetch user profile
  async function fetchUserProfile(uid) {
    const docRef = doc(db, 'users', uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const profileData = docSnap.data();
      setUserProfile(profileData);
      setProfileComplete(profileData.onboardingComplete === true);
      return profileData;
    }
    return null;
  }

  // Update user profile
  async function updateUserProfile(updates) {
    if (!user) return;

    await updateDoc(doc(db, 'users', user.uid), {
      ...updates,
      lastActive: serverTimestamp(),
    });

    // Refresh profile
    await fetchUserProfile(user.uid);
  }

  // Complete onboarding
  async function completeOnboarding(profileData) {
    if (!user) return;

    await updateDoc(doc(db, 'users', user.uid), {
      profile: profileData.profile,
      extendedProfile: profileData.extendedProfile || {},
      onboardingComplete: true,
      lastActive: serverTimestamp(),
    });

    setProfileComplete(true);
    await fetchUserProfile(user.uid);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        await fetchUserProfile(currentUser.uid);
      } else {
        setUserProfile(null);
        setProfileComplete(false);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    user,
    userProfile,
    loading,
    profileComplete,
    register,
    login,
    logout,
    updateUserProfile,
    completeOnboarding,
    fetchUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
