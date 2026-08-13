import { HeadphonesIcon, Search, Filter, CheckCircle, Send, User, Loader2 } from 'lucide-react';
import Drawer from '../../../components/ui/Drawer';
import Pagination from '../../../components/ui/Pagination';
import { formatDateTime } from '../../../services/adminShared';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../../components/ui/Table';
import TableSkeleton from '../../../components/ui/TableSkeleton';
import Skeleton from '../../../components/ui/Skeleton';
import StatCard from '../../../components/ui/StatCard';
import DateFilter from '../../../components/ui/DateFilter';
import Select, { SelectItem } from '../../../components/ui/Select';

export function SupportView({ model }) {
  const {
    searchTerm,
    setSearchTerm,
    filterStatus,
    setFilterStatus,
    ticketDateFilter,
    safetyDateFilter,
    currentPage,
    setCurrentPage,
    selectedTicket,
    isLoading,
    isDrawerOpen,
    setIsDrawerOpen,
    replyText,
    setReplyText,
    filteredSafetyCases,
    filteredTickets,
    totalPages,
    paginatedTickets,
    stats,
    getPriorityColor,
    getStatusColor,
    openTicket,
    handleSendReply,
    markResolved,
    escalateTicket,
    reopenTicket,
  } = model;
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Support Center</h1>
          <p className="text-foreground-lighter mt-1">Manage customer and worker support tickets</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <StatCard key={index} title={stat.label} value={stat.value} icon={stat.icon} />
        ))}
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border mb-8">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Safety Reports & Disputes</h2>
            <p className="text-sm text-foreground-lighter">Read-only visibility into booking safety cases.</p>
          </div>
          <DateFilter model={safetyDateFilter} />
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">
                Type
              </TableHead>
              <TableHead scope="col">
                Booking
              </TableHead>
              <TableHead scope="col">
                Reason
              </TableHead>
              <TableHead scope="col">
                Status
              </TableHead>
              <TableHead scope="col">
                Created
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton rows={4} columns={[{}, {}, {}, {}, {}]} />
            ) : filteredSafetyCases.length ? (
              filteredSafetyCases.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium text-foreground">{item.kind}</TableCell>
                  <TableCell className="text-xs text-foreground-light">{item.bookingId ?? '—'}</TableCell>
                  <TableCell className="text-foreground-light max-w-lg">{item.reason}</TableCell>
                  <TableCell className="text-foreground-light">{item.status}</TableCell>
                  <TableCell className="text-foreground-lighter">
                    {formatDateTime(item.createdAt)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow hover={false}>
                <TableCell colSpan="5" className="text-center text-foreground-lighter">
                  No safety cases found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="bg-card rounded-t-xl shadow-sm border-x border-t border-border p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-foreground-muted" />
          </div>
          <input
            type="text"
            aria-label="Search tickets by ID or subject..."
            placeholder="Search tickets by ID or subject..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-border-strong rounded-lg focus-ring text-sm"
          />
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <DateFilter model={ticketDateFilter} />
          <Filter size={18} className="text-foreground-lighter" />
          <Select
            icon={Filter}
            aria-label="Filter by status"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full flex-1 sm:w-auto sm:flex-none"
          >
            <SelectItem value="All">All Statuses</SelectItem>
            <SelectItem value="Open">Open</SelectItem>
            <SelectItem value="Pending">Pending</SelectItem>
            <SelectItem value="Resolved">Resolved</SelectItem>
          </Select>
        </div>
      </div>

      <div className="bg-card shadow-sm border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">
                Ticket Info
              </TableHead>
              <TableHead scope="col">
                Subject & Category
              </TableHead>
              <TableHead scope="col">
                Assigned To
              </TableHead>
              <TableHead scope="col">
                Priority
              </TableHead>
              <TableHead scope="col">
                Status
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
                  {},
                  {},
                  {},
                  {
                    children: <Skeleton className="h-6 w-16 rounded-full" />,
                  },
                  {
                    children: <Skeleton className="h-6 w-16 rounded-full" />,
                  },
                  { className: 'text-right' },
                ]}
              />
            ) : paginatedTickets.length > 0 ? (
              paginatedTickets.map((ticket) => (
                <TableRow
                  key={ticket.id}
                  className="cursor-pointer"
                  onClick={() => openTicket(ticket)}
                >
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm font-medium text-foreground">{ticket.id}</div>
                    <div className="text-xs text-foreground-lighter">{ticket.date}</div>
                    <div className="text-xs text-brand-600 mt-1 font-medium">{ticket.customer}</div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm font-medium text-foreground truncate">
                      {ticket.subject}
                    </div>
                    <div className="text-xs text-foreground-lighter">{ticket.category}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <div
                      className={`text-sm ${!ticket.assignedTo ? 'text-foreground-muted italic' : 'text-foreground'}`}
                    >
                      {ticket.assignedTo || 'Not assigned'}
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(ticket.priority)}`}
                    >
                      {ticket.priority}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span
                      className={`inline-flex px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(ticket.status)}`}
                    >
                      {ticket.status}
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-medium relative" />
                </TableRow>
              ))
            ) : (
              <TableRow hover={false}>
                <TableCell colSpan="6" className="text-center">
                  <HeadphonesIcon size={48} className="text-foreground-muted mb-4 mx-auto" />
                  <h3 className="text-lg font-medium text-foreground">No tickets found</h3>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {filteredTickets.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      )}

      {/* Ticket Detail & Chat Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title={`Ticket ${selectedTicket?.id}`}
        width="w-[500px]"
      >
        {selectedTicket && (
          <div className="flex flex-col h-full -mx-6 -my-6">
            {/* Header info */}
            <div className="p-6 border-b border-border bg-surface-200 shrink-0">
              <h3 className="text-lg font-bold text-foreground mb-1">{selectedTicket.subject}</h3>
              <div className="flex flex-wrap gap-2 mb-4">
                <span
                  className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(selectedTicket.status)}`}
                >
                  {selectedTicket.status}
                </span>
                <span
                  className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(selectedTicket.priority)}`}
                >
                  {selectedTicket.priority} Priority
                </span>
                <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-surface-300 text-foreground">
                  {selectedTicket.category}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <div>
                  <p className="text-foreground-lighter">Requested by</p>
                  <p className="font-medium flex items-center mt-1">
                    <User size={14} className="mr-1" /> {selectedTicket.customer}
                  </p>
                </div>
                <div>
                  <p className="text-foreground-lighter text-right">Assigned to</p>
                  <p className="font-medium flex items-center mt-1 text-right">
                    {selectedTicket.assignedTo || 'Not assigned'}
                  </p>
                </div>
              </div>
            </div>

            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-6 bg-card space-y-6">
              <div className="flex">
                <div className="flex-shrink-0 mr-3">
                  <div className="h-8 w-8 rounded-full bg-brand-500/10 flex items-center justify-center text-brand-600 font-bold text-xs">
                    {selectedTicket.customer.charAt(0)}
                  </div>
                </div>
                <div>
                  <div className="bg-surface-200 rounded-lg p-3 text-sm text-foreground rounded-tl-none">
                    <p>{selectedTicket.description}</p>
                  </div>
                  <p className="text-xs text-foreground-muted mt-1">{selectedTicket.date}</p>
                </div>
              </div>
              {isMessagesLoading ? (
                <div className="flex items-center justify-center py-10 text-foreground-lighter">
                  <Loader2 size={18} className="animate-spin mr-2" /> Loading messages...
                </div>
              ) : selectedTicket.messages.length ? (
                selectedTicket.messages.map((message) => {
                const fromRequester = message.sender === selectedTicket.customer;
                return (
                  <div
                    key={message.id}
                    className={`flex ${fromRequester ? '' : 'flex-row-reverse'}`}
                  >
                    <div className={`flex-shrink-0 ${fromRequester ? 'mr-3' : 'ml-3'}`}>
                      <div
                        className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${fromRequester ? 'bg-brand-500/10 text-brand-600' : 'bg-foreground text-foreground-contrast'}`}
                      >
                        {message.sender.charAt(0)}
                      </div>
                    </div>
                    <div>
                      <div
                        className={`rounded-lg p-3 text-sm ${fromRequester ? 'bg-surface-200 text-foreground rounded-tl-none' : 'bg-brand-600 text-white rounded-tr-none'}`}
                      >
                        <p>{message.body}</p>
                      </div>
                      <p
                        className={`text-xs text-foreground-muted mt-1 ${fromRequester ? '' : 'text-right'}`}
                      >
                        {formatDateTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
              ) : (
                <p className="text-sm text-foreground-lighter text-center py-10">
                  No messages yet.
                </p>
              )}
            </div>

            {/* Reply box */}
            <div className="p-4 border-t border-border bg-card shrink-0">
              {selectedTicket.status === 'Resolved' || selectedTicket.status === 'Closed' ? (
                <div className="text-center py-4 bg-surface-200 rounded-lg border border-border">
                  <p className="text-foreground-lighter font-medium">
                    This ticket is {selectedTicket.status.toLowerCase()}.
                  </p>
                  <button
                    onClick={reopenTicket}
                    className="mt-2 text-sm text-brand-600 font-medium hover:underline"
                  >
                    Reopen Ticket
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={markResolved}
                      className="text-xs font-medium bg-success/10 text-success-600 dark:text-success-400 px-3 py-1.5 rounded border border-success/30 hover:bg-success/10"
                    >
                      <CheckCircle size={12} className="inline mr-1" /> Mark Resolved
                    </button>
                    <button
                      onClick={escalateTicket}
                      className="text-xs font-medium bg-destructive/10 text-destructive px-3 py-1.5 rounded border border-destructive/30 hover:bg-destructive/10"
                    >
                      Escalate
                    </button>
                  </div>
                  <div className="relative">
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your reply to the customer..."
                      className="w-full border border-border-strong rounded-lg pl-3 pr-10 py-2 text-sm focus-ring resize-none"
                    ></textarea>
                  </div>
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleSendReply}
                      className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium flex items-center shadow-sm"
                    >
                      <Send size={16} className="mr-2" /> Send Reply
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}
