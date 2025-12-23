// DetailedInfoModal Component
import type { RequestSubmission } from "@/types/menu1.types";

interface DetailedInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  submission: RequestSubmission | null;
}

export default function DetailedInfoModal({
  isOpen,
  onClose,
  submission,
}: DetailedInfoModalProps) {
  return (
    <div>
      {/* TODO: Implement DetailedInfoModal */}
    </div>
  );
}
