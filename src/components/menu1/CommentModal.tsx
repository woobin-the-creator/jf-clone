// CommentModal Component
interface CommentModalProps {
  isOpen: boolean;
  onClose: () => void;
  comment: string;
  onCommentChange: (comment: string) => void;
  onSubmit: () => void;
  isPending: boolean;
  mode: string;
  assigneeName?: string;
}

export default function CommentModal({
  isOpen,
  onClose,
  comment,
  onCommentChange,
  onSubmit,
  isPending,
  mode,
  assigneeName,
}: CommentModalProps) {
  return (
    <div>
      {/* TODO: Implement CommentModal */}
    </div>
  );
}
