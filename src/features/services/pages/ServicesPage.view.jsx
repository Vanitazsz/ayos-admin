import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Wrench,
  Box,
  Grid,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import Pagination from '../../../components/ui/Pagination';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/Table';

export function ServicesView({ model }) {
  const {
    searchTerm,
    setSearchTerm,
    filterCategory,
    setFilterCategory,
    currentPage,
    setCurrentPage,
    isModalOpen,
    setIsModalOpen,
    modalMode,
    currentService,
    setCurrentService,
    activeTab,
    setActiveTab,
    categoriesData,
    isCategoryModalOpen,
    setIsCategoryModalOpen,
    currentCategory,
    setCurrentCategory,
    confirm,
    closeConfirm,
    categories,
    filteredServices,
    totalPages,
    paginatedServices,
    stats,
    handleOpenAddModal,
    handleOpenEditModal,
    handleDelete,
    handleOpenAddCategoryModal,
    handleOpenEditCategoryModal,
    handleDeleteCategory,
    toggleCategoryStatus,
    handleDuplicate,
    handleSave,
    handleSaveCategory,
  } = model;
  return (
    <div className="p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Services Catalog</h1>
          <p className="text-foreground-lighter mt-1">
            Manage the services offered by workers on the platform
          </p>
        </div>
        <button
          onClick={activeTab === 'services' ? handleOpenAddModal : handleOpenAddCategoryModal}
          className="mt-4 sm:mt-0 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center"
        >
          <Plus size={18} className="mr-2" /> Add{' '}
          {activeTab === 'services' ? 'Service' : 'Category'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-border">
        <button
          className={`py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'services' ? 'border-foreground text-foreground' : 'border-transparent text-foreground-lighter hover:text-foreground-light hover:border-border-strong'}`}
          onClick={() => setActiveTab('services')}
        >
          Manage Services
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm border-b-2 flex items-center ${activeTab === 'categories' ? 'border-foreground text-foreground' : 'border-transparent text-foreground-lighter hover:text-foreground-light hover:border-border-strong'}`}
          onClick={() => setActiveTab('categories')}
        >
          Manage Categories
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat, index) => (
          <div
            key={index}
            className="bg-card rounded-xl shadow-sm border border-border p-6 flex items-center"
          >
            <div className={`p-4 rounded-lg ${stat.bg} mr-4`}>{stat.icon}</div>
            <div>
              <p className="text-sm text-foreground-lighter font-medium">{stat.label}</p>
              <h3 className="text-xl font-bold text-foreground">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="bg-card rounded-t-xl shadow-sm border-x border-t border-border p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="relative w-full sm:w-96">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-foreground-muted" />
          </div>
          <input
            type="text"
            aria-label="Search services by name or ID..."
            placeholder="Search services by name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="block w-full pl-10 pr-3 py-2 border border-border-strong rounded-lg focus:ring-ring focus:border-brand-500 text-sm"
          />
        </div>
        <div className="flex w-full sm:w-auto items-center gap-2">
          <Filter size={18} className="text-foreground-lighter" />
          <select
            className="border border-border-strong rounded-lg px-3 py-2 text-sm focus:ring-ring focus:border-brand-500"
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content Area */}
      {activeTab === 'services' ? (
        <>
          {/* Table */}
          <div className="bg-card shadow-sm border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Service</TableHead>
                  <TableHead scope="col">Category</TableHead>
                  <TableHead scope="col">Pricing & Time</TableHead>
                  <TableHead scope="col">Popularity</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col" className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedServices.length > 0 ? (
                  paginatedServices.map((service) => (
                    <TableRow key={service.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-brand-500/10 rounded-lg flex items-center justify-center">
                            <Wrench size={20} className="text-brand-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-foreground">{service.name}</div>
                            <div className="text-xs text-foreground-lighter">{service.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-surface-200 text-foreground-light rounded-md">
                          {service.category}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm text-foreground font-medium">
                          Starts at ${service.price}
                        </div>
                        <div className="text-xs text-foreground-lighter">Est. {service.duration}</div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm text-foreground">{service.bookings} Bookings</div>
                        <div className="text-xs text-foreground-lighter">
                          {service.workers} Active Workers
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            service.status === 'Active'
                              ? 'bg-success/10 text-success-600 dark:text-success-400'
                              : 'bg-surface-200 text-foreground'
                          }`}
                        >
                          {service.status}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleDuplicate(service)}
                            className="text-foreground-muted hover:text-brand-600 p-1 rounded-lg hover:bg-brand-500/10 transition-colors"
                            title="Duplicate"
                          >
                            <Copy size={18} />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(service)}
                            className="text-foreground-muted hover:text-info p-1 rounded-lg hover:bg-info/10 transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDelete(service.id)}
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
                    <TableCell colSpan="6" className="text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Box size={48} className="text-foreground-muted mb-4" />
                        <h3 className="text-lg font-medium text-foreground">No services found</h3>
                        <p className="text-foreground-lighter mt-1">Add a new service to get started.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {filteredServices.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      ) : (
        <div className="bg-card shadow-sm border border-border overflow-x-auto rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead scope="col">Category</TableHead>
                <TableHead scope="col">Total Services</TableHead>
                <TableHead scope="col">Status</TableHead>
                <TableHead scope="col" className="text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoriesData.map((cat) => (
                <TableRow key={cat.id}>
                  <TableCell className="whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 flex-shrink-0 bg-info/10 rounded-lg flex items-center justify-center">
                        <Grid size={20} className="text-info" />
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-foreground">{cat.name}</div>
                        <div className="text-xs text-foreground-lighter">{cat.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="text-sm text-foreground font-medium">
                      {cat.servicesCount} Services
                    </span>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <button
                      onClick={() => toggleCategoryStatus(cat.id)}
                      className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        cat.status === 'Enabled'
                          ? 'bg-success/10 text-success-600 dark:text-success-400 hover:bg-success/20'
                          : 'bg-surface-200 text-foreground hover:bg-surface-300'
                      }`}
                    >
                      {cat.status === 'Enabled' ? (
                        <ToggleRight size={16} />
                      ) : (
                        <ToggleLeft size={16} />
                      )}
                      <span>{cat.status}</span>
                    </button>
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-medium">
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => handleOpenEditCategoryModal(cat)}
                        className="text-foreground-muted hover:text-info p-1 rounded-lg hover:bg-info/10 transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className="text-foreground-muted hover:text-destructive p-1 rounded-lg hover:bg-destructive/10 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Add/Edit Service Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'add' ? 'Add New Service' : 'Edit Service'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground-light mb-1">Service Name</label>
            <input
              type="text"
              required
              value={currentService?.name || ''}
              onChange={(e) => setCurrentService({ ...currentService, name: e.target.value })}
              className="w-full border border-border-strong rounded-lg px-3 py-2 focus:ring-ring focus:border-brand-500"
              placeholder="e.g. Toilet Repair"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground-light mb-1">Category</label>
              <select
                required
                value={currentService?.category || ''}
                onChange={(e) => setCurrentService({ ...currentService, category: e.target.value })}
                className="w-full border border-border-strong rounded-lg px-3 py-2 focus:ring-ring focus:border-brand-500"
              >
                <option value="">Select Category</option>
                {categories
                  .filter((c) => c !== 'All')
                  .map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground-light mb-1">Status</label>
              <select
                value={currentService?.status || 'Active'}
                onChange={(e) => setCurrentService({ ...currentService, status: e.target.value })}
                className="w-full border border-border-strong rounded-lg px-3 py-2 focus:ring-ring focus:border-brand-500"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground-light mb-1">
                Starting Price ($)
              </label>
              <input
                type="number"
                required
                min="0"
                value={currentService?.price || ''}
                onChange={(e) =>
                  setCurrentService({ ...currentService, price: Number(e.target.value) })
                }
                className="w-full border border-border-strong rounded-lg px-3 py-2 focus:ring-ring focus:border-brand-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground-light mb-1">Est. Duration</label>
              <input
                type="text"
                required
                value={currentService?.duration || ''}
                onChange={(e) => setCurrentService({ ...currentService, duration: e.target.value })}
                className="w-full border border-border-strong rounded-lg px-3 py-2 focus:ring-ring focus:border-brand-500"
                placeholder="e.g. 2 hours"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground-light mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              className="w-full border border-border-strong rounded-lg px-3 py-2 focus:ring-ring focus:border-brand-500"
              placeholder="Brief description of what this service entails..."
            ></textarea>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-border-strong rounded-lg text-sm font-medium text-foreground-light hover:bg-surface-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 rounded-lg text-sm font-medium text-white hover:bg-brand-700"
            >
              {modalMode === 'add' ? 'Create Service' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add/Edit Category Modal */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={modalMode === 'add' ? 'Add New Category' : 'Edit Category'}
      >
        <form onSubmit={handleSaveCategory} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground-light mb-1">Category Name</label>
            <input
              type="text"
              required
              value={currentCategory?.name || ''}
              onChange={(e) => setCurrentCategory({ ...currentCategory, name: e.target.value })}
              className="w-full border border-border-strong rounded-lg px-3 py-2 focus:ring-ring focus:border-brand-500"
              placeholder="e.g. Landscaping"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground-light mb-1">Status</label>
            <select
              value={currentCategory?.status || 'Enabled'}
              onChange={(e) => setCurrentCategory({ ...currentCategory, status: e.target.value })}
              className="w-full border border-border-strong rounded-lg px-3 py-2 focus:ring-ring focus:border-brand-500"
            >
              <option value="Enabled">Enabled</option>
              <option value="Disabled">Disabled</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="px-4 py-2 border border-border-strong rounded-lg text-sm font-medium text-foreground-light hover:bg-surface-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 rounded-lg text-sm font-medium text-white hover:bg-brand-700"
            >
              {modalMode === 'add' ? 'Create Category' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>
      <ConfirmModal
        isOpen={confirm.isOpen}
        onClose={closeConfirm}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
}
