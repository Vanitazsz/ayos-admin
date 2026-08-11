import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ShieldCheck, UserCheck, UserX } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { useServerPagination } from '../../../hooks/useServerPagination';
import {
  inviteMember,
  loadRoles,
  loadTeamPage,
  setAccountStatus,
  setMemberRole,
  subscribe,
} from '../logic/TeamPageLogic';

const messageFrom = (error) => {
  const message = error instanceof Error ? error.message : '';
  if (/LAST_SUPER_ADMIN/.test(message)) {
    return 'You cannot demote or change the last remaining Super Admin.';
  }
  if (/EMAIL_ALREADY_IN_USE/.test(message)) {
    return 'An account already exists for that email address.';
  }
  if (/UNKNOWN_ROLE/.test(message)) {
    return 'The selected role is not recognized.';
  }
  if (/Failed to send a request to the Edge Function/.test(message)) {
    return 'Unable to reach the invitation service. Please try again.';
  }
  return message || 'The request could not be completed.';
};

export function useTeamPageController() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('All');
  const [roles, setRoles] = useState([]);
  const [roleMenuOpenId, setRoleMenuOpenId] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState('ADMIN');
  const [inviteError, setInviteError] = useState('');
  const [isInviting, setIsInviting] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [confirm, setConfirm] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'Yes',
    onConfirm: () => {},
  });
  const toast = useToast();
  const { user } = useAuth();

  const closeConfirm = useCallback(() => setConfirm((state) => ({ ...state, isOpen: false })), []);
  const canManage = (user?.permissions ?? []).includes('team.manage');

  const fetchPage = useCallback(
    ({ page, pageSize }) =>
      loadTeamPage({ search: searchQuery, role: filterRole, page, pageSize }),
    [searchQuery, filterRole],
  );

  const {
    rows: members,
    count,
    error,
    meta,
    isLoading,
    refresh: refreshMembers,
    currentPage,
    setCurrentPage,
    totalPages,
  } = useServerPagination({ fetchPage, filterKey: `${filterRole}` });

  const refresh = useCallback(async () => {
    await refreshMembers();
  }, [refreshMembers]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    const stops = [
      subscribe('accounts', () => void refreshRef.current()),
      subscribe('admin_profiles', () => void refreshRef.current()),
    ];
    return () => stops.forEach((stop) => stop());
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadRoles()
      .then((loadedRoles) => {
        if (!cancelled) setRoles(loadedRoles ?? []);
      })
      .catch(() => {
        if (!cancelled) setRoles([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = useMemo(
    () => [
      { label: 'Total Members', value: meta?.stats?.total ?? 0, icon: ShieldCheck },
      { label: 'Super Admins', value: meta?.stats?.superAdmins ?? 0, icon: UserCheck },
      { label: 'Active', value: meta?.stats?.active ?? 0, icon: UserCheck },
      { label: 'Suspended', value: meta?.stats?.suspended ?? 0, icon: UserX },
    ],
    [meta],
  );

  const openInvite = useCallback(() => {
    setInviteEmail('');
    setInviteName('');
    setInviteRole('ADMIN');
    setInviteError('');
    setInviteOpen(true);
  }, []);

  const submitInvite = useCallback(
    async (event) => {
      event.preventDefault();
      setInviteError('');
      const email = inviteEmail.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        setInviteError('Please enter a valid email address.');
        return;
      }
      if (inviteName.trim().length < 2) {
        setInviteError('Please enter the member full name.');
        return;
      }
      setIsInviting(true);
      try {
        await inviteMember({
          email,
          displayName: inviteName.trim(),
          role: inviteRole,
          redirectTo: `${window.location.origin}/login`,
        });
        setInviteOpen(false);
        toast.success(
          'Invite sent',
          `An invitation email was sent to ${email}.`,
        );
        await refresh();
      } catch (inviteError) {
        setInviteError(messageFrom(inviteError));
      } finally {
        setIsInviting(false);
      }
    },
    [inviteEmail, inviteName, inviteRole, refresh, toast],
  );

  const viewMember = useCallback((member) => {
    setRoleMenuOpenId(null);
    setSelectedMember(member);
    setIsDrawerOpen(true);
  }, []);

  const changeRole = useCallback(
    async (member, nextRole) => {
      if (!nextRole || nextRole === member.admin_role) {
        setRoleMenuOpenId(null);
        return;
      }
      setActionLoadingId(`${member.id}:role`);
      setRoleMenuOpenId(null);
      try {
        await setMemberRole(member.id, nextRole);
        setSelectedMember((current) =>
          current && current.id === member.id
            ? { ...current, admin_role: nextRole, role_name: nextRole }
            : current,
        );
        await refresh();
        toast.success('Role updated', `${member.display_name || member.email} is now ${nextRole}.`);
      } catch (roleError) {
        toast.error('Role update failed', messageFrom(roleError));
      } finally {
        setActionLoadingId(null);
      }
    },
    [refresh, toast],
  );

  const toggleStatus = useCallback(
    (member) => {
      setRoleMenuOpenId(null);
      const nextStatus = member.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
      setConfirm({
        isOpen: true,
        title: nextStatus === 'SUSPENDED' ? 'Suspend member' : 'Reactivate member',
        message:
          nextStatus === 'SUSPENDED'
            ? `Suspend "${member.display_name || member.email}"? They will no longer be able to sign in.`
            : `Reactivate "${member.display_name || member.email}"? They will be able to sign in again.`,
        confirmLabel: nextStatus === 'SUSPENDED' ? 'Suspend' : 'Reactivate',
        onConfirm: async () => {
          setActionLoadingId(`${member.id}:status`);
          try {
            await setAccountStatus(member.id, nextStatus);
            setSelectedMember((current) =>
              current && current.id === member.id
                ? { ...current, status: nextStatus === 'SUSPENDED' ? 'SUSPENDED' : 'ACTIVE' }
                : current,
            );
            await refresh();
            toast.success(
              nextStatus === 'SUSPENDED' ? 'Member suspended' : 'Member reactivated',
              `${member.display_name || member.email} was ${
                nextStatus === 'SUSPENDED' ? 'suspended' : 'reactivated'
              }.`,
            );
          } catch (statusError) {
            toast.error(
              'Status update failed',
              messageFrom(statusError),
            );
          } finally {
            setActionLoadingId(null);
          }
        },
      });
    },
    [refresh, toast],
  );

  const getRoleBadgeVariant = useCallback((roleCode) => {
    switch (roleCode) {
      case 'SUPER_ADMIN':
        return 'primary';
      case 'ADMIN':
        return 'info';
      case 'MODERATOR':
        return 'warning';
      case 'ANALYST':
        return 'secondary';
      default:
        return 'outline';
    }
  }, []);

  return useMemo(
    () => ({
      isLoading,
      searchQuery,
      setSearchQuery,
      filterRole,
      setFilterRole,
      roles,
      currentPage,
      setCurrentPage,
      totalPages,
      count,
      loadError: error,
      members,
      stats,
      canManage,
      inviteOpen,
      setInviteOpen,
      inviteEmail,
      setInviteEmail,
      inviteName,
      setInviteName,
      inviteRole,
      setInviteRole,
      inviteError,
      isInviting,
      openInvite,
      submitInvite,
      selectedMember,
      isDrawerOpen,
      setIsDrawerOpen,
      roleMenuOpenId,
      setRoleMenuOpenId,
      actionLoadingId,
      confirm,
      closeConfirm,
      viewMember,
      changeRole,
      toggleStatus,
      getRoleBadgeVariant,
      refresh,
      currentUserId: user?.id ?? null,
    }),
    [
      isLoading,
      searchQuery,
      filterRole,
      roles,
      currentPage,
      setCurrentPage,
      totalPages,
      count,
      error,
      members,
      stats,
      canManage,
      inviteOpen,
      inviteEmail,
      inviteName,
      inviteRole,
      inviteError,
      isInviting,
      selectedMember,
      isDrawerOpen,
      roleMenuOpenId,
      actionLoadingId,
      confirm,
      openInvite,
      submitInvite,
      viewMember,
      changeRole,
      toggleStatus,
      getRoleBadgeVariant,
      refresh,
      closeConfirm,
      user,
    ],
  );
}
