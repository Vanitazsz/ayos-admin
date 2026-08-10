export const TRASH_TABS = ['Users', 'Workers', 'Bookings', 'Reviews', 'Industries', 'Skills'];

export {
  loadTrash,
  permanentlyDeleteTrash,
  restoreTrash,
  restoreAccountFromTrash,
  restoreBookingFromTrash,
  restorePaymentFromTrash,
  restoreIndustryFromTrash,
  restoreSkillFromTrash,
  hardDeleteAccountFromTrash,
  hardDeleteIndustryFromTrash,
  hardDeleteSkillFromTrash,
} from '../../../services/trash';
