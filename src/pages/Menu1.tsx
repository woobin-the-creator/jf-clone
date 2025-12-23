import { useState, useMemo } from "react";
import DetailedInfoModal from "@/components/menu1/DetailedInfoModal";
import CommentModal from "@/components/menu1/CommentModal";
import FilterControls from "@/components/menu1/FilterControls";
import PaginationControls from "@/components/menu1/PaginationControls";
import RequestTable from "@/components/menu1/RequestTable";
import { useMenu1State } from "@/hooks/useMenu1State";
import { useMenu1Data } from "@/hooks/useMenu1Data";
import type { RequestSubmission } from "@/types/menu1.types";
import { filterData, downloadCSV, ITEMS_PER_PAGE } from "@/utils/menu1.utils";

export default function Menu1() {
  // ==================== DATA ====================
  const { submissionsData, empInfoData, isLoading, updateAssigneeMutation } = useMenu1Data();

  // ==================== STATE & PAGINATION ====================
  // Note: We need to call useMenu1State first to get filters
  const {
    filters,
    setFilters,
    searchInput,
    setSearchInput,
    appliedSearchTerm,
    applySearchTerm,
    handleColumnFilter,
    currentPage,
    isPageTransitioning,
    requestPageChange,
  } = useMenu1State();

  // ==================== FILTERING ====================
  const filteredData = useMemo(() => {
    if (!submissionsData?.results) return [];
    return filterData(submissionsData.results, filters);
  }, [submissionsData?.results, filters]);

  // ==================== PAGINATION ====================
  const totalPages = Math.ceil(filteredData.length / ITEMS_PER_PAGE);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    return filteredData.slice(startIndex, endIndex);
  }, [filteredData, currentPage]);

  // ==================== MODAL STATE ====================
  const [selectedSubmission, setSelectedSubmission] = useState<RequestSubmission | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [pendingAssigneeUpdate, setPendingAssigneeUpdate] = useState<{ id: number; assignee: string } | null>(null);
  const [comment, setComment] = useState("");

  // ==================== HANDLERS ====================
  const handleRowClick = (submission: RequestSubmission) => {
    setSelectedSubmission(submission);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedSubmission(null);
  };

  const handleAssigneeChange = (id: number, assignee: string) => {
    setPendingAssigneeUpdate({ id, assignee });
    setIsCommentModalOpen(true);
  };

  const handleCommentSubmit = () => {
    if (!pendingAssigneeUpdate) return;
    updateAssigneeMutation.mutate(
      {
        id: pendingAssigneeUpdate.id,
        assignee: pendingAssigneeUpdate.assignee,
        comment: comment.trim() || undefined,
      },
      {
        onSuccess: () => {
          setIsCommentModalOpen(false);
          setPendingAssigneeUpdate(null);
          setComment("");
        },
      }
    );
  };

  const handleCommentModalClose = () => {
    setIsCommentModalOpen(false);
    setPendingAssigneeUpdate(null);
    setComment("");
  };

  const handleDownloadCSV = () => {
    downloadCSV(filteredData);
  };

  const handlePageChange = (nextPage: number) => {
    requestPageChange(nextPage, totalPages);
  };

  // ==================== RENDER ====================
  return (
    <main className="max-w-[90%] mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4">
        <FilterControls
          searchInput={searchInput}
          onSearchInputChange={setSearchInput}
          onSearchApply={applySearchTerm}
          dateFilter={filters.dateFilter}
          onDateFilterChange={(dateFilter) => setFilters((prev) => ({ ...prev, dateFilter }))}
          onDownloadCSV={handleDownloadCSV}
          isDownloadDisabled={!filteredData.length}
          isBusy={isLoading || isPageTransitioning}
          pagination={
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
              totalItems={filteredData.length}
              pageSize={ITEMS_PER_PAGE}
              disabled={isLoading || isPageTransitioning}
            />
          }
        />

        <RequestTable
          paginatedData={paginatedData}
          allData={submissionsData?.results}
          empInfoData={empInfoData}
          isLoading={isLoading}
          isPageTransitioning={isPageTransitioning}
          columnFilters={filters.columnFilters}
          onColumnFilter={handleColumnFilter}
          onRowClick={handleRowClick}
          onAssigneeChange={handleAssigneeChange}
        />

        <DetailedInfoModal isOpen={isModalOpen} onClose={closeModal} submission={selectedSubmission} />

        <CommentModal
          isOpen={isCommentModalOpen}
          onClose={handleCommentModalClose}
          comment={comment}
          onCommentChange={setComment}
          onSubmit={handleCommentSubmit}
          isPending={updateAssigneeMutation.isPending}
          mode="assign"
          assigneeName={pendingAssigneeUpdate?.assignee}
        />
      </div>
    </main>
  );
}
