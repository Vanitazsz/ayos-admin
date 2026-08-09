import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Wrench,
  Grid,
  ToggleLeft,
  ToggleRight,
  Box,
} from 'lucide-react';
import Modal from '../../../components/ui/Modal';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import Pagination from '../../../components/ui/Pagination';
import StatCard from '../../../components/ui/StatCard';
import Input from '../../../components/ui/Input';
import Select from '../../../components/ui/Select';
import { moneyFromMinor } from '../../../services/adminShared';
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
    filterIndustry,
    setFilterIndustry,
    activeTab,
    setActiveTab,
    currentPage,
    setCurrentPage,
    isSkillModalOpen,
    setIsSkillModalOpen,
    isIndustryModalOpen,
    setIsIndustryModalOpen,
    modalMode,
    currentSkill,
    setCurrentSkill,
    currentIndustry,
    setCurrentIndustry,
    confirm,
    closeConfirm,
    industries,
    filteredSkills,
    totalPages,
    paginatedSkills,
    stats,
    industrySearch,
    setIndustrySearch,
    filterIndustryStatus,
    setFilterIndustryStatus,
    filteredIndustries,
    handleOpenAddSkillModal,
    handleOpenEditSkillModal,
    handleDeleteSkill,
    handleDuplicateSkill,
    handleSaveSkill,
    handleOpenAddIndustryModal,
    handleOpenEditIndustryModal,
    handleDeleteIndustry,
    toggleIndustryStatus,
    handleSaveIndustry,
  } = model;
  return (
    <div className="p-6">
      <div className="mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Industries &amp; Skills</h1>
          <p className="text-foreground-lighter mt-1">
            Manage the industries and skills offered by workers on the platform
          </p>
        </div>
        <button
          onClick={activeTab === 'skills' ? handleOpenAddSkillModal : handleOpenAddIndustryModal}
          className="mt-4 sm:mt-0 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium transition-colors shadow-sm flex items-center"
        >
          <Plus size={18} className="mr-2" /> Add{' '}
          {activeTab === 'skills' ? 'Skill' : 'Industry'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-border">
        <button
          className={`py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'skills' ? 'border-foreground text-foreground' : 'border-transparent text-foreground-lighter hover:text-foreground-light hover:border-border-strong'}`}
          onClick={() => setActiveTab('skills')}
        >
          Manage Skills
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'industries' ? 'border-foreground text-foreground' : 'border-transparent text-foreground-lighter hover:text-foreground-light hover:border-border-strong'}`}
          onClick={() => setActiveTab('industries')}
        >
          Manage Industries
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat, index) => (
          <StatCard key={index} title={stat.label} value={stat.value} icon={stat.icon} />
        ))}
      </div>

      {activeTab === 'skills' ? (
        <>
          {/* Filters and Search */}
          <div className="bg-card rounded-t-xl shadow-sm border-x border-t border-border p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="w-full sm:w-96">
              <Input
                icon={Search}
                aria-label="Search skills by name or ID..."
                placeholder="Search skills by name or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-56">
              <Select
                icon={Filter}
                aria-label="Filter skills by industry"
                value={filterIndustry}
                onChange={(e) => setFilterIndustry(e.target.value)}
              >
                {industries.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {/* Skills Table */}
          <div className="bg-card shadow-sm border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Skill</TableHead>
                  <TableHead scope="col">Industry</TableHead>
                  <TableHead scope="col">Pricing</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col" className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedSkills.length > 0 ? (
                  paginatedSkills.map((skill) => (
                    <TableRow key={skill.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 flex-shrink-0 bg-brand-500/10 rounded-lg flex items-center justify-center">
                            <Wrench size={20} className="text-brand-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-foreground">
                              {skill.name}
                            </div>
                            <div className="text-xs text-foreground-lighter">{skill.id}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-surface-200 text-foreground-light rounded-md">
                          {skill.industry}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <div className="text-sm text-foreground font-medium">
                          {skill.maximumPriceMinor != null
                            ? `${moneyFromMinor(skill.minimumPriceMinor)} – ${moneyFromMinor(skill.maximumPriceMinor)}`
                            : `From ${moneyFromMinor(skill.minimumPriceMinor)}`}
                        </div>
                        <div className="text-xs text-foreground-lighter">
                          {skill.workers} Active Workers
                          {skill.isSafetyCritical && ' · Safety critical'}
                        </div>
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        <span
                          className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            skill.status === 'Active'
                              ? 'bg-success/10 text-success-600 dark:text-success-400'
                              : 'bg-surface-200 text-foreground'
                          }`}
                        >
                          {skill.status}
                        </span>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => handleDuplicateSkill(skill)}
                            className="text-foreground-muted hover:text-brand-600 p-1 rounded-lg hover:bg-brand-500/10 transition-colors"
                            title="Duplicate"
                          >
                            <Copy size={18} />
                          </button>
                          <button
                            onClick={() => handleOpenEditSkillModal(skill)}
                            className="text-foreground-muted hover:text-info p-1 rounded-lg hover:bg-info/10 transition-colors"
                            title="Edit"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button
                            onClick={() => handleDeleteSkill(skill.id)}
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
                    <TableCell colSpan="5" className="text-center">
                      <div className="flex flex-col items-center justify-center">
                        <Box size={48} className="text-foreground-muted mb-4" />
                        <h3 className="text-lg font-medium text-foreground">No skills found</h3>
                        <p className="text-foreground-lighter mt-1">
                          Add a new skill to get started.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {filteredSkills.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </>
      ) : (
        <>
          {/* Filters and Search */}
          <div className="bg-card rounded-t-xl shadow-sm border-x border-t border-border p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="w-full sm:w-96">
              <Input
                icon={Search}
                aria-label="Search industries by name or ID..."
                placeholder="Search industries by name or ID..."
                value={industrySearch}
                onChange={(e) => setIndustrySearch(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-48">
              <Select
                icon={Filter}
                aria-label="Filter industries by status"
                value={filterIndustryStatus}
                onChange={(e) => setFilterIndustryStatus(e.target.value)}
              >
                <option value="All">All Statuses</option>
                <option value="Enabled">Enabled</option>
                <option value="Disabled">Disabled</option>
              </Select>
            </div>
          </div>

          {/* Industries Table */}
          <div className="bg-card shadow-sm border border-border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead scope="col">Industry</TableHead>
                  <TableHead scope="col">Description</TableHead>
                  <TableHead scope="col">Total Skills</TableHead>
                  <TableHead scope="col">Status</TableHead>
                  <TableHead scope="col" className="text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredIndustries.length > 0 ? (
                  filteredIndustries.map((industry) => (
                  <TableRow key={industry.id}>
                    <TableCell className="whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 bg-info/10 rounded-lg flex items-center justify-center">
                          <Grid size={20} className="text-info" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-foreground">
                            {industry.name}
                          </div>
                          <div className="text-xs text-foreground-lighter">{industry.id}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <div className="text-sm text-foreground-lighter line-clamp-2">
                        {industry.description || '—'}
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <span className="text-sm text-foreground font-medium">
                        {industry.skillsCount} Skills
                      </span>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <button
                        onClick={() => toggleIndustryStatus(industry.id)}
                        className={`inline-flex items-center space-x-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                          industry.status === 'Enabled'
                            ? 'bg-success/10 text-success-600 dark:text-success-400 hover:bg-success/20'
                            : 'bg-surface-200 text-foreground hover:bg-surface-300'
                        }`}
                      >
                        {industry.status === 'Enabled' ? (
                          <ToggleRight size={16} />
                        ) : (
                          <ToggleLeft size={16} />
                        )}
                        <span>{industry.status}</span>
                      </button>
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-medium">
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => handleOpenEditIndustryModal(industry)}
                          className="text-foreground-muted hover:text-info p-1 rounded-lg hover:bg-info/10 transition-colors"
                          title="Edit"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteIndustry(industry.id)}
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
                  <TableCell colSpan="5" className="text-center">
                    <div className="flex flex-col items-center justify-center">
                      <Box size={48} className="text-foreground-muted mb-4" />
                      <h3 className="text-lg font-medium text-foreground">No industries found</h3>
                      <p className="text-foreground-lighter mt-1">
                        Try adjusting your search or filters.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        </>
      )}

      {/* Add/Edit Skill Modal */}
      <Modal
        isOpen={isSkillModalOpen}
        onClose={() => setIsSkillModalOpen(false)}
        title={modalMode === 'add' ? 'Add New Skill' : 'Edit Skill'}
      >
        <form onSubmit={handleSaveSkill} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground-light mb-1">Skill Name</label>
            <input
              type="text"
              required
              value={currentSkill?.name || ''}
              onChange={(e) => setCurrentSkill({ ...currentSkill, name: e.target.value })}
              className="w-full border border-border-strong rounded-lg px-3 py-2 focus:ring-ring focus:border-brand-500"
              placeholder="e.g. Toilet Repair"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground-light mb-1">
                Industry
              </label>
              <select
                required
                value={currentSkill?.industry || ''}
                onChange={(e) => setCurrentSkill({ ...currentSkill, industry: e.target.value })}
                className="w-full border border-border-strong rounded-lg px-3 py-2 focus:ring-ring focus:border-brand-500"
              >
                <option value="">Select Industry</option>
                {industries
                  .filter((industry) => industry !== 'All')
                  .map((industry) => (
                    <option key={industry} value={industry}>
                      {industry}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground-light mb-1">Status</label>
              <select
                value={currentSkill?.status || 'Active'}
                onChange={(e) => setCurrentSkill({ ...currentSkill, status: e.target.value })}
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
                Min Price (₱)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  currentSkill?.minimumPriceMinor != null
                    ? currentSkill.minimumPriceMinor / 100
                    : ''
                }
                onChange={(e) =>
                  setCurrentSkill({
                    ...currentSkill,
                    minimumPriceMinor:
                      e.target.value === '' ? null : Math.round(Number(e.target.value) * 100),
                  })
                }
                className="w-full border border-border-strong rounded-lg px-3 py-2 focus:ring-ring focus:border-brand-500"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground-light mb-1">
                Max Price (₱)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={
                  currentSkill?.maximumPriceMinor != null
                    ? currentSkill.maximumPriceMinor / 100
                    : ''
                }
                onChange={(e) =>
                  setCurrentSkill({
                    ...currentSkill,
                    maximumPriceMinor:
                      e.target.value === '' ? null : Math.round(Number(e.target.value) * 100),
                  })
                }
                className="w-full border border-border-strong rounded-lg px-3 py-2 focus:ring-ring focus:border-brand-500"
                placeholder="0.00"
              />
            </div>
          </div>

          <label className="flex items-center space-x-2 cursor-pointer">
            <input
              type="checkbox"
              checked={Boolean(currentSkill?.isSafetyCritical)}
              onChange={(e) =>
                setCurrentSkill({ ...currentSkill, isSafetyCritical: e.target.checked })
              }
              className="h-4 w-4 accent-brand-600"
            />
            <span className="text-sm text-foreground-light">Safety critical</span>
          </label>

          <div className="pt-4 flex justify-end space-x-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsSkillModalOpen(false)}
              className="px-4 py-2 border border-border-strong rounded-lg text-sm font-medium text-foreground-light hover:bg-surface-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 rounded-lg text-sm font-medium text-white hover:bg-brand-700"
            >
              {modalMode === 'add' ? 'Create Skill' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Add/Edit Industry Modal */}
      <Modal
        isOpen={isIndustryModalOpen}
        onClose={() => setIsIndustryModalOpen(false)}
        title={modalMode === 'add' ? 'Add New Industry' : 'Edit Industry'}
      >
        <form onSubmit={handleSaveIndustry} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground-light mb-1">
              Industry Name
            </label>
            <input
              type="text"
              required
              value={currentIndustry?.name || ''}
              onChange={(e) => setCurrentIndustry({ ...currentIndustry, name: e.target.value })}
              className="w-full border border-border-strong rounded-lg px-3 py-2 focus:ring-ring focus:border-brand-500"
              placeholder="e.g. Landscaping"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground-light mb-1">
              Description (Optional)
            </label>
            <textarea
              rows={3}
              value={currentIndustry?.description || ''}
              onChange={(e) =>
                setCurrentIndustry({ ...currentIndustry, description: e.target.value })
              }
              className="w-full border border-border-strong rounded-lg px-3 py-2 focus:ring-ring focus:border-brand-500"
              placeholder="Brief description of this industry..."
            ></textarea>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground-light mb-1">Status</label>
            <select
              value={currentIndustry?.status || 'Enabled'}
              onChange={(e) =>
                setCurrentIndustry({ ...currentIndustry, status: e.target.value })
              }
              className="w-full border border-border-strong rounded-lg px-3 py-2 focus:ring-ring focus:border-brand-500"
            >
              <option value="Enabled">Enabled</option>
              <option value="Disabled">Disabled</option>
            </select>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-border">
            <button
              type="button"
              onClick={() => setIsIndustryModalOpen(false)}
              className="px-4 py-2 border border-border-strong rounded-lg text-sm font-medium text-foreground-light hover:bg-surface-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-600 rounded-lg text-sm font-medium text-white hover:bg-brand-700"
            >
              {modalMode === 'add' ? 'Create Industry' : 'Save Changes'}
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
