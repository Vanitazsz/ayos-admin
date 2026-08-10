import { Bell, Send, Filter, Search, Trash2 } from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import Pagination from '../../../components/ui/Pagination';
import TableSkeleton from '../../../components/ui/TableSkeleton';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/Table';

export function NotificationsView({ model }) {
  const {
    isLoading,
    error,
    searchTerm,
    setSearchTerm,
    filterType,
    setFilterType,
    currentPage,
    setCurrentPage,
    isModalOpen,
    setIsModalOpen,
    campaign,
    setCampaign,
    filteredNotifs,
    totalPages,
    paginatedNotifs,
    stats,
    getTypeIcon,
    getStatusColor,
    handleDelete,
    saveCampaign,
  } = model;
  return (
    <div className="p-4 sm:p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications Engine</h1>
          <p className="text-foreground-lighter mt-1">Manage email, SMS, and push notification campaigns</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="mt-4 sm:mt-0 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center"
        >
          <Bell size={18} className="mr-2" /> Create Notification
        </button>
      </div>
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-card rounded-xl shadow-sm border border-border p-6 flex items-center"
          >
            <div className={`p-4 rounded-lg ${stat.bg} mr-4`}>{stat.icon}</div>
            <div>
              <p className="text-sm text-foreground-lighter font-medium">{stat.label}</p>
              <h3 className="text-2xl font-bold text-foreground">{stat.value}</h3>
            </div>
          </div>
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
            className="block w-full pl-10 pr-3 py-2 border border-border-strong rounded-lg focus:ring-ring focus:border-brand-500 text-sm"
          />
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <Filter size={18} className="text-foreground-lighter" />
          <select
            className="w-full flex-1 border border-border-strong rounded-lg px-3 py-2 text-sm focus:ring-ring focus:border-brand-500 sm:w-auto sm:flex-none"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="All">All Channels</option>
            <option value="Email">Email</option>
            <option value="SMS">SMS</option>
            <option value="Push">Push Notification</option>
          </select>
        </div>
      </div>

      <div className="bg-card shadow-sm border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Campaign Details</TableHead>
              <TableHead scope="col">Target Audience</TableHead>
              <TableHead scope="col">Channel</TableHead>
              <TableHead scope="col">Status / Date</TableHead>
              <TableHead scope="col" className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableSkeleton
                rows={6}
                columns={[{}, {}, {}, {}, { className: 'text-right' }]}
              />
            ) : paginatedNotifs.length > 0 ? (
              paginatedNotifs.map((n) => (
                <TableRow key={n.id}>
                  <TableCell className="whitespace-nowrap">
                    <div className="text-sm font-bold text-foreground">{n.title}</div>
                    <div className="text-xs text-foreground-lighter">{n.id}</div>
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
                    <div className="flex items-center text-sm text-foreground-light bg-surface-200 px-2 py-1 rounded inline-flex">
                      {getTypeIcon(n.type)}
                      <span className="ml-2 font-medium">{n.type}</span>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium mb-1 ${getStatusColor(n.status)}`}
                    >
                      {n.status}
                    </span>
                    <div className="text-xs text-foreground-lighter">{n.date}</div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="text-foreground-muted hover:text-destructive p-1 rounded-lg hover:bg-destructive/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow hover={false}>
                <TableCell colSpan="5" className="py-12 text-center text-foreground-lighter">
                  No notifications found.
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
        title="Create New Notification"
        maxWidth="max-w-2xl"
      >
        <form className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground-light mb-1">Campaign Title</label>
            <input
              type="text"
              value={campaign.title}
              onChange={(event) => setCampaign({ ...campaign, title: event.target.value })}
              className="w-full border border-border-strong rounded-lg px-3 py-2 focus:ring-ring"
              placeholder="e.g. Service update"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground-light mb-1">
                Target Audience
              </label>
              <select
                value={campaign.audience}
                onChange={(event) => setCampaign({ ...campaign, audience: event.target.value })}
                className="w-full border border-border-strong rounded-lg px-3 py-2"
              >
                <option value="EVERYONE">All Users</option>
                <option value="WORKERS">Workers Only</option>
                <option value="USERS">Customers Only</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground-light mb-1">Channel</label>
              <select className="w-full border border-border-strong rounded-lg px-3 py-2">
                <option>In-App</option>
                <option disabled>Push (Unavailable)</option>
                <option disabled>SMS (Unavailable)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground-light mb-1">Message Content</label>
            <textarea
              rows={4}
              value={campaign.message}
              onChange={(event) => setCampaign({ ...campaign, message: event.target.value })}
              className="w-full border border-border-strong rounded-lg px-3 py-2 focus:ring-ring"
              placeholder="Type your message here..."
            ></textarea>
          </div>
          <div className="pt-4 border-t border-border flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-border-strong rounded-lg text-sm font-medium text-foreground-light"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void saveCampaign(false)}
              className="px-4 py-2 border border-border-strong rounded-lg text-sm font-medium text-foreground-light"
            >
              Save as Draft
            </button>
            <button
              type="button"
              onClick={() => void saveCampaign(true)}
              className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium flex items-center"
            >
              <Send size={16} className="mr-2" /> Send Now
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
