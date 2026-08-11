import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Shield, Camera, CheckCircle, Clock, Monitor, ChevronDown, FileText, ShieldCheck } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import { formatDate, formatDateTime } from '../../../services/adminShared';
import { cn } from '../../../lib/utils';
import { COUNTRIES, composeE164, flagEmoji, isValidMobile, parseE164 } from '../logic/countries';

function PhoneField({ value, onChange }) {
  const initial = useState(() => parseE164(value))[0];
  const [country, setCountry] = useState(initial.country);
  const [national, setNational] = useState(initial.national);
  const handleDialChange = (event) => {
    const next = COUNTRIES.find((c) => c.iso === event.target.value);
    if (!next) return;
    setCountry(next);
    onChange(national ? composeE164(next.dial, national) : '');
  };
  const handleNationalChange = (event) => {
    const digits = event.target.value.replace(/\D/g, '');
    setNational(digits);
    onChange(digits ? composeE164(country.dial, digits) : '');
  };
  const composed = composeE164(country.dial, national);
  const error = national && !isValidMobile(composed) ? 'Enter a valid phone number, e.g. 917 123 4567.' : '';
  return (
    <div>
      <label className="block text-sm font-medium text-foreground-light mb-1">Phone Number</label>
      <div
        className={cn(
          'flex items-stretch overflow-hidden rounded-lg border bg-card shadow-sm transition-colors',
          error ? 'border-destructive' : 'border-border',
          'focus-within:ring-ring focus-within:ring-2',
        )}
      >
        <div className="relative shrink-0">
          <select
            value={country.iso}
            onChange={handleDialChange}
            aria-label="Country dial code"
            className="h-full appearance-none border-0 bg-card pl-3 pr-7 py-2 text-sm text-foreground focus:outline-none"
          >
            {COUNTRIES.map((c) => (
              <option key={c.iso} value={c.iso}>
                {flagEmoji(c.iso)} +{c.dial}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-foreground-lighter" />
        </div>
        <span className="w-px self-stretch bg-border" aria-hidden="true" />
        <input
          type="tel"
          inputMode="numeric"
          placeholder="917 123 4567"
          value={national}
          onChange={handleNationalChange}
          className="w-full min-w-0 border-0 bg-card px-3 py-2 text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:ring-0"
        />
      </div>
      {error ? (
        <p className="mt-1.5 text-sm text-destructive">{error}</p>
      ) : (
        <p className="mt-1.5 text-sm text-foreground-muted">
          Country code is added automatically — enter your number without the leading 0.
        </p>
      )}
    </div>
  );
}

export function ProfileView({ model }) {
  const {
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
  } = model;
  if (!profile) {
    return (
      <div className="p-4 sm:p-6 max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <p className={`mt-4 ${loadError ? 'text-destructive' : 'text-foreground-lighter'}`}>
          {loadError || 'Loading profile…'}
        </p>
      </div>
    );
  }
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
        <p className="text-foreground-lighter mt-1">
          Manage your personal information and security preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Profile Card */}
        <div className="space-y-6">
          <div className="bg-card rounded-xl shadow-sm border border-border p-6 text-center">
            <div className="relative inline-block mb-4">
              {profile.avatarUri ? (
                <img
                  src={profile.avatarUri}
                  alt=""
                  className="h-24 w-24 rounded-full object-cover mx-auto border-4 border-white shadow-sm"
                />
              ) : (
                <div className="h-24 w-24 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-600 font-bold text-3xl mx-auto border-4 border-white shadow-sm">
                  {profile.firstName.charAt(0)}
                  {profile.lastName.charAt(0)}
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic"
                className="hidden"
                onChange={handleAvatar}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 bg-card p-1.5 rounded-full border border-border shadow-sm text-foreground-lighter hover:text-brand-600 transition-colors"
              >
                <Camera size={16} />
              </button>
            </div>

            <h2 className="text-xl font-bold text-foreground">
              {profile.firstName} {profile.lastName}
            </h2>
            <p className="text-brand-600 font-medium text-sm mt-1">{profile.role}</p>

            <div className="mt-6 pt-6 border-t border-border space-y-3 text-sm text-left">
              <div className="flex items-center text-foreground-light">
                <Mail size={16} className="mr-3 text-foreground-muted" /> {profile.email}
              </div>
              <div className="flex items-center text-foreground-light">
                <Phone size={16} className="mr-3 text-foreground-muted" /> {profile.phone}
              </div>
              <div className="flex items-center text-foreground-light">
                <MapPin size={16} className="mr-3 text-foreground-muted" /> {profile.location}
              </div>
              <div className="flex items-center text-foreground-light">
                <Clock size={16} className="mr-3 text-foreground-muted" /> Joined{' '}
                {formatDate(profile.joined)}
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center">
              <Shield size={18} className="mr-2 text-brand-500" /> Security
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-foreground">Password</p>
                <p className="text-xs text-foreground-lighter mb-2">
                  {profile.passwordChangedAt
                    ? `Last changed ${formatDate(profile.passwordChangedAt)}`
                    : 'Change history not recorded'}
                </p>
                <button
                  onClick={() => {
                    setNewPassword('');
                    setPasswordModal(true);
                  }}
                  className="w-full text-sm bg-card border border-border-strong text-foreground-light py-2 rounded-lg font-medium hover:bg-surface-200 transition-colors"
                >
                  Change Password
                </button>
              </div>
              <div className="pt-4 border-t border-border">
                <p className="text-sm font-medium text-foreground">Two-Factor Authentication</p>
                <p
                  className={`text-xs font-medium mb-2 flex items-center mt-1 ${profile.mfaFactors.length ? 'text-success' : 'text-foreground-lighter'}`}
                >
                  <CheckCircle size={12} className="mr-1" />{' '}
                  {profile.mfaFactors.length
                    ? `${profile.mfaFactors.length} verified factor${profile.mfaFactors.length === 1 ? '' : 's'}`
                    : 'No verified factors'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-card rounded-xl shadow-sm border border-border p-6">
            <h3 className="font-bold text-foreground mb-4 flex items-center">
              <FileText size={18} className="mr-2 text-brand-500" /> Legal
            </h3>
            <div className="space-y-3">
              <Link
                to="/admin/terms"
                className="flex items-center justify-between w-full text-sm bg-card border border-border-strong text-foreground-light py-2 px-3 rounded-lg font-medium hover:bg-surface-200 transition-colors"
              >
                <span className="flex items-center">
                  <ShieldCheck size={16} className="mr-2 text-foreground-muted" /> Terms of Service
                </span>
                <ChevronDown size={16} className="text-foreground-muted rotate-[-90deg]" />
              </Link>
              <Link
                to="/admin/privacy"
                className="flex items-center justify-between w-full text-sm bg-card border border-border-strong text-foreground-light py-2 px-3 rounded-lg font-medium hover:bg-surface-200 transition-colors"
              >
                <span className="flex items-center">
                  <ShieldCheck size={16} className="mr-2 text-foreground-muted" /> Privacy Policy
                </span>
                <ChevronDown size={16} className="text-foreground-muted rotate-[-90deg]" />
              </Link>
            </div>
          </div>
        </div>

        {/* Right Column - Edit Form */}
        <div className="lg:col-span-2">
          <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="p-6 border-b border-border flex justify-between items-center bg-surface-100">
              <h2 className="text-lg font-bold text-foreground">Personal Information</h2>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm bg-card border border-border-strong text-foreground-light px-3 py-1.5 rounded-lg font-medium hover:bg-surface-200 transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>

            <div className="p-4 sm:p-6">
              {isEditing ? (
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground-light mb-1">
                        First Name
                      </label>
                      <input
                        type="text"
                        value={profile.firstName}
                        onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                        className="w-full border border-border-strong rounded-lg px-3 py-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground-light mb-1">
                        Last Name
                      </label>
                      <input
                        type="text"
                        value={profile.lastName}
                        onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                        className="w-full border border-border-strong rounded-lg px-3 py-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground-light mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        value={profile.email}
                        onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                        className="w-full border border-border-strong rounded-lg px-3 py-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <PhoneField
                        value={profile.phone}
                        onChange={(phone) => setProfile({ ...profile, phone })}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-foreground-light mb-1">
                        Location
                      </label>
                      <input
                        type="text"
                        value={profile.location}
                        onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                        className="w-full border border-border-strong rounded-lg px-3 py-2 focus:ring-ring"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-foreground-light mb-1">Bio</label>
                      <textarea
                        rows={4}
                        value={profile.bio}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        className="w-full border border-border-strong rounded-lg px-3 py-2 focus:ring-ring resize-none"
                      ></textarea>
                    </div>
                  </div>
                  <div className="pt-4 flex justify-end gap-3 border-t border-border">
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border border-border-strong rounded-lg text-sm font-medium text-foreground-light hover:bg-surface-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-700"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-y-6 gap-x-8">
                    <div>
                      <p className="text-sm font-medium text-foreground-lighter">First Name</p>
                      <p className="mt-1 text-base text-foreground">{profile.firstName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground-lighter">Last Name</p>
                      <p className="mt-1 text-base text-foreground">{profile.lastName}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground-lighter">Email Address</p>
                      <p className="mt-1 text-base text-foreground">{profile.email}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground-lighter">Phone Number</p>
                      <p className="mt-1 text-base text-foreground">{profile.phone}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-foreground-lighter">Location</p>
                      <p className="mt-1 text-base text-foreground">{profile.location}</p>
                    </div>
                    <div className="md:col-span-2">
                      <p className="text-sm font-medium text-foreground-lighter">Bio</p>
                      <p className="mt-1 text-base text-foreground leading-relaxed">{profile.bio}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Active Sessions */}
          <div className="mt-8 bg-card rounded-xl shadow-sm border border-border overflow-hidden">
            <div className="p-6 border-b border-border bg-surface-100">
              <h2 className="text-lg font-bold text-foreground">Active Sessions</h2>
              <p className="text-sm text-foreground-lighter mt-1">
                Devices currently logged into your account
              </p>
            </div>
            <div className="divide-y divide-border">
              <div className="p-6 flex justify-between items-center gap-4">
                <div className="flex min-w-0 items-center">
                  <div className="h-10 w-10 rounded-full bg-brand-500/10 flex items-center justify-center mr-4">
                    <Monitor size={20} className="text-brand-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">
                      {deviceLabel(currentAgent) || 'Current authenticated session'}
                    </p>
                    <p className="text-xs text-foreground-lighter truncate">
                      {currentEvent?.ip_address || 'IP not recorded'}
                      {profile.session?.created_at
                        ? ` • Started ${formatDateTime(profile.session.created_at)}`
                        : ''}
                    </p>
                  </div>
                </div>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success-600 dark:text-success-400">
                  Current Session
                </span>
              </div>
            </div>
          </div>

          {/* Login History */}
          <div className="mt-8 bg-card rounded-xl shadow-sm border border-border">
            <div className="p-6 border-b border-border bg-surface-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-foreground">Login History</h2>
                <p className="text-sm text-foreground-lighter mt-1">Recent authentication activity</p>
              </div>
              <span className="text-sm text-foreground-lighter">
                {profile.authenticationEvents.length} recorded
              </span>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Date & Time</TableHead>
                  <TableHead scope="col">Location & IP</TableHead>
                  <TableHead scope="col">Device</TableHead>
                  <TableHead scope="col" className="text-right">
                    Status
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profile.authenticationEvents.map((event) => {
                  return (
                    <TableRow key={event.id}>
                      <TableCell className="whitespace-nowrap text-foreground font-medium">
                        {formatDateTime(event.created_at)}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-foreground-lighter">
                        {event.ip_address || ''}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-foreground-lighter">
                        {deviceLabel(describeUserAgent(event.user_agent))}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <span className="text-success font-medium text-xs bg-success/10 px-2 py-0.5 rounded">
                          {event.event_type.replaceAll('_', ' ')}
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {!profile.authenticationEvents.length && (
                  <TableRow hover={false}>
                    <TableCell colSpan="4" className="text-center text-foreground-lighter">
                      No authentication events have been recorded.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
      <Modal isOpen={passwordModal} onClose={() => setPasswordModal(false)} title="Change Password">
        <div className="space-y-4">
          <p className="text-foreground-light">
            Enter your current password and a new password with at least 8 characters:
          </p>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-ring"
            placeholder="Current password"
            autoComplete="current-password"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground focus-ring"
            placeholder="New password"
            autoComplete="new-password"
          />
          <div>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={`w-full rounded-lg border bg-card px-3 py-2 text-sm text-foreground focus-ring ${
                confirmPassword && confirmPassword !== newPassword
                  ? 'border-destructive'
                  : 'border-border'
              }`}
              placeholder="Confirm new password"
              autoComplete="new-password"
            />
            {confirmPassword && confirmPassword !== newPassword && (
              <p className="mt-1.5 text-sm text-destructive">Passwords do not match.</p>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => {
                setPasswordModal(false);
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
              className="rounded-lg border px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handlePassword()}
              disabled={
                !currentPassword ||
                newPassword.length < 8 ||
                !confirmPassword ||
                confirmPassword !== newPassword
              }
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm text-white disabled:opacity-50"
            >
              Update Password
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
