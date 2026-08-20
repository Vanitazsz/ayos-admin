import { Trash2, Search, RotateCcw, ShieldAlert, AlertCircle } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import Pagination from '../../../components/ui/Pagination';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import AccountDeleteModal from '../../../components/admin/AccountDeleteModal';
import PermanentDeleteModal from '../components/PermanentDeleteModal';
import { TRASH_TABS } from '../logic/TrashPageLogic';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import TableSkeleton from '../../../components/ui/TableSkeleton';
import Skeleton from '../../../components/ui/Skeleton';
import DateFilter from '../../../components/ui/DateFilter';
const tabs = TRASH_TABS;
export function TrashView({ model }) {
  const {
    activeTab,
    setActiveTab,
    isLoading,
    error,
    items,
    searchTerm,
    setSearchTerm,
    dateFilter,
    currentPage,
    setCurrentPage,
    confirm,
    filteredItems,
    totalPages,
    paginatedItems,
    targetEntryId,
    handleRestore,
    handlePermanentDelete,
    handleRestoreAll,
    handleEmptyTrash,
    closeConfirm,
    accountToDelete,
    setAccountToDelete,
    handleDeleteAccountFromTrash,
    bookingToDelete,
    setBookingToDelete,
    handleDeleteBookingFromTrash,
  } = model;

  const scrolledRef = useRef(false);
  const [highlightId, setHighlightId] = useState(null);
  useEffect(() => {
    if (!targetEntryId || scrolledRef.current) return;
    const el = document.getElementById(`trash-entry-${targetEntryId}`);
    if (!el) return;
    scrolledRef.current = true;
    el.scrollIntoView({ block: 'center' });
    setHighlightId(targetEntryId);
  }, [paginatedItems, targetEntryId]);

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Trash & Recovery</h1>
          <p className="text-foreground-lighter mt-1">
            Manage soft-deleted items before permanent removal (30 days)
          </p>
        </div>
        {filteredItems.length > 0 && (
          <div className="mt-4 sm:mt-0 flex gap-2">
            <button
              onClick={handleRestoreAll}
              className="bg-card border border-border-strong hover:bg-surface-200 text-foreground-light px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center"
            >
              <RotateCcw size={18} className="mr-2" /> Restore All
            </button>
            <button
              onClick={handleEmptyTrash}
              className="bg-destructive/10 text-destructive border border-destructive/30 hover:bg-destructive/10 px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center"
            >
              <Trash2 size={18} className="mr-2" /> Empty Trash
            </button>
          </div>
        )}
      </div>
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <div className="bg-card rounded-xl shadow-sm border border-border mb-6">
        <div className="flex border-b border-border overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                setActiveTab(tab);
                setCurrentPage(1);
                setSearchTerm('');
              }}
              className={`px-6 py-4 text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab
                  ? 'border-b-2 border-foreground text-foreground bg-brand-500/10'
                  : 'text-foreground-lighter hover:text-foreground-light hover:bg-surface-200'
              }`}
            >
              {tab}{' '}
              <span className="ml-2 bg-surface-200 text-foreground-light py-0.5 px-2 rounded-full text-xs">
                {items[tab].length}
              </span>
            </button>
          ))}
        </div>

        <div className="p-4 bg-surface-100 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="relative w-full sm:w-96">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-foreground-muted" />
            </div>
            <input
              type="text"
              aria-label={`Search deleted ${activeTab.toLowerCase()}...`}
              placeholder={`Search deleted ${activeTab.toLowerCase()}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full pl-10 pr-3 py-2 border border-border-strong rounded-lg focus-ring text-sm"
            />
          </div>
          <DateFilter model={dateFilter} />
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">
                Deleted Item
              </TableHead>
              <TableHead scope="col">
                Deleted By
              </TableHead>
              <TableHead scope="col">
                Date Deleted
              </TableHead>
              <TableHead scope="col">
                Restore Deadline
              </TableHead>
              <TableHead scope="col" className="text-right">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton
                rows={6}
                columns={[
                  {
                    children: (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-36" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    ),
                  },
                  {},
                  {},
                  {
                    children: <Skeleton className="h-6 w-24 rounded-full" />,
                  },
                  {
                    className: 'text-right',
                    children: (
                      <div className="flex justify-end space-x-2">
                        <Skeleton className="h-8 w-8 rounded-lg" />
                        <Skeleton className="h-8 w-8 rounded-lg" />
                      </div>
                    ),
                  },
                ]}
              />
            ) : paginatedItems.length > 0 ? (
              paginatedItems.map((item) => (
                <TableRow
                  key={item.id}
                  id={`trash-entry-${item.id}`}
                  className={highlightId === item.id ? 'animate-trash-pulse' : ''}
                >
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">{item.item}</div>
                    <div className="text-xs text-foreground-lighter">{item.id}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-foreground-light">
                    {item.deletedBy}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-foreground-lighter">
                    {item.deletedDate}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive">
                      <AlertCircle size={12} className="mr-1" /> {item.restoreDeadline}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleRestore(item)}
                        className="text-foreground-lighter hover:text-success p-1 rounded hover:bg-success/10 transition-colors flex items-center border border-transparent hover:border-success/30"
                        title="Restore"
                      >
                        <RotateCcw size={16} className="mr-1" /> Restore
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(item)}
                        className="text-foreground-lighter hover:text-destructive p-1 rounded hover:bg-destructive/10 transition-colors flex items-center border border-transparent hover:border-destructive/30"
                        title="Delete Permanently"
                      >
                        <ShieldAlert size={16} className="mr-1" /> Delete
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow hover={false}>
                <TableCell colSpan="5" className="text-center text-foreground-lighter">
                  Trash is empty for {activeTab}.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {filteredItems.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalCount={filteredItems.length}
          />
        )}
      </div>
      <ConfirmModal
        isOpen={confirm.isOpen}
        onClose={closeConfirm}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        confirmLabel="Yes"
        requireTypedText={confirm.requireTypedText}
      >
        {confirm.industrySkillCount > 0 && (
          <label className="flex w-full items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-left text-sm font-medium text-destructive">
            <input type="checkbox" checked disabled className="size-4 shrink-0 accent-destructive" />
            <span>
              Also permanently delete its {confirm.industrySkillCount} related{' '}
              {confirm.industrySkillCount === 1 ? 'skill' : 'skills'} (required)
            </span>
          </label>
        )}
      </ConfirmModal>
      <AccountDeleteModal
        account={accountToDelete}
        onDelete={handleDeleteAccountFromTrash}
        onDeleted={() => setAccountToDelete(null)}
        onClose={() => setAccountToDelete(null)}
      />
      <PermanentDeleteModal
        item={bookingToDelete}
        onDelete={handleDeleteBookingFromTrash}
        onDeleted={() => setBookingToDelete(null)}
        onClose={() => setBookingToDelete(null)}
      />
    </div>
  );
}
