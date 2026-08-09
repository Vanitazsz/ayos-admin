import {
  changeAdminPassword,
  describeUserAgent,
  loadAdminProfile,
  saveAdminProfile,
  uploadAdminAvatar,
  verifyCurrentPassword,
} from '../logic/ProfilePageLogic';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';

export function useProfilePageController() {
  const [isEditing, setIsEditing] = useState(false);
  const toast = useToast();
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [loadError, setLoadError] = useState('');
  const [profile, setProfile] = useState(null);
  const [passwordModal, setPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const refresh = async () => {
    try {
      const data = await loadAdminProfile();
      setProfile({
        ...data,
        firstName: data.givenName || data.displayName,
        lastName: data.familyName,
        originalEmail: data.email,
      });
      setLoadError('');
    } catch (error) {
      setLoadError(error.message);
      setProfile(null);
    }
  };
  useEffect(() => {
    if (user) void refresh();
  }, [user]);
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const updated = await saveAdminProfile(
        {
          givenName: profile.firstName,
          familyName: profile.lastName,
          email: profile.email,
          phone: profile.phone,
          location: profile.location,
          bio: profile.bio,
          complete: !profile.profileComplete,
        },
        profile.originalEmail,
      );
      setProfile({
        ...updated,
        firstName: updated.givenName || updated.displayName,
        lastName: updated.familyName,
        originalEmail: updated.email,
      });
      setIsEditing(false);
      toast.success('Profile Updated', 'Your profile information has been saved successfully.');
    } catch (error) {
      toast.error('Update failed', error.message);
    }
  };
  const handleAvatar = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const updated = await uploadAdminAvatar(file);
      setProfile({
        ...updated,
        firstName: updated.givenName || updated.displayName,
        lastName: updated.familyName,
      });
      toast.success('Profile photo updated', 'Your profile photo is now stored securely.');
    } catch (error) {
      toast.error('Upload failed', error.message);
    } finally {
      event.target.value = '';
    }
  };
  const handlePassword = async () => {
    const password = newPassword;
    if (password.length < 8) {
      toast.error('Password not changed', 'Use at least 8 characters.');
      return;
    }
    try {
      const currentOk = await verifyCurrentPassword(currentPassword);
      if (!currentOk) {
        toast.error('Current password is incorrect', 'Enter your current password and try again.');
        return;
      }
      await changeAdminPassword(password);
      setPasswordModal(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      await refresh();
      toast.success('Password updated', 'Your password was changed successfully.');
    } catch (error) {
      toast.error('Password update failed', error.message);
    }
  };
  const currentEvent = profile?.authenticationEvents?.[0] ?? null;
  const currentAgent = describeUserAgent(currentEvent?.user_agent ?? window.navigator.userAgent);
  const deviceLabel = (agent) =>
    [agent.device, agent.browser].filter(Boolean).join(' - ');
  return {
    isEditing,
    setIsEditing,
    fileInputRef,
    profile,
    loadError,
    setProfile,
    passwordModal,
    setPasswordModal,
    currentPassword,
    setCurrentPassword,
    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    handleSave,
    handleAvatar,
    handlePassword,
    currentEvent,
    currentAgent,
    describeUserAgent,
    deviceLabel,
  };
}
