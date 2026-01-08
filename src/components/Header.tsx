import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, Lock, UserRoundCheck, Settings, ChevronDown, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";

interface MenuItem {
  name: string;
  path: string;
  external?: boolean;
}

const MENU_ITEMS: MenuItem[] = [
  { name: "변경 의뢰 리스트", path: "/menu1" },
  { name: "변경 의뢰 상신", path: "/menu2" },
  { name: "VOC", path: "https://voc.example.com", external: true },
];

const SETTINGS_MENU_ITEMS = [
  { name: "의뢰 양식 설정", path: "/settings/request-forms" },
  { name: "결재 경로 설정", path: "/settings/approval-paths" },
  { name: "권한 설정", path: "/settings/permissions" },
  { name: "DB 수정", path: "/settings/database-edit" },
];

export function Header() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const [isSettingsHovered, setIsSettingsHovered] = useState(false);

  const isActive = (path: string) => location === path;
  const canAccessSettings = user?.auth === "MANAGER";
  const isSettingsActive = location.startsWith("/settings");

  return (
    <header className="bg-white shadow-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <div className="w-8 h-8 rounded-lg overflow-hidden">
                  <img
                    src="/jfpage-32x32.png"
                    alt="JobFile Page 로고"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="ml-2 text-xl font-semibold text-gray-900">
                JOB FILE 변경점
                </span>
              </div>
            </Link>

            {/* Navigation Menu */}
            <nav className="flex space-x-1">
              {MENU_ITEMS.map((item) => (
                item.external ? (
                  <a
                    key={item.name}
                    href={item.path}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${item.name} - 새 탭에서 열림`}
                    className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-primary hover:bg-primary/5 transition-colors inline-flex items-center gap-1"
                  >
                    {item.name}
                    <ExternalLink className="h-3 w-3" aria-hidden="true" />
                  </a>
                ) : (
                  <Link key={item.name} href={item.path}>
                    <div
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${
                        isActive(item.path)
                          ? "bg-primary/10 text-primary"
                          : "text-gray-700 hover:text-primary hover:bg-primary/5"
                      }`}
                    >
                      {item.name}
                    </div>
                  </Link>
                )
              ))}

              {/* Settings Dropdown */}
              {canAccessSettings ? (
                <div
                  className="relative"
                  onMouseEnter={() => setIsSettingsHovered(true)}
                  onMouseLeave={() => setIsSettingsHovered(false)}
                >
                  <div
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer flex items-center ${
                      isSettingsActive
                        ? "bg-primary/10 text-primary"
                        : "text-gray-700 hover:text-primary hover:bg-primary/5"
                    }`}
                  >
                    <Settings className="mr-1 h-4 w-4" />
                    설정
                    <ChevronDown className="ml-1 h-3 w-3" />
                  </div>

                  {isSettingsHovered && (
                    <div className="absolute top-full left-0 mt-1 w-52 bg-white rounded-md shadow-lg border border-gray-200 py-2 z-50">
                      {SETTINGS_MENU_ITEMS.map((item) => (
                        <Link key={item.name} href={item.path}>
                          <div className="px-6 py-3 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                            {item.name}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  {/* Extended hover area */}
                  <div className="absolute -top-2 -bottom-2 -left-4 -right-4 pointer-events-none" />
                  {isSettingsHovered && (
                    <div className="absolute top-full left-0 w-52 h-2 bg-transparent" />
                  )}
                </div>
              ) : (
                <div className="px-3 py-2 rounded-md text-sm font-medium text-gray-400 cursor-not-allowed flex items-center">
                  <Settings className="mr-1 h-4 w-4" />
                  설정
                  <Lock className="ml-1 h-3 w-3" />
                </div>
              )}
            </nav>
          </div>

          {/* User Info and Actions */}
          <div className="flex items-center space-x-4">
            {/* User Role Badge */}
            <div className="flex items-center">
              <Badge variant="secondary" className="flex items-center">
                <UserRoundCheck className="mr-1 h-3 w-3" />
                {user?.auth}
              </Badge>
            </div>

            {/* User Greeting */}
            <div className="flex items-center space-x-2">
              <div className="text-sm text-gray-700">
                <span className="font-medium">{user?.username}</span>님 안녕하세요!
              </div>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10">
                  <UserRoundCheck className="h-4 w-4 text-primary" />
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Logout Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={logout}
              className="text-gray-500 hover:text-gray-700"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
