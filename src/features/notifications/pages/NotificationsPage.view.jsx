import {
  Bell,
  Send,
  Filter,
  Search,
  Trash2,
  MoreVertical,
  Eye,
  Pencil,
  Users,
  Calendar,
  Clock,
} from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Drawer from '../../../components/ui/Drawer';
import Select, { SelectItem } from '../../../components/ui/Select';
import Pagination from '../../../components/ui/Pagination';
import TableSkeleton from '../../../components/ui/TableSkeleton';
import Skeleton from '../../../components/ui/Skeleton';
import StatCard from '../../../components/ui/StatCard';
import DateFilter from '../../../components/ui/DateFilter';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Textarea from '../../../components/ui/Textarea';
import EmptyState from '../../../components/ui/EmptyState';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../../../components/ui/DropdownMenu';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/Table';

const formatActivity = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

export function NotificationsView({ model }) {
  const {
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    dateFilter,
    currentPage,
    setCurrentPage,
    isModalOpen,
    setIsModalOpen,
    editingCampaign,
    campaign,
    setCampaign,
    selectedCampaign,
    isDetailsOpen,
    filteredNotifs,
    totalPages,
    paginatedNotifs,
    stats,
    confirm,
    closeConfirm,
    getStatusColor,
    handleCreateNew,
    handleEditDraft,
    handleViewDetails,
    handleCloseDetails,
    handleMoveToTrash,
    handlePublish,
    saveCampaign,
  } = model;
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications Engine</h1>
          <p className="text-foreground-lighter mt-1">Manage email, SMS, and push notification campaigns</p>
        </div>
        <Button
          onClick={handleCreateNew}
          className="mt-4 sm:mt-0"
        >
          <Bell size={18} /> Create Notification
        </Button>
      </div>
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <StatCard key={index} title={stat.label} value={stat.value} icon={stat.icon} />
        ))}
      </div>

      <div className="bg-card rounded-t-xl shadow-sm border-x border-t border-border p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-foreground-muted" />
          </div>
          <input
            type="text"
            aria-label="Search campaigns..."
            placeholder="Search campaigns..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-border-strong rounded-lg focus-ring text-sm"
          />
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <DateFilter model={dateFilter} />
          <div className="w-full sm:w-44">
            <Select
              icon={Filter}
              aria-label="Filter campaigns by status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="Sent">Sent</SelectItem>
              <SelectItem value="Scheduled">Scheduled</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Failed">Failed</SelectItem>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-card shadow-sm border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Campaign Details</TableHead>
              <TableHead scope="col">Target Audience</TableHead>
              <TableHead scope="col">Status / Date</TableHead>
              <TableHead scope="col" className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton
                rows={6}
                columns={[
                  {},
                  {},
                  {
                    children: <Skeleton className="h-5 w-16 rounded" />,
                  },
                  { className: 'text-right' },
                ]}
              />
            ) : paginatedNotifs.length > 0 ? (
              paginatedNotifs.map((n) => (
                <TableRow
                  key={n.id}
                  onClick={() => handleViewDetails(n)}
                  className="cursor-pointer"
                >
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm font-bold text-foreground">{n.title}</div>
                    <div className="text-xs text-foreground-lighter">{n.date}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm text-foreground">{n.audience}</div>
                    {n.status === 'Sent' && (
                      <div className="text-xs text-success font-medium">
                        Open Rate: {n.openRate}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium mb-1 ${getStatusColor(n.status)}`}
                    >
                      {n.status}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          aria-label={`Open actions for ${n.title}`}
                          className="inline-flex items-center justify-center rounded-full p-1.5 text-foreground-muted transition-colors hover:bg-surface-200 hover:text-foreground"
                        >
                          <MoreVertical size={20} />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          onSelect={() => handleViewDetails(n)}
                          className="cursor-pointer"
                        >
                          <Eye className="mr-2" /> More Details
                        </DropdownMenuItem>
                        {n.status === 'Draft' && (
                          <DropdownMenuItem
                            onSelect={() => handleEditDraft(n)}
                            className="cursor-pointer"
                          >
                            <Pencil className="mr-2" /> Edit Draft
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onSelect={() => handleMoveToTrash(n.id, n.title)}
                          className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 [&_svg]:text-destructive"
                        >
                          <Trash2 className="mr-2" /> Move to Trash
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow hover={false}>
                <TableCell colSpan="4" className="p-0">
                  <EmptyState
                    icon={Bell}
                    title="No notifications found"
                    description="No notifications match your current filters."
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filteredNotifs.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCampaign ? 'Edit Notification' : 'Create New Notification'}
        maxWidth="max-w-2xl"
      >
        <form className="space-y-4">
          <Input
            label="Campaign Title"
            value={campaign.title}
            onChange={(event) => setCampaign({ ...campaign, title: event.target.value })}
            placeholder="e.g. Service update"
          />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select
              label="Target Audience"
              value={campaign.audience}
              onChange={(event) => setCampaign({ ...campaign, audience: event.target.value })}
            >
              <SelectItem value="EVERYONE">All Users</SelectItem>
              <SelectItem value="WORKERS">Workers Only</SelectItem>
              <SelectItem value="USERS">Customers Only</SelectItem>
            </Select>
            <Select label="Channel" value="In-App" disabled>
              <SelectItem value="In-App">In-App</SelectItem>
              <SelectItem value="Push">Push</SelectItem>
              <SelectItem value="SMS">SMS</SelectItem>
            </Select>
          </div>
          <Textarea
            label="Message Content"
            rows={4}
            value={campaign.message}
            onChange={(event) => setCampaign({ ...campaign, message: event.target.value })}
            placeholder="Type your message here..."
          />
          <div className="pt-4 border-t border-border flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="default"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="default"
              onClick={() => void saveCampaign(false)}
            >
              Save as Draft
            </Button>
            <Button
              type="button"
              variant="primary"
              onClick={() => void saveCampaign(true)}
            >
              <Send size={16} /> Send Now
            </Button>
          </div>
        </form>
      </Modal>

      <Drawer
        isOpen={isDetailsOpen}
        onClose={handleCloseDetails}
        title="Campaign Details"
        width="max-w-xl"
        footer={
          selectedCampaign && (
            <>
              <Button
                variant="outline-danger"
                onClick={() => handleMoveToTrash(selectedCampaign.id, selectedCampaign.title)}
              >
                <Trash2 size={16} /> Move to Trash
              </Button>
              {selectedCampaign.status === 'Draft' || selectedCampaign.status === 'Scheduled' ? (
                <Button
                  variant="primary"
                  onClick={() => handlePublish(selectedCampaign)}
                >
                  <Send size={16} /> Submit Notif
                </Button>
              ) : null}
            </>
          )
        }
      >
        {selectedCampaign ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-lg font-semibold text-foreground break-words">
                  {selectedCampaign.title}
                </h3>
                <span
                  className={`mt-2 inline-flex px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(selectedCampaign.status)}`}
                >
                  {selectedCampaign.status}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-100 px-3 py-2.5">
                <Users size={16} className="shrink-0 text-foreground-lighter" />
                <div className="min-w-0">
                  <div className="text-xs text-foreground-lighter">Audience</div>
                  <div className="text-sm font-medium text-foreground truncate">
                    {selectedCampaign.audience}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-100 px-3 py-2.5">
                <Calendar size={16} className="shrink-0 text-foreground-lighter" />
                <div className="min-w-0">
                  <div className="text-xs text-foreground-lighter">Created</div>
                  <div className="text-sm font-medium text-foreground truncate">
                    {formatActivity(selectedCampaign.created_at)}
                  </div>
                </div>
              </div>
              {selectedCampaign.status === 'Sent' && (
                <>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-100 px-3 py-2.5">
                    <Clock size={16} className="shrink-0 text-foreground-lighter" />
                    <div className="min-w-0">
                      <div className="text-xs text-foreground-lighter">Sent</div>
                      <div className="text-sm font-medium text-foreground truncate">
                        {formatActivity(selectedCampaign.sent_at)}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-100 px-3 py-2.5">
                    <Send size={16} className="shrink-0 text-success" />
                    <div className="min-w-0">
                      <div className="text-xs text-foreground-lighter">Open Rate</div>
                      <div className="text-sm font-medium text-foreground truncate">
                        {selectedCampaign.openRate}
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div>
              <div className="mb-1.5 text-xs font-medium uppercase tracking-wide text-foreground-lighter">
                Message
              </div>
              <div className="whitespace-pre-wrap break-words rounded-lg border border-border bg-surface-100 p-4 text-sm leading-relaxed text-foreground">
                {selectedCampaign.message || '—'}
              </div>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground-lighter">No campaign selected.</p>
        )}
      </Drawer>

      <ConfirmModal
        isOpen={confirm.isOpen}
        onClose={closeConfirm}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        confirmLabel={confirm.confirmLabel}
        variant={confirm.variant}
        requireTypedText={confirm.requireTypedText}
      />
    </div>
  );
}
