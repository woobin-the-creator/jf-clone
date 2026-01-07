import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronDown,
  ChevronUp,
  LucideIcon,
  CheckCircle,
  Clock,
  Pause,
  Users,
  Search,
} from "lucide-react";
import { RequestSubmission } from "@shared/schema";
import { formatDate } from "./DashboardUtils";
import { motion, AnimatePresence } from "framer-motion";

// Status 설정 (그대로 사용해도 됨)
export const statusConfig = [
  {
    key: "내부결재대기중",
    label: "내부결재대기중",
    icon: Clock,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50/80",
    borderColor: "border-yellow-200/30",
  },
  {
    key: "JOB 검토,배정 대기",
    label: "JOB 검토,배정 대기",
    icon: Users,
    color: "text-blue-600",
    bgColor: "bg-blue-50/80",
    borderColor: "border-blue-200/30",
  },
  {
    key: "JOB 수정 대기",
    label: "JOB 수정 대기",
    icon: Search,
    color: "text-blue-600",
    bgColor: "bg-blue-50/80",
    borderColor: "border-blue-200/30",
  },
  {
    key: "작성완료",
    label: "작성완료",
    icon: CheckCircle,
    color: "text-green-600",
    bgColor: "bg-green-50/80",
    borderColor: "border-green-200/30",
  },
  {
    key: "반려",
    label: "반려",
    icon: Pause,
    color: "text-gray-600",
    bgColor: "bg-gray-50/80",
    borderColor: "border-gray-200/30",
  },
];

// Apple Launchpad 느낌의 Grid 레이아웃
export function StatusGrid({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="
        grid
        grid-cols-[repeat(auto-fit,minmax(220px,1fr))]
        gap-6
        w-full
        mt-4
      "
    >
      {children}
    </div>
  );
}

interface StatusCardProps {
  config: {
    key: string;
    label: string;
    icon: LucideIcon;
    color: string;
    bgColor: string;
    borderColor: string;
  };
  count: number;
  isLoading: boolean;
  isExpanded: boolean;
  filteredSubmissions: RequestSubmission[];
  onClick: () => void;
}

export default function StatusCard({
  config,
  count,
  isLoading,
  isExpanded,
  filteredSubmissions,
  onClick,
}: StatusCardProps) {
  const Icon = config.icon;
  const ChevronIcon = isExpanded ? ChevronUp : ChevronDown;

  return (
    <motion.div
      layout
      transition={{
        layout: { type: "spring", stiffness: 170, damping: 22 },
      }}
      className="flex flex-col gap-4"
    >
      {/* 메인 카드 */}
      <motion.div
        layout
        onClick={onClick}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.98 }}
        transition={{
          type: "spring",
          stiffness: 300,
          damping: 20,
        }}
      >
        <Card
          className={`
            cursor-pointer rounded-2xl
            backdrop-blur-xl bg-white/40
            border border-white/20
            shadow-[0_4px_18px_rgba(0,0,0,0.08)]
            transition-all duration-300
            hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)]
            ${isExpanded ? "ring-2 ring-indigo-300/60" : ""}
            ${config.bgColor} ${config.borderColor}
          `}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-sm font-semibold text-gray-800 tracking-tight">
              {config.label}
            </CardTitle>

            <div className="flex items-center gap-1">
              <Icon className={`h-4 w-4 ${config.color}`} />
              <ChevronIcon className="h-3 w-3 text-gray-500" />
            </div>
          </CardHeader>

          <CardContent className="pb-4">
            {isLoading ? (
              <Skeleton className="h-6 w-12 rounded-md bg-white/60" />
            ) : (
              <motion.div
                key={count}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25 }}
                className="text-2xl font-semibold text-gray-900 tracking-tight"
              >
                {count}
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* 펼쳐지는 리스트 카드 (Expand 영역) */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            layout
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 25,
            }}
            style={{ width: "140%" }}       // 폭 확장
            className="self-center"
          >
            <Card
              className="
                rounded-2xl
                backdrop-blur-xl bg-white/60
                border border-white/20
                shadow-inner
              "
            >
              <CardContent className="pt-6">
                {isLoading ? (
                  <div className="space-y-3">
                    <Skeleton className="h-4 w-full bg-white/60" />
                    <Skeleton className="h-4 w-full bg-white/60" />
                    <Skeleton className="h-4 w-full bg-white/60" />
                  </div>
                ) : (
                  <motion.div layout className="space-y-3">

                    {filteredSubmissions.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4 tracking-wide">
                        해당하는 의뢰가 없습니다
                      </p>
                    ) : (
                      filteredSubmissions.map((submission) => (
                        <motion.div
                          key={submission.id}
                          layout
                          whileHover={{
                            scale: 1.02,
                            backgroundColor: "rgba(255,255,255,0.9)",
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 280,
                            damping: 20,
                          }}
                          className="
                            p-3 rounded-xl
                            bg-white/70
                            shadow-sm
                            transition-all cursor-pointer
                          "

                          // 👉 여기 클릭 기능 추가됨
                          onClick={() => {
                            const encoded = encodeURIComponent(submission.title);
                            window.location.href = `/menu1?search=${encoded}`;
                          }}
                        >
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            {submission.title}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatDate(submission.created_at)}
                          </p>
                        </motion.div>
                      ))
                    )}

                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
