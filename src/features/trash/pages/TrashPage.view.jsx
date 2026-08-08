import { Trash2, Search, RotateCcw, ShieldAlert, AlertCircle } from 'lucide-react';
import Pagination from '../../../components/ui/Pagination';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import { TRASH_TABS } from '../logic/TrashPageLogic';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
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
    currentPage,
    setCurrentPage,
    confirm,
    filteredItems,
    totalPages,
    paginatedItems,
    handleRestore,
    handlePermanentDelete,
    handleRestoreAll,
    handleEmptyTrash,
    closeConfirm,
  } = model;
  return (
    <div className="p-6">
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
      {isLoading && (
        <div className="flex justify-center py-8 text-foreground-lighter">
          <div className="animate-spin h-6 w-6 border-2 border-border-strong border-t-brand-600 rounded-full mr-2" />{' '}
          Loading...
        </div>
      )}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-x-auto mb-6">
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

        <div className="p-4 bg-surface-100 border-b border-border">
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
              className="block w-full pl-10 pr-3 py-2 border border-border-strong rounded-lg focus:ring-ring focus:border-brand-500 text-sm"
            />
          </div>
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
            {paginatedItems.length > 0 ? (
              paginatedItems.map((item) => (
                <TableRow key={item.id}>
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
                        onClick={() => handleRestore(item.id)}
                        className="text-foreground-lighter hover:text-success p-1 rounded hover:bg-success/10 transition-colors flex items-center border border-transparent hover:border-success/30"
                        title="Restore"
                      >
                        <RotateCcw size={16} className="mr-1" /> Restore
                      </button>
                      <button
                        onClick={() => handlePermanentDelete(item.id)}
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
          <div className="border-t border-border">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={confirm.isOpen}
        onClose={closeConfirm}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        confirmLabel="Yes"
      />
    </div>
  );
}
