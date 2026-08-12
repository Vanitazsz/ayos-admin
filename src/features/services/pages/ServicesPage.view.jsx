import {
  Search,
  Filter,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Wrench,
  Grid,
  Box,
  MoreVertical,
  Eye,
  AlertTriangle,
  Power,
  ExternalLink,
} from 'lucide-react';
import Drawer from '../../../components/ui/Drawer';
import ConfirmModal from '../../../components/ui/ConfirmModal';
import Button from '../../../components/ui/Button';
import Pagination from '../../../components/ui/Pagination';
import StatCard from '../../../components/ui/StatCard';
import Input from '../../../components/ui/Input';
import Select, { SelectItem } from '../../../components/ui/Select';
import DateFilter from '../../../components/ui/DateFilter';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '../../../components/ui/Tooltip';
import { moneyFromMinor } from '../../../services/adminShared';
import {
  DropdownMenuNonModal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '../../../components/ui/DropdownMenu';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '../../../components/ui/Table';
import TableSkeleton from '../../../components/ui/TableSkeleton';

export function ServicesView({ model }) {
  const {
    searchTerm,
    setSearchTerm,
    filterIndustry,
    setFilterIndustry,
    skillDateFilter,
    industryDateFilter,
    activeTab,
    setActiveTab,
    currentPage,
    setCurrentPage,
    isLoading,
    error,
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
    handleDeactivateSkill,
    handleDuplicateSkill,
    handleSaveSkill,
    details,
    closeDetails,
    openSkillDetails,
    openIndustryDetails,
    goToTrash,
    handleMoveSkillToTrash,
    handleMoveIndustryToTrash,
    handleOpenAddIndustryModal,
    handleOpenEditIndustryModal,
    handleDeactivateIndustry,
    handleSaveIndustry,
  } = model;
  return (
    <TooltipProvider delayDuration={200}>
    <div className="p-4 sm:p-6">
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

      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-4 mb-6 border-b border-border">
        <button
          className={`py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'industries' ? 'border-foreground text-foreground' : 'border-transparent text-foreground-lighter hover:text-foreground-light hover:border-border-strong'}`}
          onClick={() => setActiveTab('industries')}
        >
          Manage Industries
        </button>
        <button
          className={`py-2 px-4 font-medium text-sm border-b-2 ${activeTab === 'skills' ? 'border-foreground text-foreground' : 'border-transparent text-foreground-lighter hover:text-foreground-light hover:border-border-strong'}`}
          onClick={() => setActiveTab('skills')}
        >
          Manage Skills
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
            <div className="flex w-full sm:w-auto items-center gap-2">
              <DateFilter model={skillDateFilter} />
              <div className="w-full sm:w-56">
                <Select
                  icon={Filter}
                  aria-label="Filter skills by industry"
                value={filterIndustry}
                onChange={(e) => setFilterIndustry(e.target.value)}
              >
                {industries.map((industry) => (
                  <SelectItem key={industry} value={industry}>
                    {industry}
                  </SelectItem>
                ))}
              </Select>
            </div>
            </div>
          </div>

          {/* Skills Table */}
          <div className="bg-card shadow-sm border border-border">
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
                {isLoading ? (
                  <TableSkeleton
                    rows={6}
                    columns={[{}, {}, {}, {}, { className: 'text-right' }]}
                  />
                ) : paginatedSkills.length > 0 ? (
                  paginatedSkills.map((skill) => {
                    const trashed = Boolean(skill.isTrashed);
                    const row = (
                      <TableRow
                        key={skill.id}
                        onClick={() =>
                          trashed
                            ? goToTrash('skill', skill.trashEntryId)
                            : openSkillDetails(skill)
                        }
                        className={`cursor-pointer ${trashed ? 'opacity-55 grayscale' : ''}`}
                      >
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
                          {trashed ? (
                            <span className="inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium bg-warning/10 text-warning-600 dark:text-warning-400">
                              In Trash
                            </span>
                          ) : (
                            <span
                              className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                skill.status === 'Active'
                                  ? 'bg-success/10 text-success-600 dark:text-success-400'
                                  : 'bg-surface-200 text-foreground'
                              }`}
                            >
                              {skill.status}
                            </span>
                          )}
                        </TableCell>
                        <TableCell
                          className="whitespace-nowrap text-right font-medium"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenuNonModal>
                            <DropdownMenuTrigger asChild>
                              <button
                                aria-label={`Open actions for ${skill.name}`}
                                className="inline-flex items-center justify-center rounded-full p-1.5 text-foreground-muted transition-colors hover:bg-surface-200 hover:text-foreground"
                              >
                                <MoreVertical size={20} />
                              </button>
                            </DropdownMenuTrigger>
                            {trashed ? (
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                  onSelect={() => goToTrash('skill', skill.trashEntryId)}
                                  className="cursor-pointer"
                                >
                                  <ExternalLink className="mr-2" /> View in Trash
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            ) : (
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem
                                  onSelect={() => openSkillDetails(skill)}
                                  className="cursor-pointer"
                                >
                                  <Eye className="mr-2" /> View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => handleOpenEditSkillModal(skill)}
                                  className="cursor-pointer"
                                >
                                  <Edit2 className="mr-2" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => handleDuplicateSkill(skill)}
                                  className="cursor-pointer"
                                >
                                  <Copy className="mr-2" /> Duplicate
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onSelect={() => handleDeactivateSkill(skill)}
                                  className="cursor-pointer"
                                >
                                  <Power className="mr-2" />
                                  {skill.status === 'Active' ? 'Deactivate' : 'Activate'}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            )}
                          </DropdownMenuNonModal>
                        </TableCell>
                      </TableRow>
                    );
                    return trashed ? (
                      <Tooltip key={skill.id} delayDuration={150}>
                        <TooltipTrigger asChild>{row}</TooltipTrigger>
                        <TooltipContent>In trash — click to open in Trash</TooltipContent>
                      </Tooltip>
                    ) : (
                      row
                    );
                  })
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
            <div className="flex w-full sm:w-auto items-center gap-2">
              <DateFilter model={industryDateFilter} />
              <div className="w-full sm:w-48">
                <Select
                  icon={Filter}
                  aria-label="Filter industries by status"
                value={filterIndustryStatus}
                onChange={(e) => setFilterIndustryStatus(e.target.value)}
              >
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Enabled">Enabled</SelectItem>
                <SelectItem value="Disabled">Disabled</SelectItem>
              </Select>
            </div>
            </div>
          </div>

          {/* Industries Table */}
          <div className="bg-card shadow-sm border border-border">
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
                {isLoading ? (
                  <TableSkeleton
                    rows={6}
                    columns={[{}, {}, {}, {}, { className: 'text-right' }]}
                  />
                ) : filteredIndustries.length > 0 ? (
                  filteredIndustries.map((industry) => {
                    const trashed = Boolean(industry.isTrashed);
                    const row = (
                    <TableRow
                      key={industry.id}
                      onClick={() =>
                        trashed
                          ? goToTrash('industry', industry.trashEntryId)
                          : openIndustryDetails(industry)
                      }
                      className={`cursor-pointer ${trashed ? 'opacity-55 grayscale' : ''}`}
                    >
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
                      <TableCell
                        className="whitespace-nowrap"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {trashed ? (
                          <span className="inline-flex px-3 py-1.5 rounded-full text-xs font-medium bg-warning/10 text-warning-600 dark:text-warning-400">
                            In Trash
                          </span>
                        ) : (
                          <span
                            className={`inline-flex px-3 py-1.5 rounded-full text-xs font-medium ${
                              industry.status === 'Enabled'
                                ? 'bg-success/10 text-success-600 dark:text-success-400'
                                : 'bg-surface-200 text-foreground'
                            }`}
                          >
                            {industry.status === 'Enabled' ? 'Deactivate' : 'Activate'}
                          </span>
                        )}
                      </TableCell>
                      <TableCell
                        className="whitespace-nowrap text-right font-medium"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenuNonModal>
                          <DropdownMenuTrigger asChild>
                            <button
                              aria-label={`Open actions for ${industry.name}`}
                              className="inline-flex items-center justify-center rounded-full p-1.5 text-foreground-muted transition-colors hover:bg-surface-200 hover:text-foreground"
                            >
                              <MoreVertical size={20} />
                            </button>
                          </DropdownMenuTrigger>
                          {trashed ? (
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onSelect={() => goToTrash('industry', industry.trashEntryId)}
                                className="cursor-pointer"
                              >
                                <ExternalLink className="mr-2" /> View in Trash
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          ) : (
                            <DropdownMenuContent align="end" className="w-44">
                              <DropdownMenuItem
                                onSelect={() => openIndustryDetails(industry)}
                                className="cursor-pointer"
                              >
                                <Eye className="mr-2" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => handleOpenEditIndustryModal(industry)}
                                className="cursor-pointer"
                              >
                                <Edit2 className="mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onSelect={() => handleDeactivateIndustry(industry)}
                                className="cursor-pointer"
                              >
                                <Power className="mr-2" />
                                {industry.status === 'Enabled' ? 'Deactivate' : 'Activate'}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          )}
                        </DropdownMenuNonModal>
                      </TableCell>
                    </TableRow>
                    );
                    return trashed ? (
                      <Tooltip key={industry.id} delayDuration={150}>
                        <TooltipTrigger asChild>{row}</TooltipTrigger>
                        <TooltipContent>In trash — click to open in Trash</TooltipContent>
                      </Tooltip>
                    ) : (
                      row
                    );
                  })
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

      {/* Add/Edit Skill Drawer */}
      <Drawer
        isOpen={isSkillModalOpen}
        onClose={() => setIsSkillModalOpen(false)}
        title={modalMode === 'add' ? 'Add New Skill' : 'Edit Skill'}
        width="w-[500px]"
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

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-foreground-light mb-1">
                Industry
              </label>
              <Select
                required
                label="Industry"
                value={currentSkill?.industry || ''}
                onChange={(e) => setCurrentSkill({ ...currentSkill, industry: e.target.value })}
              >
                <SelectItem value="">Select Industry</SelectItem>
                {industries
                  .filter((industry) => industry !== 'All')
                  .map((industry) => (
                    <SelectItem key={industry} value={industry}>
                      {industry}
                    </SelectItem>
                  ))}
              </Select>
            </div>
            <div>
              <Select
                label="Status"
                value={currentSkill?.status || 'Active'}
                onChange={(e) => setCurrentSkill({ ...currentSkill, status: e.target.value })}
              >
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
      </Drawer>

      {/* Add/Edit Industry Drawer */}
      <Drawer
        isOpen={isIndustryModalOpen}
        onClose={() => setIsIndustryModalOpen(false)}
        title={modalMode === 'add' ? 'Add New Industry' : 'Edit Industry'}
        width="w-[500px]"
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
            <Select
              label="Status"
              value={currentIndustry?.status || 'Enabled'}
              onChange={(e) =>
                setCurrentIndustry({ ...currentIndustry, status: e.target.value })
              }
            >
              <SelectItem value="Enabled">Enabled</SelectItem>
              <SelectItem value="Disabled">Disabled</SelectItem>
            </Select>
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
      </Drawer>

      {/* Skill Details Drawer */}
      <Drawer
        isOpen={details?.type === 'skill'}
        onClose={closeDetails}
        title="Skill Details"
        width="w-[500px]"
        footer={
          details?.type === 'skill' ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  closeDetails();
                  handleOpenEditSkillModal(details.item);
                }}
              >
                <Edit2 /> Edit
              </Button>
              <Button
                variant="danger"
                onClick={() => handleMoveSkillToTrash(details.item)}
              >
                <Trash2 /> Move to Trash
              </Button>
            </>
          ) : null
        }
      >
        {details?.type === 'skill' && details.item && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex-shrink-0 bg-brand-500/10 rounded-lg flex items-center justify-center">
                <Wrench size={20} className="text-brand-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {details.item.name}
                </h3>
                <p className="text-xs text-foreground-lighter font-mono">
                  {details.item.id}
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-foreground-lighter">Industry</dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  {details.item.industry}
                </dd>
              </div>
              <div>
                <dt className="text-foreground-lighter">Status</dt>
                <dd className="mt-0.5">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      details.item.status === 'Active'
                        ? 'bg-success/10 text-success-600 dark:text-success-400'
                        : 'bg-surface-200 text-foreground'
                    }`}
                  >
                    {details.item.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-foreground-lighter">Pricing</dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  {details.item.maximumPriceMinor != null
                    ? `${moneyFromMinor(details.item.minimumPriceMinor)} – ${moneyFromMinor(details.item.maximumPriceMinor)}`
                    : `From ${moneyFromMinor(details.item.minimumPriceMinor)}`}
                </dd>
              </div>
              <div>
                <dt className="text-foreground-lighter">Active Workers</dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  {details.item.workers}
                </dd>
              </div>
            </dl>
            {details.item.isSafetyCritical && (
              <div className="inline-flex items-center gap-1.5 rounded-md bg-warning/10 px-2 py-1 text-xs font-medium text-warning-700 dark:text-warning-500">
                <AlertTriangle size={14} /> Safety critical
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* Industry Details Drawer */}
      <Drawer
        isOpen={details?.type === 'industry'}
        onClose={closeDetails}
        title="Industry Details"
        width="w-[500px]"
        footer={
          details?.type === 'industry' ? (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  closeDetails();
                  handleOpenEditIndustryModal(details.item);
                }}
              >
                <Edit2 /> Edit
              </Button>
              <Button
                variant="danger"
                onClick={() => handleMoveIndustryToTrash(details.item)}
              >
                <Trash2 /> Move to Trash
              </Button>
            </>
          ) : null
        }
      >
        {details?.type === 'industry' && details.item && (
          <div className="space-y-5">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex-shrink-0 bg-info/10 rounded-lg flex items-center justify-center">
                <Grid size={20} className="text-info" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">
                  {details.item.name}
                </h3>
                <p className="text-xs text-foreground-lighter font-mono">
                  {details.item.id}
                </p>
              </div>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-foreground-lighter">Status</dt>
                <dd className="mt-0.5">
                  <span
                    className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      details.item.status === 'Enabled'
                        ? 'bg-success/10 text-success-600 dark:text-success-400'
                        : 'bg-surface-200 text-foreground'
                    }`}
                  >
                    {details.item.status}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-foreground-lighter">Total Skills</dt>
                <dd className="mt-0.5 font-medium text-foreground">
                  {details.item.skillsCount}
                </dd>
              </div>
            </dl>
            {details.item.description && (
              <div>
                <dt className="text-sm text-foreground-lighter">Description</dt>
                <p className="mt-1 text-sm text-foreground leading-relaxed">
                  {details.item.description}
                </p>
              </div>
            )}
          </div>
        )}
      </Drawer>

      <ConfirmModal
        isOpen={confirm.isOpen}
        onClose={closeConfirm}
        title={confirm.title}
        message={confirm.message}
        onConfirm={confirm.onConfirm}
        confirmLabel={confirm.confirmLabel || 'Delete'}
        variant="danger"
      />
    </div>
    </TooltipProvider>
  );
}
