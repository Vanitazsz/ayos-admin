import {
  AlertCircle,
  Ban,
  Briefcase,
  Clock,
  Eye,
  Filter,
  MessageCircle,
  MessageSquare,
  MoreVertical,
  Paperclip,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  Users,
} from 'lucide-react';
import Drawer from '../../../components/ui/Drawer';
import Pagination from '../../../components/ui/Pagination';
import StatCard from '../../../components/ui/StatCard';
import TableSkeleton from '../../../components/ui/TableSkeleton';
import Skeleton from '../../../components/ui/Skeleton';
import Select, { SelectItem } from '../../../components/ui/Select';
import Button from '../../../components/ui/Button';
import EmptyState from '../../../components/ui/EmptyState';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import DateFilter from '../../../components/ui/DateFilter';
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

const conversationStatusBadge = (conversation) => {
  if (conversation.disabled_at) {
    return 'bg-destructive/10 text-destructive-600 dark:text-destructive-400';
  }
  if (conversation.archived_at) return 'bg-surface-200 text-foreground';
  return 'bg-success/10 text-success-600 dark:text-success-400';
};

const conversationStatusLabel = (conversation) => {
  if (conversation.disabled_at) return 'Disabled';
  if (conversation.archived_at) return 'Archived';
  return 'Active';
};

const lastActivityAt = (conversation) =>
  conversation.lastMessageAt ?? conversation.updated_at ?? conversation.created_at;

const formatActivity = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

const MessageBubble = ({ message, align }) => {
  const isWorker = align === 'right';
  return (
    <div className={`flex ${isWorker ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 shadow-sm ${
          isWorker
            ? 'bg-brand-500/10 border border-brand-500/20'
            : 'bg-surface-200 border border-border'
        }`}
      >
        <div className={`flex items-center gap-2 text-xs ${isWorker ? 'justify-end' : ''}`}>
          <span className="font-semibold text-foreground">{message.senderName}</span>
          <span
            className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
              isWorker ? 'bg-brand-500/15 text-brand-700 dark:text-brand-300' : 'bg-surface-300 text-foreground-lighter'
            }`}
          >
            {message.senderRole === 'WORKER' ? 'Worker' : 'Customer'}
          </span>
        </div>
        <p className="mt-1 text-sm text-foreground whitespace-pre-wrap break-words">
          {message.body || '—'}
        </p>
        <div
          className={`mt-1.5 flex items-center gap-2 text-[11px] text-foreground-lighter ${isWorker ? 'justify-end' : ''}`}
        >
          {message.attachmentCount > 0 && (
            <span className="flex items-center gap-0.5">
              <Paperclip size={11} /> {message.attachmentCount}
            </span>
          )}
          <span>{formatActivity(message.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};

export function MessagesView({ model }) {
  const {
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    messageFilter,
    setMessageFilter,
    dateFilter,
    currentPage,
    setCurrentPage,
    conversations,
    count,
    totalPages,
    stats,
    canManage,
    selectedConversation,
    isThreadOpen,
    setIsThreadOpen,
    threadMessages,
    isThreadLoading,
    confirm,
    closeConfirm,
    handleViewThread,
    handleToggle,
    handleDelete,
    isBookingActive,
  } = model;

  const lastMessageSenderName = (conversation) => {
    if (conversation.lastMessageSenderId === conversation.customerId)
      return conversation.customerName;
    if (conversation.lastMessageSenderId === conversation.workerId)
      return conversation.workerName;
    return null;
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Messages</h1>
          <p className="text-foreground-lighter mt-1">
            Monitor and moderate customer–worker conversations
          </p>
        </div>
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
            aria-label="Search conversations..."
            placeholder="Search by customer, worker, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-border-strong rounded-lg focus-ring text-sm"
          />
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <div className="w-full sm:w-48">
            <Select
              icon={Filter}
              aria-label="Filter conversations by status"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <SelectItem value="All">All Statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="Disabled">Disabled</SelectItem>
              <SelectItem value="Archived">Archived</SelectItem>
            </Select>
          </div>
          <div className="w-full sm:w-44">
            <Select
              icon={MessageSquare}
              aria-label="Filter conversations by messages"
              value={messageFilter}
              onChange={(e) => setMessageFilter(e.target.value)}
            >
              <SelectItem value="All">All</SelectItem>
              <SelectItem value="Has messages">Has messages</SelectItem>
              <SelectItem value="No messages">No messages</SelectItem>
            </Select>
          </div>
          <DateFilter model={dateFilter} />
        </div>
      </div>

      <div className="bg-card shadow-sm border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Parties</TableHead>
              <TableHead scope="col">Last Message</TableHead>
              <TableHead scope="col">Messages</TableHead>
              <TableHead scope="col">Status</TableHead>
              <TableHead scope="col">Last Activity</TableHead>
              <TableHead scope="col" className="text-right">Actions</TableHead>
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
                        <Skeleton className="h-3 w-28" />
                      </div>
                    ),
                  },
                  {
                    children: (
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-44" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                    ),
                  },
                  {
                    children: <Skeleton className="h-6 w-10 rounded-md" />,
                  },
                  {
                    children: <Skeleton className="h-6 w-16 rounded-full" />,
                  },
                  {},
                  { className: 'text-right' },
                ]}
              />
            ) : conversations.length > 0 ? (
              conversations.map((conversation) => {
                const senderName = lastMessageSenderName(conversation);
                return (
                  <TableRow
                    key={conversation.id}
                    onClick={() => handleViewThread(conversation)}
                    className="cursor-pointer"
                  >
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center text-sm font-medium text-foreground">
                        <Users size={14} className="mr-1.5 shrink-0 text-foreground-muted" />
                        <span className="max-w-40 truncate">
                          {conversation.customerName || 'Unknown'}
                        </span>
                      </div>
                      <div className="mt-0.5 flex items-center gap-1 text-xs text-foreground-lighter">
                        <Briefcase size={12} className="shrink-0" />
                        <span className="max-w-40 truncate">
                          {conversation.workerName || 'Unassigned'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-56">
                      <div className="truncate text-sm text-foreground">
                        {conversation.lastMessageBody || (
                          <span className="text-foreground-lighter italic">
                            No messages yet
                          </span>
                        )}
                      </div>
                      {senderName && conversation.lastMessageBody && (
                        <div className="text-xs text-foreground-lighter">
                          {senderName}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-surface-200 text-foreground">
                        {conversation.messageCount}
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${conversationStatusBadge(conversation)}`}
                      >
                        {conversationStatusLabel(conversation)}
                      </span>
                      {isBookingActive(conversation) && (
                        <span
                          title="Linked to an active booking — cannot be moved to trash until the booking is completed or cancelled"
                          className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-destructive/10 text-destructive"
                        >
                          <AlertCircle size={12} className="mr-1" /> Active booking
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-foreground-lighter">
                      {formatActivity(lastActivityAt(conversation))}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right" onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            aria-label={`Open actions for ${conversation.customerName || 'conversation'}`}
                            className="inline-flex items-center justify-center rounded-full p-1.5 text-foreground-muted transition-colors hover:bg-surface-200 hover:text-foreground"
                          >
                            <MoreVertical size={20} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onSelect={() => handleViewThread(conversation)}
                            className="cursor-pointer"
                          >
                            <Eye className="mr-2" /> View Thread
                          </DropdownMenuItem>
                          {canManage && (
                            <>
                              <DropdownMenuItem
                                onSelect={() => handleToggle(conversation)}
                                className="cursor-pointer"
                              >
                                {conversation.disabled_at ? (
                                  <ShieldCheck className="mr-2" />
                                ) : (
                                  <ShieldOff className="mr-2" />
                                )}
                                {conversation.disabled_at ? 'Re-enable' : 'Disable'}
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => handleDelete(conversation)}
                                disabled={isBookingActive(conversation)}
                                className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10 [&_svg]:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <Trash2 className="mr-2" /> Move to Trash
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow hover={false}>
                <TableCell colSpan="6" className="p-0">
                  <EmptyState
                    icon={MessageCircle}
                    title="No conversations found"
                    description="No conversations match your current filters."
                  />
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {count > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalCount={count}
          />
        )}
      </div>

      <Drawer
        isOpen={isThreadOpen}
        onClose={() => setIsThreadOpen(false)}
        title="Conversation Thread"
        width="max-w-2xl"
        footer={
          selectedConversation && canManage ? (
            <div className="flex w-full gap-3">
              <Button
                variant={selectedConversation.disabled_at ? 'primary' : 'outline-danger'}
                size="sm"
                className="flex-1"
                onClick={() => handleToggle(selectedConversation)}
              >
                {selectedConversation.disabled_at ? (
                  <>
                    <ShieldCheck /> Re-enable
                  </>
                ) : (
                  <>
                    <ShieldOff /> Disable
                  </>
                )}
              </Button>
              <Button
                variant="danger"
                size="sm"
                className="flex-1"
                onClick={() => handleDelete(selectedConversation)}
                disabled={isBookingActive(selectedConversation)}
              >
                <Trash2 /> Move to Trash
              </Button>
            </div>
          ) : null
        }
      >
        {selectedConversation ? (
          <div className="space-y-6">
            {isBookingActive(selectedConversation) && (
              <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <span>
                  This conversation is linked to an active booking. It cannot be moved to
                  trash until the booking is completed or cancelled.
                </span>
              </div>
            )}
            <div className="flex items-center justify-between gap-4 rounded-xl bg-surface-200 p-4">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-brand-500/10">
                  <Users size={16} className="text-brand-600" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">
                    {selectedConversation.customerName || 'Unknown customer'}
                  </div>
                  <div className="text-xs text-foreground-lighter">
                    {selectedConversation.customerEmail}
                  </div>
                </div>
              </div>
              <MessageCircle size={18} className="shrink-0 text-foreground-lighter" />
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-success/10">
                  <Briefcase size={16} className="text-success" />
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-foreground">
                    {selectedConversation.workerName || 'Unassigned'}
                  </div>
                  <div className="text-xs text-foreground-lighter">
                    {selectedConversation.workerEmail}
                  </div>
                </div>
              </div>
            </div>

            {selectedConversation.disabled_at && (
              <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                <Ban size={16} className="shrink-0" />
                This conversation is disabled. Both parties cannot send messages until it is
                re-enabled.
              </div>
            )}

            <div className="space-y-3 rounded-xl border border-border bg-surface-100 p-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
              {isThreadLoading ? (
                <div className="space-y-3">
                  <div className="h-10 w-2/3 animate-pulse rounded-2xl bg-surface-200" />
                  <div className="h-10 w-1/2 ml-auto animate-pulse rounded-2xl bg-surface-200" />
                  <div className="h-10 w-3/5 animate-pulse rounded-2xl bg-surface-200" />
                </div>
              ) : threadMessages.length > 0 ? (
                threadMessages.map((message) => (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    align={message.senderRole === 'WORKER' ? 'right' : 'left'}
                  />
                ))
              ) : (
                <EmptyState
                  icon={MessageSquare}
                  title="No messages"
                  description="This conversation has no messages yet."
                />
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-foreground-lighter">
              <span className="flex items-center gap-1.5">
                <Clock size={12} /> Last activity:{' '}
                {formatActivity(lastActivityAt(selectedConversation))}
              </span>
              <span>{selectedConversation.messageCount} message(s)</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-foreground-lighter">No conversation selected.</p>
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
