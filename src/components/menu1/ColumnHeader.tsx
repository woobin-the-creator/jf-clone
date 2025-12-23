// ColumnHeader Component
export interface ColumnFilter {
  column: string;
  values: string[];
  sortOrder?: "asc" | "desc";
}

interface ColumnHeaderProps {
  column: string;
  title: string;
  data: string[];
  onFilterChange: (column: string, values: string[], sortOrder?: "asc" | "desc") => void;
  currentFilter?: ColumnFilter;
}

export default function ColumnHeader({
  column,
  title,
  data,
  onFilterChange,
  currentFilter,
}: ColumnHeaderProps) {
  return (
    <div>
      {/* TODO: Implement ColumnHeader */}
      {title}
    </div>
  );
}
